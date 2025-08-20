import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const body = await req.json().catch(() => ({}));
  const { session_id, messages } = body || {};

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!session_id || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  // Session gate
  const { data: session, error: sessErr } = await supabase
    .from('ritual_sessions')
    .select('id, relationship_id, ends_at, active')
    .eq('id', session_id)
    .single();
  if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 400 });
  if (!session.active || new Date(session.ends_at) < new Date()) {
    return NextResponse.json({ error: 'session ended' }, { status: 403 });
  }

  // Persona
  const { data: persona, error: pErr } = await supabase
    .from('personas')
    .select('name, system_prompt, language_code')
    .eq('relationship_id', session.relationship_id)
    .single();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  // RAG: embed current user turn (or last 2 exchanges) and search memories
  const lastUser = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
  const queryText = lastUser.slice(-4000); // keep it short-ish
  let memories: { content: string; similarity: number }[] = [];

  if (queryText) {
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: queryText,
    });

    const qvec = emb.data[0].embedding as unknown as number[];

    const { data: matches, error: matchErr } = await supabase.rpc('match_mem_chunks', {
      rel_id: session.relationship_id,
      query_embedding: qvec,
      match_count: 6,
    });

    if (!matchErr && Array.isArray(matches)) {
      memories = matches.map((m: any) => ({ content: m.content, similarity: m.similarity }));
    }
  }

  const timeLeftMin = Math.max(0, Math.floor((new Date(session.ends_at).getTime() - Date.now()) / 60000));

  const memoryBlock = memories.length
    ? `\n\n# Memories (private context)\n${memories
        .map((m, i) => `- [m${i + 1}] ${m.content}`)
        .join('\n')}\n\nUse these to stay accurate, but do not say you are reading documents.`
    : '';

  const system = [
    persona?.system_prompt || `You are a caring simulation named ${persona?.name || 'Beloved'}.`,
    `The session ends in about ${timeLeftMin} minute(s).`,
    `Respect boundaries, never claim to be the real person.`,
    memoryBlock,
  ].join('\n');

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        stream: true,
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          ...messages.map((m: any) => ({ role: m.role, content: String(m.content || '') })),
        ],
      });

      for await (const chunk of completion) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) await writer.write(encoder.encode(delta));
      }
    } catch (err: any) {
      await writer.write(encoder.encode(`\n\n[stream error] ${err.message || 'failed'}`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
