import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { decryptBuffer } from "@/lib/crypto";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function chunkText(txt: string, max = 900) {
  const paras = txt.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > max) {
      if (buf) chunks.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks;
}

export async function POST(req: NextRequest) {
  // Require internal secret so only our server can call this
  const secret = req.headers.get("x-internal-index");
  if (!secret || secret !== process.env.INTERNAL_INDEX_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const { artifact_id } = await req.json().catch(() => ({}));
  if (!artifact_id) return NextResponse.json({ error: "missing artifact_id" }, { status: 400 });

  // Load artifact using service role
  const { data: art, error: aerr } = await admin
    .from("artifacts")
    .select("id, user_id, relationship_id, storage_path, original_mime")
    .eq("id", artifact_id)
    .single();
  if (aerr) return NextResponse.json({ error: aerr.message }, { status: 400 });

  // Only index text-ish artifacts
  const isTextish =
    (art.original_mime || "").startsWith("text/") ||
    ["application/json", "application/markdown", "application/xml", "application/x-yaml", "application/yaml"].includes(art.original_mime || "");
  if (!isTextish) {
    return NextResponse.json({ ok: true, skipped: true, reason: "non-text mime" });
  }

  // Download encrypted blob
  const { data: file, error: derr } = await admin.storage.from("artifacts").download(art.storage_path);
  if (derr) return NextResponse.json({ error: derr.message }, { status: 400 });

  // Decrypt -> text
  const decrypted = decryptBuffer(Buffer.from(await file.arrayBuffer()));
  const text = new TextDecoder().decode(decrypted).trim();
  if (!text) return NextResponse.json({ ok: true, chunks: 0 });

  // Chunk
  const chunks = chunkText(text);

  // Embed
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });

  // Remove any prior chunks for this artifact
  await admin.from("mem_chunks").delete().eq("artifact_id", art.id);

  // Insert new chunks
  const rows = chunks.map((content, i) => ({
    user_id: art.user_id,                    // set owner (we have service role)
    relationship_id: art.relationship_id,
    artifact_id: art.id,
    content,
    n_tokens: Math.ceil(content.length / 4),
    embedding: emb.data[i].embedding as unknown as number[],
  }));

  const { error: ierr } = await admin.from("mem_chunks").insert(rows);
  if (ierr) return NextResponse.json({ error: ierr.message }, { status: 400 });

  return NextResponse.json({ ok: true, chunks: rows.length });
}
