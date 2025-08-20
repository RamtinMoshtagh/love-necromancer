"use client";

import * as React from "react";

type Rel = { id: string; display_name: string };

type Mode = "file" | "text";

export default function UploadForm({ relationships }: { relationships: Rel[] }) {
  const [relationshipId, setRelationshipId] = React.useState<string | undefined>(
    relationships[0]?.id
  );

  const [mode, setMode] = React.useState<Mode>("file");

  // file mode
  const [file, setFile] = React.useState<File | null>(null);
  const dropRef = React.useRef<HTMLLabelElement>(null);

  // text mode
  const [rawText, setRawText] = React.useState("");
  const [textName, setTextName] = React.useState("");

  // shared
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!relationshipId) return setMsg("Pick a relationship first.");

    // Build a File whether we're in file-mode or text-mode
    let toSend: File | null = file;

    if (mode === "text") {
      const trimmed = rawText.trim();
      if (!trimmed) return setMsg("Paste some text first.");
      const name =
        (textName || "messages") +
        "-" +
        new Date().toISOString().slice(0, 10).replace(/-/g, "") +
        ".txt";
      toSend = new File([trimmed], name, { type: "text/plain" });
    } else {
      if (!file) return setMsg("Choose a file first.");
    }

    const form = new FormData();
    form.append("file", toSend!);
    form.append("relationship_id", relationshipId);

    setLoading(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Upload failed");

      setMsg("Saved, encrypted, and queued for indexing.");
      setFile(null);
      setRawText("");
      setTextName("");
    } catch (err: any) {
      setMsg(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  const textChars = rawText.length;
  const textLines = rawText ? rawText.split(/\r?\n/).length : 0;

  return (
    <form onSubmit={handleUpload} className="space-y-6">
      {/* Relationship */}
      <div>
        <label className="text-sm">Relationship</label>
        <select
          value={relationshipId}
          onChange={(e) => setRelationshipId(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 bg-transparent"
        >
          {relationships.map((r) => (
            <option key={r.id} value={r.id}>
              {r.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* Mode switch */}
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-3 py-1 rounded-xl border ${
            mode === "file" ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`px-3 py-1 rounded-xl border ${
            mode === "text" ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          Paste text
        </button>
      </div>

      {/* File card */}
      {mode === "file" && (
        <div className="space-y-3">
          <label
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="block rounded-2xl border border-dashed p-6 text-center cursor-pointer hover:bg-white/5"
          >
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              // accept some common text-y things but allow any; we encrypt anyway
              accept=".txt,.md,.json,.csv,.html,.xml,.yml,.yaml,.pdf,.doc,.docx,.rtf,.png,.jpg,.jpeg,.webp"
            />
            <div className="space-y-1">
              <div className="text-base">
                {file ? (
                  <span className="opacity-90">
                    Selected: <strong>{file.name}</strong> ({pretty(file.size)})
                  </span>
                ) : (
                  "Drag & drop a file here, or click to browse"
                )}
              </div>
              <div className="text-xs opacity-60">
                Tip: For chat exports, use <code>.txt</code> if possible.
              </div>
            </div>
          </label>
        </div>
      )}

      {/* Text card */}
      {mode === "text" && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="text-sm">Optional name</label>
              <input
                value={textName}
                onChange={(e) => setTextName(e.target.value)}
                placeholder="e.g. whatsapp-2021"
                className="w-full rounded-xl border px-3 py-2 bg-transparent"
              />
            </div>
            <div className="flex items-end justify-end text-xs opacity-70">
              {textLines} lines · {textChars} chars
            </div>
          </div>

          <div>
            <label className="text-sm">Paste text</label>
            <textarea
              rows={10}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 bg-transparent"
              placeholder={`Paste your messages here (copy from iMessage, WhatsApp export, Notes, etc).
Keep timestamps if you have them — the indexer will handle large blocks.`}
            />
            <p className="mt-2 text-xs opacity-60">
              We’ll encrypt this locally on the server before storing. Text uploads are auto-indexed for
              memory-aware chat.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button disabled={loading} className="rounded-xl border px-4 py-2">
          {loading ? "Uploading…" : "Encrypt & upload"}
        </button>
        {msg && <p className="text-sm opacity-80">{msg}</p>}
      </div>

      <div className="text-xs opacity-60">
        Accepted: anything. Text content (<code>.txt</code>, <code>.md</code>, <code>.json</code>, etc.) is
        automatically indexed so the persona can reference it during chat.
      </div>
    </form>
  );
}

function pretty(n?: number | null) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0,
    s = n;
  while (s >= 1024 && i < units.length - 1) {
    s /= 1024;
    i++;
  }
  return `${s.toFixed(1)} ${units[i]}`;
}
