import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * src/middleware.ts
 *
 * Strict session guard for /dashboard and /admin routes.
 * Uses the official @supabase/ssr helper to validate the real session,
 * not just cookie name presence. Unauthenticated requests get a 307
 * redirect to /auth/login?redirect=<original-path>.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard protected routes
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next({ request });

  // Build a Supabase SSR client that reads/writes cookies from the request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options as any);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl, { status: 307 });
  }

  return response;
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/admin", "/admin/:path*"],
};
