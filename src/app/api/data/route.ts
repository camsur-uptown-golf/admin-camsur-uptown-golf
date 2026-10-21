import { currentAdmin, json } from "@/lib/session";
import { dashboardData } from "@/lib/site-db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await currentAdmin())) return json({ error: "Please sign in." }, 401);
  return json(await dashboardData());
}
