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

export function usingTurso(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

/**
 * Ang client ng isang store. Para sa datos ng site na lokal na file: `null`
 * kapag wala pa ang file — hindi ito ginagawa rito, dahil ang site ang
 * may-ari ng schema (walang laman ang listahan sa halip na mag-error).
 */
export function db(store: "admin"): Client;
export function db(store: SiteStore): Client | null;
export function db(store: Store): Client | null {
  const remote = process.env.TURSO_DATABASE_URL;
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
  const client = createClient(remote ? { url, authToken: process.env.TURSO_AUTH_TOKEN } : { url });
  /* Lokal: sabay na sumusulat ang site, kaya maghintay nang kaunti kapag naka-lock. */
  if (!remote) client.execute("PRAGMA busy_timeout = 3000").catch(() => {});
  clients.set(url, client);
  return client;
}
