/**
 * Admin dashboard ng CamSur Uptown Golf — dito makikita kung sino ang
 * nag-inquire, nag-request ng call back, nag-book ng bahay sa Villa Del Rey,
 * nag-subscribe sa newsletter, at nag-sign up bilang miyembro.
 *
 *   npm start                → http://localhost:4000
 *   ADMIN_PORT=4100 npm start
 *
 * O sa VS Code: Run and Debug → "Admin dashboard".
 *
 * Sariling folder ito, hiwalay sa Next.js site, at walang npm dependency:
 * `node:http` at `node:sqlite` lang. Ang data ng site ay binabasa mula sa
 * katabing `camsuruptowngolf/data` (tingnan ang db.mjs). Sa 127.0.0.1 lang ito
 * nakikinig, kaya ang computer na ito lang ang makakabukas — hindi ang ibang
 * device sa Wi-Fi.
 *
 * Sa unang bukas ay hihingin nitong gumawa ng unang admin account.
 */
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SESSION_COOKIE,
  SESSION_HOURS,
  adminCount,
  adminFromSession,
  authenticate,
  clearFailures,
  createAdmin,
  createSession,
  deleteSession,
  isLockedOut,
  passwordProblem,
  recordFailure,
} from "./auth.mjs";
import {
  SITE_DATA_DIR,
  STATUSES,
  listBookings,
  listCallbacks,
  listMembers,
  listSubscribers,
  setStatus,
} from "./db.mjs";

const PORT = Number(process.env.ADMIN_PORT) || 4000;
const HOST = "127.0.0.1";
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

/* Nakapirming mapa ng mga file na maaaring ibigay — walang pinagsasamang
   path mula sa URL, kaya walang paraan para mabasa ang ibang file. */
const STATIC = {
  "/": [path.join(PUBLIC, "index.html"), "text/html; charset=utf-8"],
  "/app.css": [path.join(PUBLIC, "app.css"), "text/css; charset=utf-8"],
  "/app.js": [path.join(PUBLIC, "app.js"), "text/javascript; charset=utf-8"],
  "/mark.png": [path.join(PUBLIC, "mark.png"), "image/png"],
  "/clubhouse.jpg": [path.join(PUBLIC, "clubhouse.jpg"), "image/jpeg"],
};

const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};

/* ---------- Mga katulong ---------- */

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

function json(res, status, data, headers = {}) {
  send(res, status, JSON.stringify(data), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
}

function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

const sessionCookie = (token) =>
  `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}`;
const clearedCookie = `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;

async function readJson(req) {
  /* JSON lang: hindi makakapagpadala nito ang isang karaniwang <form> mula sa
     ibang site, kaya dagdag na harang ito sa CSRF bukod sa SameSite. */
  if (!(req.headers["content-type"] ?? "").startsWith("application/json")) return null;
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 10_000) return null;
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return typeof value === "object" && value !== null ? value : null;
  } catch {
    return null;
  }
}

const text = (body, key, max) => (typeof body[key] === "string" ? body[key].trim().slice(0, max) : "");

/* ---------- Mga route ---------- */

async function handleApi(req, res, pathname) {
  const token = readCookie(req, SESSION_COOKIE);
  const admin = adminFromSession(token);

  if (req.method === "GET" && pathname === "/api/session") {
    return json(res, 200, { admin, needsSetup: adminCount() === 0 });
  }

  if (req.method === "POST" && pathname === "/api/setup") {
    /* Bukas lang habang wala pang kahit isang admin. */
    if (adminCount() > 0) return json(res, 403, { error: "Setup is already done. Please sign in." });
    const body = (await readJson(req)) ?? {};
    const name = text(body, "name", 80);
    const username = text(body, "username", 40).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!name) return json(res, 400, { error: "Enter your name." });
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      return json(res, 400, { error: "Username: 3–40 letters, numbers, dots, dashes or underscores." });
    }
    const problem = passwordProblem(password);
    if (problem) return json(res, 400, { error: problem });
    const created = createAdmin({ username, name, password });
    if (!created) return json(res, 409, { error: "That username is taken." });
    return json(res, 201, { admin: created }, { "Set-Cookie": sessionCookie(createSession(created.id)) });
  }

  if (req.method === "POST" && pathname === "/api/login") {
    const body = (await readJson(req)) ?? {};
    const username = text(body, "username", 40).toLowerCase();
    const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
    if (!username || !password) return json(res, 400, { error: "Enter your username and password." });
    const key = `user:${username}`;
    if (isLockedOut(key)) {
      return json(res, 429, { error: "Too many wrong attempts. Try again in 15 minutes." });
    }
    const found = authenticate(username, password);
    if (!found) {
      recordFailure(key);
      return json(res, 401, { error: "Wrong username or password." });
    }
    clearFailures(key);
    return json(res, 200, { admin: found }, { "Set-Cookie": sessionCookie(createSession(found.id)) });
  }

  if (req.method === "POST" && pathname === "/api/logout") {
    deleteSession(token);
    return json(res, 200, { ok: true }, { "Set-Cookie": clearedCookie });
  }

  /* Lahat ng nasa ibaba ay para lang sa naka-login. */
  if (!admin) return json(res, 401, { error: "Please sign in." });

  if (req.method === "GET" && pathname === "/api/data") {
    return json(res, 200, {
      bookings: listBookings(),
      callbacks: listCallbacks(),
      subscribers: listSubscribers(),
      members: listMembers(),
      statuses: STATUSES,
    });
  }

  const statusRoute = pathname.match(/^\/api\/(bookings|callbacks)\/(\d+)$/);
  if (req.method === "PATCH" && statusRoute) {
    const [, kind, id] = statusRoute;
    const body = (await readJson(req)) ?? {};
    if (!STATUSES[kind].includes(body.status)) return json(res, 400, { error: "Unknown status." });
    if (!setStatus(kind, Number(id), body.status)) return json(res, 404, { error: "Not found." });
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: "Not found." });
}

const server = createServer(async (req, res) => {
  try {
    /* Pangontra sa DNS rebinding: localhost lang ang tinatanggap na Host. */
    const host = req.headers.host ?? "";
    if (host !== `localhost:${PORT}` && host !== `127.0.0.1:${PORT}`) {
      return send(res, 421, "Open this dashboard at http://localhost:" + PORT);
    }
    /* Ang pagbabago (POST/PATCH) ay galing lang dapat sa pahinang ito. */
    const origin = req.headers.origin;
    if (req.method !== "GET" && origin && origin !== `http://${host}`) {
      return json(res, 403, { error: "Cross-site request blocked." });
    }

    const { pathname } = new URL(req.url ?? "/", `http://${host}`);
    if (pathname.startsWith("/api/")) return await handleApi(req, res, pathname);

    const entry = STATIC[pathname];
    if (req.method !== "GET" || !entry) return send(res, 404, "Not found");
    const [file, type] = entry;
    const isImage = type.startsWith("image/");
    return send(res, 200, await readFile(file), {
      "Content-Type": type,
      "Cache-Control": isImage ? "max-age=86400" : "no-cache",
    });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) json(res, 500, { error: "Something went wrong on the admin server." });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\n  Port ${PORT} is already in use. Is the admin already running?`);
    console.error(`  Try another port:  ADMIN_PORT=4100 npm run admin\n`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, HOST, () => {
  console.log(`\n  CamSur Uptown Golf · Admin`);
  console.log(`  ➜  http://localhost:${PORT}`);
  console.log(`  Site data: ${SITE_DATA_DIR}`);
  if (!existsSync(SITE_DATA_DIR)) {
    console.log(`  ⚠  Walang ganitong folder pa. Patakbuhin muna ang site at magpasa ng form,`);
    console.log(`     o itakda ang SITE_DATA_DIR sa tamang data/ folder ng site.`);
  }
  console.log("");
});
