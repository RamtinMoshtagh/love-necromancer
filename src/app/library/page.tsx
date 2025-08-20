import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";

export default async function LibraryPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: rows, error } = await supabase
    .from("artifacts")
    .select("id, created_at, size_bytes, original_name, original_mime, relationship_id")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <main className="max-w-4xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">Your artifacts</h1>
      {!rows?.length ? (
        <p>No artifacts yet. <Link className="underline" href="/upload">Upload one →</Link></p>
      ) : (
        <ul className="divide-y divide-white/10">
          {rows.map((a) => (
            <li key={a.id} className="py-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">{a.original_name || a.id}</div>
                <div className="text-sm opacity-70">
                  {a.original_mime || "application/octet-stream"} · {pretty(a.size_bytes)} ·{" "}
                  {new Date(a.created_at!).toLocaleString()}
                </div>
              </div>
              <a
                className="rounded-xl border px-3 py-1 text-sm hover:bg-white/5"
                href={`/api/artifacts/${a.id}/download`}
              >
                Download (decrypted)
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function pretty(n?: number | null) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, s = n;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(1)} ${units[i]}`;
}
