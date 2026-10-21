import { currentAdmin, json, readJson } from "@/lib/session";
import { setStatus } from "@/lib/site-db";
import { STATUSES, type EditableKind } from "@/lib/types";

const isEditable = (kind: string): kind is EditableKind => kind === "bookings" || kind === "callbacks";

/** Palitan ang status ng booking o call-back. */
export async function PATCH(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  if (!(await currentAdmin())) return json({ error: "Please sign in." }, 401);
  const { kind, id } = await params;
  if (!isEditable(kind) || !/^\d+$/.test(id)) return json({ error: "Not found." }, 404);
  const body = await readJson(request);
  const allowed: readonly string[] = STATUSES[kind];
  if (typeof body.status !== "string" || !allowed.includes(body.status)) return json({ error: "Unknown status." }, 400);
  if (!setStatus(kind, Number(id), body.status)) return json({ error: "Not found." }, 404);
  return json({ ok: true });
}
