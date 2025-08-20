import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { createActionSupabase, createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Love Necromancer",
  description: "Resurrect a dead relationship for one night only.",
};

async function Header() {
  const supabase = await createServerSupabase(); // ✅ read-only in RSC
  const { data: { session} } = await supabase.auth.getSession();

  async function signOut() {
    "use server";
    const supabase = await createActionSupabase(); // ✅ write cookies in action
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <header className="border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            ✦ Love Necromancer
          </Link>

          <nav className="hidden md:flex items-center gap-4 text-sm opacity-80">
            <Link href="/upload">Upload</Link>
            <Link href="/library">Library</Link>
            <Link href="/persona">Persona</Link>
            <Link href="/ritual">Ritual</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <form action={signOut}>
              <button className="rounded-xl border px-3 py-1 text-sm hover:bg-white/5">
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border px-3 py-1 text-sm hover:bg-white/5"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-black text-white antialiased">
        <Header />
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
