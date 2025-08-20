import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { encryptBuffer } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { relationship_id, content } = await req.json();
  if (!relationship_id || !content) {
    return NextResponse.json({ error: 'missing relationship_id or content' }, { status: 400 });
  }

  const packed = encryptBuffer(Buffer.from(content, 'utf8'));

  const { data: art, error: insErr } = await supabase
    .from('artifacts')
    .insert({
      relationship_id,
      user_id: user.id,
      kind: 'text',
      storage_path: 'placeholder',
      size_bytes: packed.byteLength,
    })
    .select()
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  const path = `${user.id}/${relationship_id}/${art.id}.enc`;

  const { error: upErr } = await supabase.storage
    .from('artifacts')
    .upload(path, packed, { contentType: 'application/octet-stream' });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  await supabase.from('artifacts').update({ storage_path: path }).eq('id', art.id);

  return NextResponse.json({ artifact_id: art.id, path });
}
