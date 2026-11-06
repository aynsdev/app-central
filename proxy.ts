import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only. Real authorization happens in lib/auth.ts on every page and action.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("ac_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the public API, auth pages and static assets.
  matcher: ["/((?!api/|login|setup|_next/|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
