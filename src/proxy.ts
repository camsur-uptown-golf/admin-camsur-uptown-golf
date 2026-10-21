import { NextResponse, type NextRequest } from "next/server";

/**
 * Bantay sa harap ng buong admin:
 *   - localhost lang ang tinatanggap na Host (pangontra sa DNS rebinding);
 *   - ang POST/PATCH ay dapat galing sa pahinang ito mismo (pangontra sa CSRF).
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.replace(/:\d+$/, "");
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return new NextResponse(`Open this dashboard at http://localhost:${host.split(":")[1] ?? "4000"}`, { status: 421 });
  }
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && request.method !== "HEAD" && origin && origin !== `http://${host}`) {
    return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  /* Hindi kasama ang mga public na larawan: kailangan ng image optimizer na kunin ang mga ito. */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg)$).*)"],
};
