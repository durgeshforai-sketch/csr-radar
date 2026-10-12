import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, validSession } from "@/lib/auth";

// Every page needs the login. Cron and the signed email snapshot authenticate themselves.
export function proxy(req: NextRequest) {
  if (validSession(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return new NextResponse("unauthorised", { status: 401 });
  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api/cron|api/snapshot|login|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
