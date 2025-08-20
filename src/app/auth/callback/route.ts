import { NextResponse, type NextRequest } from "next/server";
import { createActionSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createActionSupabase();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/onboarding";

  if (!code) {
    return NextResponse.redirect(new URL("/login?m=missing_code", req.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?m=${encodeURIComponent(error.message)}`, req.url)
    );
  }

  // success: cookies set by supabase client, redirect to next
  return NextResponse.redirect(new URL(next, req.url));
}
