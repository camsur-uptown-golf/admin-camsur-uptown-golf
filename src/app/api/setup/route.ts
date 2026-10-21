import { adminCount, createAdmin, createSession, passwordProblem } from "@/lib/auth";
import { json, readJson, setSessionCookie, text } from "@/lib/session";

/** Unang admin account — bukas lang habang wala pang kahit isang admin. */
export async function POST(request: Request) {
  if ((await adminCount()) > 0) return json({ error: "Setup is already done. Please sign in." }, 403);
  const body = await readJson(request);
  const name = text(body, "name", 80);
  const username = text(body, "username", 40).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!name) return json({ error: "Enter your name." }, 400);
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return json({ error: "Username: 3–40 letters, numbers, dots, dashes or underscores." }, 400);
  }
  const problem = passwordProblem(password);
  if (problem) return json({ error: problem }, 400);
  /* Muling sinusuri sa loob ng INSERT, kung sakaling may naunang sabay na setup. */
  const created = await createAdmin({ username, name, password }, { firstOnly: true });
  if (!created) return json({ error: "Setup is already done. Please sign in." }, 409);
  await setSessionCookie(await createSession(created.id));
  return json({ admin: created }, 201);
}
