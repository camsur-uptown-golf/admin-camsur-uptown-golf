import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, SESSION_HOURS, adminFromSession } from "./auth.ts";
import type { Admin } from "./types.ts";

/** Ang naka-login na admin ngayon, o `null`. */
export async function currentAdmin(): Promise<Admin | null> {
  const store = await cookies();
  return adminFromSession(store.get(SESSION_COOKIE)?.value);
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/* HTTPS (Vercel): Secure ang cookie. Sa http://127.0.0.1:4000 hindi, dahil
   hindi ito ibabalik ng browser sa http. */
async function overHttps(): Promise<boolean> {
  const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0]?.trim();
  return proto === "https" || process.env.VERCEL === "1";
}

export async function setSessionCookie(token: string): Promise<void> {
  const secure = await overHttps();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: await overHttps(), sameSite: "strict", path: "/", maxAge: 0 });
}

/* ---------- Para sa mga route handler ---------- */

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * JSON lang: hindi makakapagpadala nito ang isang karaniwang <form> mula sa
 * ibang site, kaya dagdag na harang ito sa CSRF bukod sa SameSite.
 */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return {};
  const raw = await request.text();
  if (raw.length > 10_000) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const text = (body: Record<string, unknown>, key: string, max: number) =>
  typeof body[key] === "string" ? body[key].trim().slice(0, max) : "";
