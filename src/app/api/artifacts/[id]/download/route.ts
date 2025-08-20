import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { decryptBuffer } from "@/lib/crypto";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // 👈 Next 15: params is a Promise
) {
  const { id } = await ctx.params; // 👈 await it
  const supabase = await createServerSupabase();

  // must be signed in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // fetch artifact owned by this user
  const { data: art, error } = await supabase
    .from("artifacts")
    .select("id, storage_path, original_mime, original_name, user_id")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!art || art.user_id !== user.id)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  // download encrypted blob from Storage
  const { data: file, error: dlErr } = await supabase
    .storage
    .from("artifacts")
    .download(art.storage_path);

  if (dlErr) return NextResponse.json({ error: dlErr.message }, { status: 400 });

  const encrypted = Buffer.from(await file.arrayBuffer());
  const decrypted = decryptBuffer(encrypted);

  const headers = new Headers();
  headers.set("Content-Type", art.original_mime || "application/octet-stream");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${(art.original_name || "download.bin").replace(/"/g, '')}"`
  );

  return new NextResponse(decrypted, { headers });
}
