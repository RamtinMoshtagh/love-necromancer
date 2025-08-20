import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Server Action: write directly to DB (no fetch, no ports)
  async function createRelationship(formData: FormData) {
    'use server';

    const supabase = await createServerSupabase(); // new server-scoped client
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const display_name = String(formData.get('name') || '').trim();
    if (!display_name) throw new Error('Missing name');

    const timezone =
      (Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';

    const { error } = await supabase
      .from('relationships')
      .insert({ user_id: user.id, display_name, timezone });

    if (error) throw new Error(error.message);

    redirect('/upload');
  }

  return (
    <main className="max-w-xl mx-auto py-12 space-y-6">
      <h1 className="text-3xl font-semibold">Who are you summoning?</h1>
      <form action={createRelationship} className="space-y-4">
        <label htmlFor="name" className="text-sm">Name</label>
        <input
          id="name"
          name="name"
          required
          className="w-full rounded-xl border px-3 py-2 bg-transparent"
        />
        <button className="rounded-xl border px-4 py-2">Continue</button>
      </form>
    </main>
  );
}
