import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, looksLikeSessionToken } from "@/lib/session-cookie";

/**
 * Bantay sa harap ng buong admin (lokal man o sa Vercel):
 *   - ang POST/PATCH ay dapat galing sa pahinang ito mismo (pangontra sa CSRF);
 *   - walang session cookie → /login (pahina) o 401 (API).
 *
 * Mabilis na tingin lang ito sa cookie, walang database. Ang tunay na pagsuri
 * ng session ay nasa (dashboard)/layout.tsx at sa bawat API route
 * (`currentAdmin()`).
 */

/* Bukas kahit hindi naka-login: ang pag-login mismo at ang unang setup. */
const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/setup", "/api/logout"]);

/* Ang sariling origin ng request. Sa Vercel, nasa x-forwarded-* ang totoong
   https at host; lokal, ang host header (localhost o 127.0.0.1). */
function ownOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || request.nextUrl.protocol.replace(/:$/, "");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host;
  return `${proto}://${host}`;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  /* Ang mga larawan sa public/ ay kinukuha rin ng image optimizer sa loob ng
     server, walang cookie — kapag hinarang ay sira ang logo ("isn't a valid
     image … received null"). Hindi sapat ang `matcher` sa ibaba para dito,
     kaya dito na rin sinusuri. */
  if (/\.(?:png|jpe?g|webp|svg|ico)$/i.test(pathname)) return NextResponse.next();

  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (!origin || origin !== ownOrigin(request)) {
      return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
    }
  }

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/__nextjs")) return NextResponse.next();

  if (!looksLikeSessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  /* Hindi kasama ang mga public na larawan: kailangan ng image optimizer na kunin ang mga ito. */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg)$).*)"],
};
