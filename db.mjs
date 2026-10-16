import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Binabasa ng admin ang MISMONG mga SQLite file ng site (`data/` ng
 * camsuruptowngolf), kaya lumalabas agad dito ang bawat pasa ng form — walang
 * sync, walang kopya.
 *
 * Hiwalay na folder ang admin, kaya ipinapalagay na magkatabi ang dalawa:
 *
 *   Documents/
 *     camsuruptowngolf/        ← ang site (dito ang data/)
 *     admin-camsuruptowngolf/  ← ito
 *
 * Kung nasa ibang lugar ang site:  SITE_DATA_DIR=/path/sa/site/data npm start
 *
 * Hindi ginagawa rito ang mga talahanayan ng site: ang site (src/lib) ang may-ari
 * ng schema. Kapag wala pang file o talahanayan (wala pang nagpapasa ng form),
 * walang laman ang listahan sa halip na mag-error.
 */

export const ADMIN_DIR = path.dirname(fileURLToPath(import.meta.url));
export const SITE_DATA_DIR = path.resolve(
  process.env.SITE_DATA_DIR || path.join(ADMIN_DIR, "..", "camsuruptowngolf", "data"),
);

const INQUIRIES_FILE = path.join(SITE_DATA_DIR, "camsuruptown.sqlite");
const MEMBERS_FILE = path.join(SITE_DATA_DIR, "members.sqlite");

/** Mga status na maaaring itakda ng admin, ayon sa uri. */
export const STATUSES = {
  bookings: ["new", "contacted", "confirmed", "closed"],
  callbacks: ["new", "contacted", "closed"],
};

const TABLES = { bookings: "availability_requests", callbacks: "callback_requests" };

const connections = new Map();

/* Binubuksan lang kapag umiiral na ang file — kung hindi, gagawa ang
   DatabaseSync ng bakanteng file na walang schema. Hindi kina-cache ang
   "wala", kaya lumalabas ito sa susunod na refresh kapag nagawa na ng site. */
function open(file) {
  if (connections.has(file)) return connections.get(file);
  if (!existsSync(file)) return null;
  const connection = new DatabaseSync(file);
  /* Sabay na sumusulat ang site, kaya maghintay nang kaunti kapag naka-lock. */
  connection.exec("PRAGMA busy_timeout = 3000;");
  connections.set(file, connection);
  return connection;
}

function hasTable(connection, table) {
  return Boolean(connection.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

function all(file, table, sql) {
  const connection = open(file);
  if (!connection || !hasTable(connection, table)) return [];
  return connection.prepare(sql).all();
}

export function listBookings() {
  return all(
    INQUIRIES_FILE,
    "availability_requests",
    `SELECT * FROM availability_requests ORDER BY created_at DESC LIMIT 5000`,
  ).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    accommodationSlug: r.accommodation_slug,
    accommodationTitle: r.accommodation_title,
    preferredDate: r.preferred_date,
    guests: r.guests,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    mobile: r.mobile,
    message: r.message,
    status: r.status,
  }));
}

export function listCallbacks() {
  return all(
    INQUIRIES_FILE,
    "callback_requests",
    `SELECT * FROM callback_requests ORDER BY created_at DESC LIMIT 5000`,
  ).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    mobile: r.mobile,
    postalCode: r.postal_code,
    interest: r.interest,
    guests: r.guests,
    timeframe: r.timeframe,
    callWindows: r.call_windows,
    question: r.question,
    context: r.context,
    status: r.status,
  }));
}

export function listSubscribers() {
  return all(
    INQUIRIES_FILE,
    "subscribers",
    `SELECT id, created_at, email, consented FROM subscribers ORDER BY created_at DESC LIMIT 20000`,
  ).map((r) => ({ id: r.id, createdAt: r.created_at, email: r.email, consented: Boolean(r.consented) }));
}

/** Walang password hash — hindi kailanman lumalabas iyon sa admin. */
export function listMembers() {
  return all(
    MEMBERS_FILE,
    "members",
    `SELECT id, email, first_name, last_name, mobile, created_at, last_login_at
       FROM members ORDER BY created_at DESC LIMIT 20000`,
  ).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    email: r.email,
    firstName: r.first_name,
    lastName: r.last_name,
    mobile: r.mobile,
    lastLoginAt: r.last_login_at,
  }));
}

/** `true` kapag may nabago. Ang `kind` at `status` ay sinuri na ng tumawag. */
export function setStatus(kind, id, status) {
  const connection = open(INQUIRIES_FILE);
  if (!connection || !hasTable(connection, TABLES[kind])) return false;
  /* Galing sa nakapirming mapa ang pangalan ng talahanayan, hindi sa request. */
  const result = connection.prepare(`UPDATE ${TABLES[kind]} SET status = ? WHERE id = ?`).run(status, id);
  return Number(result.changes) > 0;
}
