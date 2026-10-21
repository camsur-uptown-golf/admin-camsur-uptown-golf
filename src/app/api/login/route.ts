import { authenticate, clearFailures, createSession, isLockedOut, recordFailure } from "@/lib/auth";
import { json, readJson, setSessionCookie, text } from "@/lib/session";

export async function POST(request: Request) {
  const body = await readJson(request);
  const username = text(body, "username", 40).toLowerCase();
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  if (!username || !password) return json({ error: "Enter your username and password." }, 400);
  const key = `user:${username}`;
  if (isLockedOut(key)) return json({ error: "Too many wrong attempts. Try again in 15 minutes." }, 429);
  const found = authenticate(username, password);
  if (!found) {
    recordFailure(key);
    return json({ error: "Wrong username or password." }, 401);
  }
  clearFailures(key);
  await setSessionCookie(createSession(found.id));
  return json({ admin: found });
}
