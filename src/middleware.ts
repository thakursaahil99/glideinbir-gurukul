import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/core/auth/session";

/**
 * Fast gate on the edge: signed-in for the app, admin role for /admin.
 * Layouts re-check against the user store (blocks, role changes).
 */
export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname, search } = req.nextUrl;
  const needsAdmin = pathname.startsWith("/admin");

  if (!session || (needsAdmin && session.role !== "admin")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/courses/:path*",
    "/tests/:path*",
    "/notes/:path*",
    "/doubts/:path*",
    "/mentorship/:path*",
    "/code/:path*",
    "/jobs/:path*",
    "/wallet/:path*",
    "/notifications/:path*",
    "/profile/:path*",
  ],
};
