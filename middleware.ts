import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PROTECTED_PREFIXES = ['/onboarding', '/upload', '/persona', '/ritual', '/chat', '/farewell'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Adapt Next's cookie store to Supabase SSR without strict typing errors
  const cookiesAdapter = {
    get: (name: string) => req.cookies.get(name)?.value,
    set: (name: string, value: string, options: CookieOptions) =>
      res.cookies.set({ name, value, ...options }),
    remove: (name: string, options: CookieOptions) =>
      res.cookies.set({ name, value: '', ...options }),
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookiesAdapter as any } // <-- casting here avoids TS 2353
  );

  await supabase.auth.getSession();

  const isProtected = PROTECTED_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p));
  if (isProtected) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const url = new URL('/login', req.url);
      url.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)'],
};
