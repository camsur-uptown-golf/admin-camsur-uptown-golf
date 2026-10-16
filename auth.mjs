import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { ADMIN_DIR } from "./db.mjs";

/**
 * Mga admin account at session ng admin dashboard.
 *
 * Nasa sariling folder ng admin (`admin-camsuruptowngolf/data/admin.sqlite`),
 * hindi sa site: hiwalay sa mga miyembro, kaya hindi kailanman makakapag-login
 * sa admin ang isang miyembro, at hindi nadadamay ang mga admin kapag binura
 * ang database ng site.
 *
 * Kapareho ng members-db ang paraan: scrypt na may sariling salt ang bawat
 * password, at SHA-256 lang ng session token ang nasa database.
 *
 * NAKALIMUTAN ANG PASSWORD: itigil ang admin, burahin ang `data/admin.sqlite`,
 * at buksan ulit — lalabas muli ang "Create the first admin" na screen. Hindi
 * nagagalaw ang mga inquiry at booking dahil nasa ibang file ang mga iyon.
 */

const DATA_DIR = path.join(ADMIN_DIR, "data");
const DB_FILE = path.join(DATA_DIR, "admin.sqlite");

export const SESSION_COOKIE = "cu-admin";
/* Isang araw ng trabaho — mas maikli kaysa sa miyembro dahil mas sensitibo
   ang nakikita rito (pangalan, email at numero ng lahat ng bisita). */
export const SESSION_HOURS = 12;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

let connection;

function db() {
  if (!connection) {
    mkdirSync(DATA_DIR, { recursive: true });
    connection = new DatabaseSync(DB_FILE);
    connection.exec(`
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
    `);
  }
  return connection;
}

/* ---------- Password ---------- */

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

function verifyPassword(password, stored) {
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
const DUMMY_HASH = hashPassword(randomBytes(16).toString("hex"));

/** 10 pataas, may titik at numero. `null` kapag pasado. */
export function passwordProblem(password) {
  if (typeof password !== "string" || password.length < 10 || password.length > 200) {
    return "Use at least 10 characters.";
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use both letters and numbers.";
  return null;
}

/* ---------- Admins ---------- */

const toAdmin = (row) => ({ id: row.id, username: row.username, name: row.name, lastLoginAt: row.last_login_at });

export function adminCount() {
  return Number(db().prepare("SELECT COUNT(*) AS n FROM admins").get().n);
}

/** `null` kapag may account na ang username. */
export function createAdmin({ username, name, password }) {
  try {
    const result = db()
      .prepare("INSERT INTO admins (username, name, password_hash, created_at) VALUES (?, ?, ?, ?)")
      .run(username, name, hashPassword(password), new Date().toISOString());
    return { id: Number(result.lastInsertRowid), username, name, lastLoginAt: null };
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) return null;
    throw error;
  }
}

export function authenticate(username, password) {
  const row = db().prepare("SELECT * FROM admins WHERE username = ?").get(username);
  if (!row) {
    verifyPassword(password, DUMMY_HASH);
    return null;
  }
  if (!verifyPassword(password, row.password_hash)) return null;
  const now = new Date().toISOString();
  db().prepare("UPDATE admins SET last_login_at = ? WHERE id = ?").run(now, row.id);
  /* Ang naunang pag-login ang ipinapakita ("Last sign-in"), hindi ang ngayon. */
  return toAdmin(row);
}

/* ---------- Sessions ---------- */

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function createSession(adminId) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3_600_000);
  db().prepare("DELETE FROM admin_sessions WHERE expires_at < ?").run(now.toISOString());
  db()
    .prepare("INSERT INTO admin_sessions (token_hash, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(sha256(token), adminId, now.toISOString(), expiresAt.toISOString());
  return token;
}

export function adminFromSession(token) {
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT a.* FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), new Date().toISOString());
  return row ? toAdmin(row) : null;
}

export function deleteSession(token) {
  if (token) db().prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(sha256(token));
}

/* ---------- Limit sa maling pag-login ---------- */

/* Sa memorya lang — sapat dahil iisang process at localhost lang ito. */
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;
const failures = new Map();

export function isLockedOut(key) {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(key) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) failures.set(key, { count: 1, first: Date.now() });
  else entry.count += 1;
}

export function clearFailures(key) {
  failures.delete(key);
}
