import { deleteSession } from "@/lib/auth";
import { clearSessionCookie, json, sessionToken } from "@/lib/session";

export async function POST() {
  deleteSession(await sessionToken());
  await clearSessionCookie();
  return json({ ok: true });
}
