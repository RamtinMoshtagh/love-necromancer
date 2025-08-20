'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setErr(e.message ?? 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-2xl border">
        <h1 className="text-xl mb-2">Check your email</h1>
        <p>We sent you a magic link to sign in.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md mx-auto p-6 rounded-2xl border space-y-4">
      <h1 className="text-2xl font-semibold">Enter the circle</h1>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 bg-transparent"
          placeholder="you@example.com"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl px-4 py-2 border hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send magic link'}
      </button>
      {err && <p className="text-sm text-red-500">{err}</p>}
    </form>
  );
}
