import { auth } from "./auth";
import { NextResponse } from "next/server";
import { adminHome, canOpenAdminPath } from "./utilities/roles";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Protected routes requiring authentication (user or admin)
  const protectedRoutes = ["/jasenalue"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    if (!session) {
      return NextResponse.redirect(new URL(`/`, req.url));
    }
  }

  // The admin site: all of it for admins, their own sections for treasurers
  // (utilities/roles.ts). Anyone else goes back to the front page.
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL(`/`, req.url));
    }
    const roles = session.user.roles ?? [];
    if (!canOpenAdminPath(roles, pathname)) {
      return NextResponse.redirect(new URL(adminHome(roles) ?? "/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
  ],
};
