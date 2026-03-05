import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /admin routes
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("bs_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Further email check happens inside the page/API
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
