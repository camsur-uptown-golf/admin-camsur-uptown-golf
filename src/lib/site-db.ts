import type { Value } from "@libsql/client";
import { db, type SiteStore } from "./db.ts";
import type {
  Booking,
  BookingStatus,
  Callback,
  CallbackStatus,
  DashboardData,
  EditableKind,
  Member,
  Subscriber,
  TeeStatus,
  TeeTime,
} from "./types.ts";

/**
 * Binabasa ng admin ang MISMONG datos ng site (Turso, o ang mga SQLite file
 * sa `data/` ng camsuruptowngolf — tingnan ang db.ts), kaya lumalabas agad
 * dito ang bawat pasa ng form — walang sync, walang kopya.
 *
 * Ang site (src/lib) ang may-ari ng schema. Kapag wala pang file o talahanayan,
 * walang laman ang listahan sa halip na mag-error.
 */

export { SITE_DATA_DIR } from "./db.ts";

const TABLES: Record<EditableKind, string> = { bookings: "availability_requests", callbacks: "callback_requests" };

type Row = Record<string, Value>;

/* Ang talahanayang nakita na ay hindi na muling hinahanap (isang hintay na
   mas kaunti sa Turso); ang wala pa ay sinusuri ulit sa susunod. */
const tableCache = globalThis as unknown as { __siteTables?: Set<string> };
const knownTables = (tableCache.__siteTables ??= new Set());

async function hasTable(store: SiteStore, table: string): Promise<boolean> {
  const client = db(store);
  if (!client) return false;
  const key = `${store}:${table}`;
  if (knownTables.has(key)) return true;
  const result = await client.execute({ sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", args: [table] });
  if (result.rows.length > 0) knownTables.add(key);
  return result.rows.length > 0;
}

async function all(store: SiteStore, table: string, sql: string): Promise<Row[]> {
  const client = db(store);
  if (!client || !(await hasTable(store, table))) return [];
  return (await client.execute(sql)).rows as unknown as Row[];
}

const str = (value: Value) => (value === null || value === undefined ? "" : String(value));
const strOrNull = (value: Value) => (value === null || value === undefined ? null : String(value));

function parseJson<T>(text: Value, fallback: T): T {
  try {
    return JSON.parse(str(text)) as T;
  } catch {
    return fallback;
  }
}

/* Kapareho ng src/lib/golf-booking.ts ng site — pangalan lang ang kailangan dito. */
const ADDON_NAMES: Record<string, string> = { caddie: "Caddie", cart: "Golf cart", clubs: "Club rental", range: "Range bucket" };
const VILLA_NAMES: Record<string, string> = { villas: "Villas", dwell: "Dwell", cabins: "Cabins", cabana: "Cabana" };

/**
 * Mga tee-time reservation mula sa /golf/book. Pambasa lang: ang site ang
 * may hawak ng bayad at ng mga slot lock. Ang `held` na lumipas na ang hold
 * ay ipinapakitang `expired`, kahit hindi pa ito naa-update ng site.
 */
export async function listTeeTimes(): Promise<TeeTime[]> {
  const now = new Date().toISOString();
  const rows = await all(
    "reservations",
    "tee_reservations",
    `SELECT id, code, created_at, date, tee, time, holes, players, player_names, contact_name, contact_email,
            contact_phone, member_id, addons, villa_slug, amount_total, amount_deposit, status, hold_expires_at,
            payment_ref, paid_at
       FROM tee_reservations ORDER BY created_at DESC LIMIT 5000`,
  );
  return rows.map((r) => {
    const addons = parseJson<Record<string, number>>(r.addons, {});
    const status = str(r.status) as TeeStatus;
    const villa = strOrNull(r.villa_slug);
    return {
      id: Number(r.id),
      code: str(r.code),
      createdAt: str(r.created_at),
      date: str(r.date),
      tee: Number(r.tee),
      time: str(r.time),
      holes: Number(r.holes),
      players: Number(r.players),
      playerNames: parseJson<string[]>(r.player_names, []),
      contactName: str(r.contact_name),
      email: str(r.contact_email),
      mobile: str(r.contact_phone),
      memberId: r.member_id === null ? null : Number(r.member_id),
      addons: Object.entries(addons)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ name: ADDON_NAMES[id] ?? id, qty })),
      villa: villa ? (VILLA_NAMES[villa] ?? villa) : null,
      amountTotal: Number(r.amount_total),
      amountDeposit: Number(r.amount_deposit),
      status: status === "held" && str(r.hold_expires_at) < now ? "expired" : status,
      holdExpiresAt: str(r.hold_expires_at),
      paymentRef: strOrNull(r.payment_ref),
      paidAt: strOrNull(r.paid_at),
    };
  });
}

export async function listBookings(): Promise<Booking[]> {
  const rows = await all("inquiries", "availability_requests", "SELECT * FROM availability_requests ORDER BY created_at DESC LIMIT 5000");
  return rows.map(
    (r) => ({
      id: Number(r.id),
      createdAt: str(r.created_at),
      accommodationSlug: str(r.accommodation_slug),
      accommodationTitle: str(r.accommodation_title),
      preferredDate: str(r.preferred_date),
      guests: Number(r.guests),
      firstName: str(r.first_name),
      lastName: str(r.last_name),
      email: str(r.email),
      mobile: str(r.mobile),
      message: strOrNull(r.message),
      status: str(r.status) as BookingStatus,
    }),
  );
}

export async function listCallbacks(): Promise<Callback[]> {
  const rows = await all("inquiries", "callback_requests", "SELECT * FROM callback_requests ORDER BY created_at DESC LIMIT 5000");
  return rows.map((r) => ({
    id: Number(r.id),
    createdAt: str(r.created_at),
    firstName: str(r.first_name),
    lastName: str(r.last_name),
    email: str(r.email),
    mobile: str(r.mobile),
    postalCode: strOrNull(r.postal_code),
    interest: str(r.interest),
    guests: Number(r.guests),
    timeframe: str(r.timeframe),
    callWindows: str(r.call_windows),
    question: strOrNull(r.question),
    context: strOrNull(r.context),
    status: str(r.status) as CallbackStatus,
  }));
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const rows = await all(
    "inquiries",
    "subscribers",
    "SELECT id, created_at, email, consented FROM subscribers ORDER BY created_at DESC LIMIT 20000",
  );
  return rows.map((r) => ({ id: Number(r.id), createdAt: str(r.created_at), email: str(r.email), consented: Boolean(r.consented) }));
}

/** Walang password hash — hindi kailanman lumalabas iyon sa admin. */
export async function listMembers(): Promise<Member[]> {
  const rows = await all(
    "members",
    "members",
    `SELECT id, email, first_name, last_name, mobile, created_at, last_login_at
       FROM members ORDER BY created_at DESC LIMIT 20000`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    createdAt: str(r.created_at),
    email: str(r.email),
    firstName: str(r.first_name),
    lastName: str(r.last_name),
    mobile: strOrNull(r.mobile),
    lastLoginAt: strOrNull(r.last_login_at),
  }));
}

export async function dashboardData(): Promise<DashboardData> {
  /* Sabay-sabay, para isang hintay lang sa Turso. */
  const [teetimes, bookings, callbacks, subscribers, members] = await Promise.all([
    listTeeTimes(),
    listBookings(),
    listCallbacks(),
    listSubscribers(),
    listMembers(),
  ]);
  return { teetimes, bookings, callbacks, subscribers, members };
}

/** `true` kapag may nabago. Ang `kind` at `status` ay sinuri na ng tumawag. */
export async function setStatus(kind: EditableKind, id: number, status: string): Promise<boolean> {
  const client = db("inquiries");
  if (!client || !(await hasTable("inquiries", TABLES[kind]))) return false;
  /* Galing sa nakapirming mapa ang pangalan ng talahanayan, hindi sa request. */
  const result = await client.execute({ sql: `UPDATE ${TABLES[kind]} SET status = ? WHERE id = ?`, args: [status, id] });
  return Number(result.rowsAffected) > 0;
}
