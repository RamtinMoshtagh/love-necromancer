import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import ChatClient from './ChatClient';

export default async function RitualPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const [{ data: relationships }, { data: active }] = await Promise.all([
    supabase.from('relationships').select('id, display_name').order('created_at', { ascending: false }),
    supabase.from('ritual_sessions')
      .select('id, relationship_id, started_at, ends_at, active')
      .eq('active', true).order('started_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  // ---------- fixes start here ----------
  async function startRitual(formData: FormData) {
    'use server';
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const relationship_id = String(formData.get('relationship_id') || '');

    const { data: persona } = await supabase
      .from('personas')
      .select('max_minutes')
      .eq('relationship_id', relationship_id)
      .maybeSingle();

    const minutes = Math.min(Math.max(Number(persona?.max_minutes ?? 60), 5), 240);

    // Close any existing sessions for THIS user
    await supabase
      .from('ritual_sessions')
      .update({ active: false })
      .eq('active', true)
      .eq('user_id', user.id);

    const ends_at = new Date(Date.now() + minutes * 60_000).toISOString();

    // IMPORTANT: include user_id to satisfy RLS "with check (user_id = auth.uid())"
    const { error } = await supabase.from('ritual_sessions').insert({
      user_id: user.id,
      relationship_id,
      ends_at,
      active: true,
    });

    if (error) throw new Error(error.message);
    redirect('/ritual');
  }

  async function endRitual() {
    'use server';
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    await supabase
      .from('ritual_sessions')
      .update({ active: false })
      .eq('active', true)
      .eq('user_id', user.id);

    redirect('/ritual');
  }
  // ---------- fixes end here ----------

  if (!relationships?.length) redirect('/onboarding');

  if (!active || !active.active || new Date(active.ends_at) < new Date()) {
    return (
      <main className="max-w-xl mx-auto py-10 space-y-6">
        <h1 className="text-3xl font-semibold">Begin the ritual</h1>
        <form action={startRitual} className="space-y-4">
          <div>
            <label className="text-sm">Relationship</label>
            <select name="relationship_id" className="w-full rounded-xl border px-3 py-2 bg-transparent">
              {relationships!.map((r) => (
                <option key={r.id} value={r.id}>{r.display_name}</option>
              ))}
            </select>
          </div>
          <button className="rounded-xl border px-4 py-2">Start session</button>
        </form>
      </main>
    );
  }

  const { data: persona } = await supabase
    .from('personas')
    .select('name, system_prompt, max_minutes')
    .eq('relationship_id', active.relationship_id)
    .single();

  const rel = relationships!.find(r => r.id === active.relationship_id);
  return (
    <main className="max-w-3xl mx-auto py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{rel?.display_name}</h1>
          <p className="opacity-70 text-sm">
            Session ends at {new Date(active.ends_at).toLocaleTimeString()}
          </p>
        </div>
        <form action={endRitual}>
          <button className="rounded-xl border px-3 py-2 text-sm">End now</button>
        </form>
      </div>

      <ChatClient
        sessionId={active.id}
        endsAtISO={active.ends_at}
        personaName={persona?.name || rel?.display_name || 'Beloved'}
      />
    </main>
  );
}
