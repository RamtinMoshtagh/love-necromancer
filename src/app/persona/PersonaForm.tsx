"use client";

import * as React from "react";

type Rel = { id: string; display_name: string };
type Persona = {
  relationship_id: string;
  name: string;
  tone?: string;
  description?: string;
  boundaries?: string;
  topics_allow?: string[];
  topics_block?: string[];
  max_minutes?: number;
  farewell_style?: string;
  system_prompt?: string;
  language_code?: string;   // NEW
  tts_enabled?: boolean;    // NEW
};

const LANGS = [
  { code: "en", label: "English" },
  { code: "sv", label: "Svenska" },
  { code: "no", label: "Norsk" },
  { code: "da", label: "Dansk" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "tr", label: "Türkçe" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "fa", label: "فارسی" },
  { code: "hi", label: "हिन्दी" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
];

function langLabelFromCode(code?: string) {
  return LANGS.find((l) => l.code === code)?.label ?? "English";
}

function buildPrompt(p: Persona, relName: string) {
  const langLabel = langLabelFromCode(p.language_code || "en");
  return [
    `You are "${p.name}", a memory construct of ${relName}.`,
    `Always respond in ${langLabel} (${p.language_code || "en"}) regardless of the user's input language.`,
    `Tone: ${p.tone || "warm"}.`,
    p.description ? `Backstory: ${p.description}` : "",
    p.boundaries ? `Boundaries: ${p.boundaries}` : "",
    p.topics_allow?.length ? `Welcome topics: ${p.topics_allow.join(", ")}.` : "",
    p.topics_block?.length ? `Avoid topics: ${p.topics_block.join(", ")}.` : "",
    `Session limit: ${p.max_minutes || 60} minutes.`,
    `Close with a ${p.farewell_style || "gentle"} goodbye.`,
    `Never claim to be the real person. You are a caring simulation built from memories.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function PersonaForm({
  relationships,
  initialPersona,
}: {
  relationships: Rel[];
  initialPersona: Persona | null;
}) {
  const initialRel =
    initialPersona?.relationship_id || relationships[0]?.id || "";
  const [rel, setRel] = React.useState<string>(initialRel);

  const [name, setName] = React.useState(initialPersona?.name || "");
  const [tone, setTone] = React.useState(initialPersona?.tone || "warm");
  const [description, setDescription] = React.useState(
    initialPersona?.description || ""
  );
  const [boundaries, setBoundaries] = React.useState(
    initialPersona?.boundaries || ""
  );
  const [topicsAllow, setTopicsAllow] = React.useState(
    (initialPersona?.topics_allow || []).join(", ")
  );
  const [topicsBlock, setTopicsBlock] = React.useState(
    (initialPersona?.topics_block || []).join(", ")
  );
  const [maxMinutes, setMaxMinutes] = React.useState(
    initialPersona?.max_minutes || 60
  );
  const [farewell, setFarewell] = React.useState(
    initialPersona?.farewell_style || "gentle"
  );

  // NEW: language + TTS
  const [language, setLanguage] = React.useState<string>(
    initialPersona?.language_code || "en"
  );
  const [ttsEnabled, setTtsEnabled] = React.useState<boolean>(
    !!initialPersona?.tts_enabled
  );

  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const relName =
    relationships.find((r) => r.id === rel)?.display_name || "your partner";

  const systemPrompt = buildPrompt(
    {
      relationship_id: rel,
      name,
      tone,
      description,
      boundaries,
      topics_allow: topicsAllow
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      topics_block: topicsBlock
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      max_minutes: maxMinutes,
      farewell_style: farewell,
      language_code: language, // ensure preview reflects language choice
    },
    relName
  );

  async function savePersona(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const minutes = Math.min(Math.max(Number(maxMinutes || 60), 5), 240);

      const payload: Persona & {
        tts_enabled?: boolean;
      } = {
        relationship_id: rel,
        name,
        tone,
        description,
        boundaries,
        topics_allow: topicsAllow
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        topics_block: topicsBlock
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        max_minutes: minutes,
        farewell_style: farewell,
        system_prompt: systemPrompt,
        language_code: language, // NEW
        tts_enabled: ttsEnabled, // NEW
      };

      const res = await fetch("/api/persona", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save");
      setMsg("Saved.");
    } catch (err: any) {
      setMsg(err.message || "Failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={savePersona} className="space-y-5">
      <div>
        <label className="text-sm">Relationship</label>
        <select
          value={rel}
          onChange={(e) => setRel(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 bg-transparent"
        >
          {relationships.map((r) => (
            <option key={r.id} value={r.id}>
              {r.display_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Persona name (how they call you)</label>
          <input
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-sm">Tone</label>
          <input
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Language</label>
          <select
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            id="tts"
            type="checkbox"
            checked={ttsEnabled}
            onChange={(e) => setTtsEnabled(e.target.checked)}
          />
          <label htmlFor="tts" className="text-sm">
            Read replies aloud (browser TTS)
          </label>
        </div>
      </div>

      <div>
        <label className="text-sm">Description</label>
        <textarea
          rows={3}
          className="w-full rounded-xl border px-3 py-2 bg-transparent"
          placeholder="What were they like? Shared rituals, quirks, nicknames…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm">Boundaries</label>
        <textarea
          rows={2}
          className="w-full rounded-xl border px-3 py-2 bg-transparent"
          placeholder="Things we won’t discuss; safety lines."
          value={boundaries}
          onChange={(e) => setBoundaries(e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Welcome topics (comma-sep)</label>
          <input
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            value={topicsAllow}
            onChange={(e) => setTopicsAllow(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm">Avoid topics (comma-sep)</label>
          <input
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            value={topicsBlock}
            onChange={(e) => setTopicsBlock(e.target.value)}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Session minutes (5–240)</label>
          <input
            type="number"
            min={5}
            max={240}
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            value={maxMinutes}
            onChange={(e) => {
              const n = parseInt(e.target.value || "60", 10);
              setMaxMinutes(Number.isFinite(n) ? Math.min(Math.max(n, 5), 240) : 60);
            }}
          />
        </div>
        <div>
          <label className="text-sm">Farewell style</label>
          <input
            className="w-full rounded-xl border px-3 py-2 bg-transparent"
            value={farewell}
            onChange={(e) => setFarewell(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="text-sm">Preview system prompt</label>
        <pre className="whitespace-pre-wrap text-sm rounded-xl border p-3 opacity-90">
          {systemPrompt}
        </pre>
      </div>

      <button disabled={saving} className="rounded-xl border px-4 py-2">
        {saving ? "Saving…" : "Save persona"}
      </button>
      {msg && <p className="text-sm opacity-80">{msg}</p>}
    </form>
  );
}
