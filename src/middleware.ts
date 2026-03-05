import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Admin route protection is handled at the page and API level
  // (token is in localStorage, not cookies, so we can't check here)
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
