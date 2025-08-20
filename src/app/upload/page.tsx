import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import UploadForm from "./UpLoadForm";

export default async function UploadPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: relationships = [], error } = await supabase
    .from("relationships")
    .select("id, display_name")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="max-w-2xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Upload memories</h1>
      <p className="opacity-80">
        Drop files or paste chat exports as plain text. Everything is encrypted before storage.
      </p>
      <UploadForm relationships={relationships as { id: string; display_name: string }[]} />
    </main>
  );
}
