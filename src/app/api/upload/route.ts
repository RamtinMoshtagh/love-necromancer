import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { encryptBuffer } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();

  // ---- auth ----
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ---- form-data ----
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const relationship_id = String(form.get("relationship_id") || "");
  if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });
  if (!relationship_id) return NextResponse.json({ error: "missing relationship_id" }, { status: 400 });

  const original_mime = file.type || "application/octet-stream";
  const original_name = file.name || "download.bin";

  // ---- encrypt ----
  const bytes = Buffer.from(await file.arrayBuffer());
  const packed = encryptBuffer(bytes);

  // ---- create DB row (placeholder path) ----
  const { data: art, error: insErr } = await supabase
    .from("artifacts")
    .insert({
      relationship_id,
      user_id: user.id,
      kind: "text", // keep for now; we’ll expand kinds later
      storage_path: "placeholder",
      size_bytes: packed.byteLength,
      original_mime,
      original_name,
    })
    .select()
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  // ---- upload encrypted blob ----
  const path = `${user.id}/${relationship_id}/${art.id}.enc`;
  const { error: upErr } = await supabase.storage
    .from("artifacts")
    .upload(path, packed, {
      contentType: "application/octet-stream",
      upsert: false,
    });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  // ---- persist final storage path ----
  const { error: updErr } = await supabase
    .from("artifacts")
    .update({ storage_path: path })
    .eq("id", art.id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  // ---- kick off indexing for text-like uploads (non-blocking) ----
  // Only index if it's plausibly text; skip images/audio/etc.
  const isTextish =
    original_mime.startsWith("text/") ||
    [
      "application/json",
      "application/markdown",
      "application/xml",
      "application/x-yaml",
      "application/yaml",
    ].includes(original_mime);

  if (isTextish) {
    const origin = new URL(req.url).origin; // e.g., http://localhost:3000 or prod domain
    // fire-and-forget; best-effort
    void fetch(`${origin}/api/index/index-artifact`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-index": process.env.INTERNAL_INDEX_SECRET!, },
      body: JSON.stringify({ artifact_id: art.id }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, artifact_id: art.id, path });
}
