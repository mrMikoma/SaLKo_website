import { auth } from "./auth";
import { NextResponse, type NextRequest } from "next/server";
import { adminHome, canOpenAdminPath } from "./utilities/roles";
import { isAdminSectionOn } from "./utilities/features";

// A visitor who isn't logged in goes to the login page, and from there on to
// the page they asked for (app/auth/kirjaudu)
const toLogin = (req: NextRequest) => {
  const url = new URL("/auth/kirjaudu", req.url);
  url.searchParams.set("paluu", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  // Server action calls (POSTs with a Next-Action header) go through: each
  // action checks the session itself and answers in words the page shows
  // ("Istuntosi on päättynyt…"), where a redirect would hand the call a login
  // page instead of an answer. Page loads with the header are still guarded.
  if (req.method === "POST" && req.headers.has("next-action")) {
    return NextResponse.next();
  }
  // A session the session callback refused (a deactivated user, or one from
  // before a password change) still arrives as a bare session without an id
  const session = req.auth?.user?.id ? req.auth : null;

  // Protected routes requiring authentication (user or admin)
  const protectedRoutes = ["/jasenalue"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    if (!session) {
      return toLogin(req);
    }
  }

  // The admin site: all of it for admins, their own sections for treasurers
  // (utilities/roles.ts). A member without either goes back to the front page.
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return toLogin(req);
    }
    const roles = session.user.roles ?? [];
    if (!canOpenAdminPath(roles, pathname)) {
      return NextResponse.redirect(new URL(adminHome(roles, isAdminSectionOn) ?? "/", req.url));
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
