import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/persona?relationship_id=...
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase();

  const { searchParams } = new URL(req.url);
  const relationship_id = searchParams.get("relationship_id");
  if (!relationship_id) {
    return NextResponse.json({ error: "missing relationship_id" }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("relationship_id", relationship_id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ persona: data ?? null });
}

// POST /api/persona
// Body: { relationship_id, name, tone?, description?, boundaries?, topics_allow?, topics_block?,
//         max_minutes?, farewell_style?, system_prompt?, language_code?, tts_enabled? }
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const body = await req.json().catch(() => ({}));

  const {
    relationship_id,
    name,
    tone,
    description,
    boundaries,
    topics_allow = [],
    topics_block = [],
    max_minutes = 60,
    farewell_style = "gentle",
    system_prompt,
    language_code = "en",
    tts_enabled = false,
  } = body || {};

  if (!relationship_id || !name) {
    return NextResponse.json(
      { error: "relationship_id and name are required" },
      { status: 400 }
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const minutes = Math.min(Math.max(Number(max_minutes ?? 60), 5), 240);

  const { data, error } = await supabase
    .from("personas")
    .upsert(
      {
        relationship_id,
        user_id: user.id,
        name,
        tone,
        description,
        boundaries,
        topics_allow,
        topics_block,
        max_minutes: minutes,
        farewell_style,
        system_prompt,
        language_code,
        tts_enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "relationship_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ persona: data });
}
