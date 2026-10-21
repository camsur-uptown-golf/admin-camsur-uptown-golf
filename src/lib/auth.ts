import type { Client, Row } from "@libsql/client";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "./db.ts";
import type { Admin } from "./types.ts";

/**
 * Mga admin account at session ng admin dashboard.
 *
 * Hiwalay sa mga miyembro (sariling `admins` table — sa Turso, o sa
 * `admin-camsuruptowngolf/data/admin.sqlite` kapag lokal), kaya hindi
 * kailanman makakapag-login sa admin ang isang miyembro.
 *
 * Kapareho ng members-db ang paraan: scrypt na may sariling salt ang bawat
 * password, at SHA-256 lang ng session token ang nasa database.
 *
 * NAKALIMUTAN ANG PASSWORD:  npm run reset-password
 */

export { SESSION_COOKIE } from "./session-cookie.ts";
/* Isang araw ng trabaho — mas maikli kaysa sa miyembro dahil mas sensitibo
   ang nakikita rito (pangalan, email at numero ng lahat ng bisita). */
export const SESSION_HOURS = 12;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

type AdminRow = {
  id: number;
  username: string;
  name: string;
  password_hash: string;
  created_at: string;
  last_login_at: string | null;
};

/* Isang beses lang bawat process ang paggawa ng mga table. */
const cache = globalThis as unknown as { __adminSchema?: Promise<void> };

async function adminDb(): Promise<Client> {
  const client = db("admin");
  cache.__adminSchema ??= client
    .executeMultiple(
      `
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS admins (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        username       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
        name           TEXT    NOT NULL,
        password_hash  TEXT    NOT NULL,
        created_at     TEXT    NOT NULL,
        last_login_at  TEXT
      );
      CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash  TEXT    PRIMARY KEY,
        admin_id    INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        created_at  TEXT    NOT NULL,
        expires_at  TEXT    NOT NULL
      );
    `,
    )
    .catch((error: unknown) => {
      /* Subukan ulit sa susunod na request kapag pumalya (hal. walang token). */
      cache.__adminSchema = undefined;
      throw error;
    });
  await cache.__adminSchema;
  return client;
}

const toRow = (row: Row): AdminRow => ({
  id: Number(row.id),
  username: String(row.username),
  name: String(row.name),
  password_hash: String(row.password_hash),
  created_at: String(row.created_at),
  last_login_at: row.last_login_at === null || row.last_login_at === undefined ? null : String(row.last_login_at),
});

/* ---------- Password ---------- */

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/* Kinukumpara kapag walang ganoong username, para pareho ang tagal ng sagot. */
let dummyHash: string | undefined;

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 10 || password.length > 200) {
    return "Use at least 10 characters.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use both letters and numbers.";
  return null;
}

/* ---------- Admins ---------- */

const toAdmin = (row: AdminRow): Admin => ({ id: row.id, username: row.username, name: row.name, lastLoginAt: row.last_login_at });

export async function adminCount(): Promise<number> {
  const result = await (await adminDb()).execute("SELECT COUNT(*) AS n FROM admins");
  return Number(result.rows[0]?.n ?? 0);
}

/**
 * `null` kapag may account na ang username. Sa `firstOnly`, `null` din kapag
 * may admin na — iisang statement, kaya hindi makakalusot ang dalawang sabay
 * na setup.
 */
export async function createAdmin(
  { username, name, password }: { username: string; name: string; password: string },
  { firstOnly = false } = {},
): Promise<Admin | null> {
  try {
    const result = await (
      await adminDb()
    ).execute({
      sql: `INSERT INTO admins (username, name, password_hash, created_at) SELECT ?, ?, ?, ?
             WHERE ? = 0 OR NOT EXISTS (SELECT 1 FROM admins)`,
      args: [username, name, hashPassword(password), new Date().toISOString(), firstOnly ? 1 : 0],
    });
    if (result.rowsAffected === 0) return null;
    return { id: Number(result.lastInsertRowid), username, name, lastLoginAt: null };
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) return null;
    throw error;
  }
}

/** Bagong password at tanggal lahat ng session. `false` kapag walang ganoong username. */
export async function setAdminPassword(username: string, password: string): Promise<boolean> {
  const client = await adminDb();
  const found = await client.execute({ sql: "SELECT id FROM admins WHERE username = ?", args: [username] });
  const row = found.rows[0];
  if (!row) return false;
  const id = Number(row.id);
  await client.batch(
    [
      { sql: "UPDATE admins SET password_hash = ? WHERE id = ?", args: [hashPassword(password), id] },
      { sql: "DELETE FROM admin_sessions WHERE admin_id = ?", args: [id] },
    ],
    "write",
  );
  return true;
}

export async function listAdmins(): Promise<Admin[]> {
  const result = await (await adminDb()).execute("SELECT * FROM admins ORDER BY id");
  return result.rows.map((row) => toAdmin(toRow(row)));
}

export async function authenticate(username: string, password: string): Promise<Admin | null> {
  const client = await adminDb();
  const found = await client.execute({ sql: "SELECT * FROM admins WHERE username = ?", args: [username] });
  const row = found.rows[0] ? toRow(found.rows[0]) : undefined;
  if (!row) {
    verifyPassword(password, (dummyHash ??= hashPassword(randomBytes(16).toString("hex"))));
    return null;
  }
  if (!verifyPassword(password, row.password_hash)) return null;
  await client.execute({ sql: "UPDATE admins SET last_login_at = ? WHERE id = ?", args: [new Date().toISOString(), row.id] });
  /* Ang naunang pag-login ang ipinapakita ("Last sign-in"), hindi ang ngayon. */
  return toAdmin(row);
}

/* ---------- Sessions ---------- */

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function createSession(adminId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3_600_000);
  await (
    await adminDb()
  ).batch(
    [
      { sql: "DELETE FROM admin_sessions WHERE expires_at < ?", args: [now.toISOString()] },
      {
        sql: "INSERT INTO admin_sessions (token_hash, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        args: [sha256(token), adminId, now.toISOString(), expiresAt.toISOString()],
      },
    ],
    "write",
  );
  return token;
}

export async function adminFromSession(token: string | undefined): Promise<Admin | null> {
  if (!token) return null;
  const result = await (
    await adminDb()
  ).execute({
    sql: `SELECT a.* FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
           WHERE s.token_hash = ? AND s.expires_at > ?`,
    args: [sha256(token), new Date().toISOString()],
  });
  return result.rows[0] ? toAdmin(toRow(result.rows[0])) : null;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (token) await (await adminDb()).execute({ sql: "DELETE FROM admin_sessions WHERE token_hash = ?", args: [sha256(token)] });
}

/* ---------- Limit sa maling pag-login ---------- */

/* Sa memorya lang. Sa Vercel, bawat instance ay may sariling bilang — mas
   maluwag nang kaunti, pero mahaba (10+) at scrypt ang password. */
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;
const failureCache = globalThis as unknown as { __adminFailures?: Map<string, { count: number; first: number }> };
const failures = (failureCache.__adminFailures ??= new Map());

export function isLockedOut(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) failures.set(key, { count: 1, first: Date.now() });
  else entry.count += 1;
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
