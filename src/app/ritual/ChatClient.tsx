'use client';

import * as React from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function ChatClient({
  sessionId,
  endsAtISO,
  personaName,
  ttsEnabled = false,
  langCode = 'en',
}: {
  sessionId: string;
  endsAtISO: string;
  personaName: string;
  ttsEnabled?: boolean;
  langCode?: string;
}) {
  const [messages, setMessages] = React.useState<Msg[]>([
    { role: 'assistant', content: `(${personaName} appears in a hush of light.) I'm here.` },
  ]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [ended, setEnded] = React.useState(false);

  // ⬇️ Avoid SSR/client mismatch by gating on mount
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const endsAt = React.useMemo(() => new Date(endsAtISO).getTime(), [endsAtISO]);
  const [left, setLeft] = React.useState<number>(0);

  React.useEffect(() => {
    if (!mounted) return;
    // compute immediately on client
    const compute = () =>
      setLeft(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));

    compute();
    const id = setInterval(() => {
      compute();
      if (Date.now() >= endsAt) setEnded(true);
    }, 1000);
    return () => clearInterval(id);
  }, [mounted, endsAt]);

  function speak(text: string) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = langCode;
      const v = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang?.toLowerCase().startsWith(langCode));
      if (v) u.voice = v;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || ended) return;

    const userMsg: Msg = { role: 'user', content: input.trim() };
    setMessages((m) => [...m, userMsg, { role: 'assistant', content: '' }]); // placeholder for stream
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, messages: [...messages, userMsg] }),
      });

      if (!res.body || !res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'chat failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: 'assistant', content: acc };
          return copy;
        });
      }

      if (ttsEnabled && acc.trim()) speak(acc.trim());
    } catch (err: any) {
      setMessages((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = { role: 'assistant', content: `(...connection faltered) ${err.message}` };
        return copy;
      });
    } finally {
      setSending(false);
    }
  }

  const mm = Math.floor(left / 60).toString().padStart(2, '0');
  const ss = Math.floor(left % 60).toString().padStart(2, '0');

  return (
    <section className="space-y-4">
      {/* suppressHydrationWarning avoids the 51 vs 52 SSR mismatch */}
      <div className="text-sm opacity-70" suppressHydrationWarning>
        Time left: {mounted ? `${mm}:${ss}` : '—:—'}
      </div>

      <div className="space-y-3 rounded-2xl border p-4 min-h-[300px]">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`inline-block px-3 py-2 rounded-xl ${m.role === 'user' ? 'bg-white/10' : 'bg-white/5'}`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending || ended}
          className="flex-1 rounded-xl border px-3 py-2 bg-transparent"
          placeholder={ended ? 'Session ended.' : 'Say something…'}
        />
        <button disabled={sending || ended} className="rounded-xl border px-4 py-2">
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </section>
  );
}
