import { createClient, type Client } from "@libsql/client";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Iisang database ng website, mobile app at admin.
 *
 *   - May TURSO_DATABASE_URL (Vercel, o lokal na naka-.env.local): lahat ng
 *     "store" ay nasa iisang Turso database — magkakaiba ang pangalan ng mga
 *     table, kaya walang nagbabanggaan.
 *   - Wala (offline sa computer na ito): ang dating mga lokal na file.
 *       admin                         → data/admin.sqlite ng folder na ito
 *       inquiries/members/reservations → SQLite ng site sa katabing folder
 *
 *   Documents/
 *     camsuruptowngolf/        ← ang site (dito ang data/)
 *     admin-camsuruptowngolf/  ← ito
 *
 * Kung nasa ibang lugar ang site:  SITE_DATA_DIR=/path/sa/site/data npm run dev
 *
 * Async ang lahat (libsql), kaya `await` ang bawat tawag.
 */
export type SiteStore = "inquiries" | "members" | "reservations";
export type Store = "admin" | SiteStore;

const SITE_FILES: Record<SiteStore, string> = {
  inquiries: "camsuruptown.sqlite",
  members: "members.sqlite",
  reservations: "reservations.sqlite",
};

const ADMIN_DATA_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
/* Nasa labas ng proyekto ang datos ng site, kaya hindi ito sinusundan ng bundler. */
export const SITE_DATA_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.SITE_DATA_DIR || path.join(process.cwd(), "..", "camsuruptowngolf", "data"),
);

/* Isang client bawat URL, nakaimbak sa globalThis para hindi dumami sa hot reload. */
const cache = globalThis as unknown as { __adminDbClients?: Map<string, Client> };
const clients = (cache.__adminDbClients ??= new Map());

/**
 * Ang TURSO_* na galing sa Vercel o sa .env.local, nilinis: madalas sumama sa
 * pag-paste ang espasyo o bagong linya sa dulo, ang mga quote, o ang mismong
 * "TURSO_AUTH_TOKEN=" — at sa alinman sa mga iyon ay tinatanggihan ng Turso
 * ang token ("Server returned HTTP status 400").
 */
function envValue(name: "TURSO_DATABASE_URL" | "TURSO_AUTH_TOKEN"): string | undefined {
  let value = process.env[name]?.trim();
  if (!value) return undefined;
  if (value.startsWith(`${name}=`)) value = value.slice(name.length + 1).trim();
  value = value.replace(/^(['"])(.*)\1$/, "$2").trim();
  return value || undefined;
}

/* Minsan lang, sa unang koneksyon: makikita sa Vercel Logs kung ano ang
   nabasa — host at haba lang, hindi ang token mismo. */
let described = false;
function describeTurso(url: string, token: string | undefined) {
  if (described) return;
  described = true;
  let host = "(hindi URL)";
  try {
    host = new URL(url).host;
  } catch {}
  const parts = token?.split(".").length ?? 0;
  console.info(
    `[db] Turso: host=${host}, token=${token ? `${token.length} chars, ${parts === 3 ? "mukhang JWT" : "HINDI mukhang JWT"}` : "WALA"}`,
  );
}

export function usingTurso(): boolean {
  return Boolean(envValue("TURSO_DATABASE_URL"));
}

/**
 * Ang client ng isang store. Para sa datos ng site na lokal na file: `null`
 * kapag wala pa ang file — hindi ito ginagawa rito, dahil ang site ang
 * may-ari ng schema (walang laman ang listahan sa halip na mag-error).
 */
export function db(store: "admin"): Client;
export function db(store: SiteStore): Client | null;
export function db(store: Store): Client | null {
  const remote = envValue("TURSO_DATABASE_URL");
  let url: string;
  if (remote) {
    url = remote;
  } else if (store === "admin") {
    mkdirSync(/*turbopackIgnore: true*/ ADMIN_DATA_DIR, { recursive: true });
    url = `file:${path.join(/*turbopackIgnore: true*/ ADMIN_DATA_DIR, "admin.sqlite")}`;
  } else {
    /* Lokal lang ang mga file na ito, kaya hindi isinasama sa build. */
    const file = path.join(/*turbopackIgnore: true*/ SITE_DATA_DIR, SITE_FILES[store]);
    if (!existsSync(/*turbopackIgnore: true*/ file)) return null;
    url = `file:${file}`;
  }
  const existing = clients.get(url);
  if (existing) return existing;
  const authToken = envValue("TURSO_AUTH_TOKEN");
  if (remote) describeTurso(url, authToken);
  const client = createClient(remote ? { url, authToken } : { url });
  /* Lokal: sabay na sumusulat ang site, kaya maghintay nang kaunti kapag naka-lock. */
  if (!remote) client.execute("PRAGMA busy_timeout = 3000").catch(() => {});
  clients.set(url, client);
  return client;
}
