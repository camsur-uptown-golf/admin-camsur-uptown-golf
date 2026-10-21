import { cookies } from "next/headers";
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

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
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
