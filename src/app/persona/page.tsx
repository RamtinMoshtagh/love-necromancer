import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import PersonaForm from "./PersonaForm";

export default async function PersonaPage() {
  const supabase = await createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: relationships = [] } = await supabase
    .from("relationships")
    .select("id, display_name")
    .order("created_at", { ascending: false });

  if (!relationships?.length) redirect("/onboarding");

  // Load existing persona (for the first relationship by default)
  const relId = relationships[0].id;
  const { data: existing } = await supabase
    .from("personas")
    .select("*")
    .eq("relationship_id", relId)
    .maybeSingle();

  return (
    <main className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">Persona</h1>
      <PersonaForm
        relationships={relationships as { id: string; display_name: string }[]}
        initialPersona={existing as any || null}
      />
    </main>
  );
}
