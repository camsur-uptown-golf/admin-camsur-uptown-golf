/**
 * Clubhouse Office — ang buong admin UI, walang framework.
 *
 * Isang beses kinukuha ang lahat ng datos (`/api/data`) at dito na sa browser
 * sinasala, hinahanap at binibilang; sapat ito dahil daan-daan lang ang hilera.
 * Inuulit ang pagkuha bawat 30 segundo kaya lumalabas ang bagong pasa nang
 * hindi nire-refresh ang pahina.
 *
 * SEGURIDAD: galing sa mga bisita ang halos lahat ng teksto rito (pangalan,
 * mensahe), kaya dumaraan ang LAHAT ng halaga sa `html` na tagged template na
 * nag-e-escape bilang default. `Safe` lang ang hindi ine-escape — para sa
 * HTML na tayo mismo ang gumawa.
 */

const $app = document.getElementById("app");
const $toast = document.getElementById("toast");

/* ═══════════════════════════ HTML na ligtas ═══════════════════════════ */

class Safe {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

function part(value) {
  if (value instanceof Safe) return value.value;
  if (Array.isArray(value)) return value.map(part).join("");
  if (value === false || value === null || value === undefined) return "";
  return esc(value);
}

function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => (out += part(value) + strings[i + 1]));
  return new Safe(out);
}

/* ═══════════════════════════ Mga icon ═══════════════════════════ */

const svg = (d, size = 18) =>
  new Safe(
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`,
  );

const ICON = {
  overview: (s) => svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', s),
  bookings: (s) => svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>', s),
  callbacks: (s) =>
    svg(
      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
      s,
    ),
  newsletter: (s) => svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', s),
  members: (s) => svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>', s),
  search: (s) => svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', s),
  refresh: (s) => svg('<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>', s),
  close: (s) => svg('<path d="M6 6l12 12M18 6L6 18"/>', s),
  copy: (s) => svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', s),
  download: (s) => svg('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>', s),
  flag: (s) => svg('<path d="M6 21V3"/><path d="M6 4h11l-2.5 4L17 12H6"/><ellipse cx="9" cy="21" rx="5" ry="1"/>', s),
  signout: (s) => svg('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>', s),
  lock: (s) => svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', s),
};
/* Kapareho ng pangalan ng route ang susi, kaya may alias para sa Newsletter. */
ICON.subscribers = ICON.newsletter;

/* ═══════════════════════════ Format ═══════════════════════════ */

const TZ = "Asia/Manila";
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const dateTimeFmt = new Intl.DateTimeFormat("en-PH", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("en-PH", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });

/** "YYYY-MM-DD" sa oras ng Pilipinas. */
const dayKey = (date) => dayKeyFmt.format(date);
const todayKey = () => dayKey(new Date());

const fmtDateTime = (iso) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");
const fmtDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : "—");

/* Petsa lang ang preferred date (walang oras), kaya binubuo bilang tanghali
   UTC para hindi lumipat ng araw sa anumang timezone. */
const fromDayKey = (key) => new Date(`${key}T12:00:00Z`);
const fmtDay = (key, options) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", ...options }).format(fromDayKey(key));

function relative(iso) {
  if (!iso) return "—";
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  if (seconds < 7 * 86_400) return `${Math.round(seconds / 86_400)} d ago`;
  return fmtDate(iso);
}

const fullName = (r) => `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—";
const initials = (name) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const withinDays = (iso, days) => Date.now() - new Date(iso).getTime() < days * 86_400_000;
const telHref = (mobile) => `tel:${String(mobile).replace(/[^\d+]/g, "")}`;

/* ═══════════════════════════ State ═══════════════════════════ */

const state = {
  admin: null,
  data: null,
  lastSync: null,
  syncFailed: false,
  drawer: null,
  filters: {
    bookings: { q: "", status: "all", house: "all" },
    callbacks: { q: "", status: "all" },
    subscribers: { q: "" },
    members: { q: "" },
  },
};

const PAGES = {
  overview: { nav: "Overview", title: "Overview" },
  bookings: { nav: "Bookings", title: "Bookings" },
  callbacks: { nav: "Call-backs", title: "Call-backs" },
  subscribers: { nav: "Newsletter", title: "Newsletter" },
  members: { nav: "Members", title: "Members" },
};

const route = () => {
  const name = location.hash.replace(/^#\/?/, "");
  return PAGES[name] ? name : "overview";
};

/* ═══════════════════════════ API ═══════════════════════════ */

async function api(path, { method = "GET", body } = {}) {
  try {
    const res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Can't reach the admin server. Is it still running?" } };
  }
}

let lastPayload = "";

/** `true` kapag may nagbago sa datos mula sa huling kuha. */
async function sync() {
  const { ok, status, data } = await api("/api/data");
  if (status === 401) {
    state.admin = null;
    renderAuth("login", "Your session ended. Please sign in again.");
    return false;
  }
  if (!ok) {
    state.syncFailed = true;
    renderSynced();
    return false;
  }
  state.syncFailed = false;
  state.lastSync = new Date();
  const payload = JSON.stringify(data);
  const changed = payload !== lastPayload;
  lastPayload = payload;
  state.data = data;
  renderSynced();
  return changed;
}

/* ═══════════════════════════ Toast ═══════════════════════════ */

let toastTimer;
function toast(message, kind = "") {
  $toast.textContent = message;
  $toast.className = kind;
  $toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($toast.hidden = true), 2600);
}

/* ═══════════════════════════ Login / Setup ═══════════════════════════ */

function renderAuth(mode, message = "") {
  const setup = mode === "setup";
  $app.innerHTML = String(html`
    <div class="auth">
      <section class="auth-visual">
        <div class="auth-brand">
          <img src="/mark.png" alt="" />
          <span>CamSur Uptown<small>Golf Club · Est. 2026</small></span>
        </div>
        <div class="auth-headline">
          <div class="eyebrow rule">Bookings · Enquiries · Members</div>
          <h1>The Clubhouse Office</h1>
          <p>Every villa booking, call-back and new member, kept in one ledger.</p>
        </div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <img class="mark" src="/mark.png" alt="CamSur Uptown Golf Club" />
          <div class="eyebrow">${setup ? "First-time setup" : "Staff only"}</div>
          <h2>${setup ? "Create the first admin" : "Sign in"}</h2>
          <p class="lede">
            ${setup
              ? "No admin account exists yet. The account you create here can open the dashboard."
              : "Use your admin username and password."}
          </p>
          <form data-form="${mode}" novalidate>
            ${message ? html`<p class="form-error" role="alert">${message}</p>` : ""}
            ${setup
              ? html`<label class="field"
                  ><span>Your name</span><input name="name" autocomplete="name" required maxlength="80"
                /></label>`
              : ""}
            <label class="field">
              <span>Username</span>
              <input name="username" autocomplete="username" required maxlength="40" autocapitalize="none" spellcheck="false" />
            </label>
            <label class="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                autocomplete="${setup ? "new-password" : "current-password"}"
                required
              />
              ${setup ? html`<small class="hint">At least 10 characters, with letters and numbers.</small>` : ""}
            </label>
            ${setup
              ? html`<label class="field"
                  ><span>Confirm password</span
                  ><input name="confirm" type="password" autocomplete="new-password" required
                /></label>`
              : ""}
            <button class="btn-primary" type="submit">${setup ? "Create account" : "Sign in"}</button>
          </form>
          <p class="auth-foot">${ICON.lock(14)} Runs only on this computer, at localhost.</p>
        </div>
      </section>
    </div>
  `);
  $app.querySelector("input")?.focus();
}

async function submitAuth(form) {
  const mode = form.dataset.form;
  const values = Object.fromEntries(new FormData(form));
  if (mode === "setup" && values.password !== values.confirm) {
    return renderAuthError(form, "The two passwords don't match.");
  }
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  const { ok, data } = await api(mode === "setup" ? "/api/setup" : "/api/login", { method: "POST", body: values });
  button.disabled = false;
  if (!ok) return renderAuthError(form, data.error || "Something went wrong.");
  state.admin = data.admin;
  await startDashboard();
}

function renderAuthError(form, message) {
  let box = form.querySelector(".form-error");
  if (!box) {
    box = document.createElement("p");
    box.className = "form-error";
    box.setAttribute("role", "alert");
    form.prepend(box);
  }
  box.textContent = message;
  form.querySelector("input[type=password]")?.select();
}

/* ═══════════════════════════ Shell ═══════════════════════════ */

function renderShell() {
  const name = state.admin.name;
  $app.innerHTML = String(html`
    <div class="shell">
      <aside class="sidebar">
        <div class="side-brand">
          <img src="/mark.png" alt="" />
          <div><strong>CamSur Uptown</strong><small>Clubhouse Office</small></div>
        </div>
        <nav class="nav" id="nav" aria-label="Sections"></nav>
        <div class="side-foot">
          <div class="who">
            <span class="avatar" aria-hidden="true">${initials(name)}</span>
            <div>
              <strong>${name}</strong>
              <small>${state.admin.lastLoginAt ? `Last sign-in ${relative(state.admin.lastLoginAt)}` : "First sign-in"}</small>
            </div>
          </div>
          <button class="btn-signout" data-action="signout" title="Sign out">${ICON.signout(16)}<span>Sign out</span></button>
        </div>
      </aside>
      <main class="main" id="main"></main>
    </div>
    <div id="drawer-root"></div>
  `);
  renderNav();
  renderMain();
}

function renderNav() {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const current = route();
  const fresh = (rows) => rows.filter((r) => r.status === "new").length;
  const counts = {
    bookings: fresh(state.data.bookings),
    callbacks: fresh(state.data.callbacks),
  };
  const link = (key, label) => html`
    <a href="#/${key}" aria-current="${current === key ? "page" : "false"}">
      ${ICON[key](18)} ${label}
      ${counts[key] ? html`<span class="count" title="${plural(counts[key], "new request")}">${counts[key]}</span>` : ""}
    </a>
  `;
  nav.innerHTML = String(html`
    <div class="nav-label">Ledger</div>
    ${link("overview", "Overview")}
    <div class="nav-label">Guests</div>
    ${link("bookings", "Bookings")} ${link("callbacks", "Call-backs")}
    <div class="nav-label">Audience</div>
    ${link("subscribers", "Newsletter")} ${link("members", "Members")}
  `);
}

function topbar(page) {
  const info = PAGES[page];
  return html`
    <header class="topbar">
      <div>
        <h1>${info.title}</h1>
      </div>
      <div class="live" id="live">
        <span class="live-dot" aria-hidden="true"></span>
        <span id="synced">Synced just now</span>
        <button class="btn-ghost" data-action="refresh" aria-label="Refresh now">${ICON.refresh(14)} Refresh</button>
      </div>
    </header>
  `;
}

function renderSynced() {
  const live = document.getElementById("live");
  const label = document.getElementById("synced");
  if (!live || !label) return;
  live.classList.toggle("stale", state.syncFailed);
  label.textContent = state.syncFailed
    ? "Offline — retrying"
    : state.lastSync
      ? `Synced ${relative(state.lastSync.toISOString())}`
      : "Syncing…";
}

function renderMain() {
  const main = document.getElementById("main");
  if (!main) return;
  const page = route();
  document.title = `${PAGES[page].title} · Clubhouse Office`;
  if (page === "overview") {
    main.innerHTML = String(html`${topbar(page)}${overview()}`);
    drawChart();
  } else {
    main.innerHTML = String(html`${topbar(page)}${listPage(page)}`);
    renderResults();
  }
  renderSynced();
}

/* ═══════════════════════════ Overview ═══════════════════════════ */

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function overview() {
  const { bookings, callbacks, subscribers, members } = state.data;
  const fresh = (rows) => rows.filter((r) => r.status === "new").length;
  const week = (rows) => rows.filter((r) => withinDays(r.createdAt, 7)).length;
  const today = todayKey();
  const upcoming = bookings
    .filter((b) => b.preferredDate >= today && b.status !== "closed")
    .sort((a, b) => a.preferredDate.localeCompare(b.preferredDate))
    .slice(0, 6);
  const waiting = fresh(bookings) + fresh(callbacks);
  const activeMembers = members.filter((m) => m.lastLoginAt && withinDays(m.lastLoginAt, 30)).length;

  const score = (key, label, value, sub) => html`
    <a class="score" href="#/${key}">
      <div class="score-head"><span>${label}</span></div>
      <div class="score-body">
        <div class="score-value">${value}</div>
        <div class="score-sub">${sub}</div>
      </div>
    </a>
  `;

  return html`
    <section class="welcome">
      <div>
        <h2>${greeting()}, ${state.admin.name.split(" ")[0]}.</h2>
        <p>
          ${waiting
            ? html`<b>${plural(waiting, "request")}</b> ${waiting === 1 ? "is" : "are"} waiting for a reply.`
            : "You're all caught up. No new requests waiting."}
        </p>
      </div>
    </section>

    <section class="scorecard" aria-label="Totals">
      ${score(
        "bookings",
        "Bookings",
        bookings.length,
        html`${fresh(bookings) ? html`<span class="flagged">● ${fresh(bookings)} new</span>` : ""}<span
            ><b>${week(bookings)}</b> this week</span
          >`,
      )}
      ${score(
        "callbacks",
        "Call-backs",
        callbacks.length,
        html`${fresh(callbacks) ? html`<span class="flagged">● ${fresh(callbacks)} new</span>` : ""}<span
            ><b>${week(callbacks)}</b> this week</span
          >`,
      )}
      ${score("subscribers", "Newsletter", subscribers.length, html`<span><b>${week(subscribers)}</b> joined this week</span>`)}
      ${score(
        "members",
        "Members",
        members.length,
        html`<span><b>${week(members)}</b> new this week</span><span><b>${activeMembers}</b> active</span>`,
      )}
    </section>

    <div class="grid-2">
      <section class="card">
        <div class="card-head">
          <h3>Requests, last 30 days</h3>
        </div>
        <div class="card-body">
          <div class="legend" id="legend"></div>
          <div class="chart" id="chart"></div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h3>Upcoming bookings</h3>
          <a class="link-more" href="#/bookings">All bookings →</a>
        </div>
        <div class="card-body">
          ${upcoming.length
            ? html`<ul class="tee">
                ${upcoming.map(
                  (b) => html`<li>
                    <button data-action="open" data-kind="bookings" data-id="${b.id}">
                      <span class="date-chip"
                        ><b>${fmtDay(b.preferredDate, { day: "numeric" })}</b
                        ><small>${fmtDay(b.preferredDate, { month: "short" })}</small></span
                      >
                      <span class="who-line">
                        <strong>${fullName(b)}</strong>
                        <small>${b.accommodationTitle} · ${plural(b.guests, "guest")} · ${fmtDay(b.preferredDate, { weekday: "long" })}</small>
                      </span>
                      ${statusPill(b.status)}
                    </button>
                  </li>`,
                )}
              </ul>`
            : emptyState("No upcoming bookings", true)}
        </div>
      </section>
    </div>

    <section class="card">
      <div class="card-head"><h3>Latest activity</h3></div>
      <div class="card-body">${feed()}</div>
    </section>
  `;
}

function feed() {
  const { bookings, callbacks, subscribers, members } = state.data;
  const items = [
    ...bookings.map((r) => ({
      at: r.createdAt,
      kind: "bookings",
      id: r.id,
      who: fullName(r),
      what: `asked about ${r.accommodationTitle} for ${fmtDay(r.preferredDate, { day: "numeric", month: "short" })}`,
      gold: r.status === "new",
    })),
    ...callbacks.map((r) => ({
      at: r.createdAt,
      kind: "callbacks",
      id: r.id,
      who: fullName(r),
      what: `wants a call about ${r.interest}${r.context ? ` · from ${r.context}` : ""}`,
      gold: r.status === "new",
    })),
    ...subscribers.map((r) => ({ at: r.createdAt, kind: "subscribers", who: r.email, what: "subscribed to the newsletter" })),
    ...members.map((r) => ({ at: r.createdAt, kind: "members", id: r.id, who: fullName(r), what: "created a member account" })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  if (!items.length) {
    return emptyState("No activity yet", true);
  }
  return html`<ul class="feed">
    ${items.map(
      (item) => html`<li>
        <span class="ico ${item.gold ? "gold" : ""}">${ICON[item.kind](16)}</span>
        <p>
          ${item.id
            ? html`<button data-action="open" data-kind="${item.kind}" data-id="${item.id}">${item.who}</button>`
            : html`<strong>${item.who}</strong>`}
          ${item.what}
        </p>
        <time datetime="${item.at}" title="${fmtDateTime(item.at)}">${relative(item.at)}</time>
      </li>`,
    )}
  </ul>`;
}

/* ─── Chart: stacked bars, booking + call-back bawat araw ─── */

const SERIES = [
  { key: "bookings", label: "Bookings" },
  { key: "callbacks", label: "Call-backs" },
];

function chartDays() {
  const days = [];
  for (let i = 29; i >= 0; i -= 1) {
    const key = dayKey(new Date(Date.now() - i * 86_400_000));
    days.push({ key, bookings: 0, callbacks: 0 });
  }
  const index = new Map(days.map((d) => [d.key, d]));
  for (const s of SERIES) {
    for (const row of state.data[s.key]) {
      const day = index.get(dayKey(new Date(row.createdAt)));
      if (day) day[s.key] += 1;
    }
  }
  return days;
}

/* Parihaba na bilugan lang ang itaas — nakaangkla sa baseline ang ibaba. */
function topRounded(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function drawChart() {
  const host = document.getElementById("chart");
  const legend = document.getElementById("legend");
  if (!host) return;
  const days = chartDays();
  const totals = Object.fromEntries(SERIES.map((s) => [s.key, days.reduce((n, d) => n + d[s.key], 0)]));

  legend.innerHTML = String(
    html`${SERIES.map((s) => {
      const swatch = new Safe(`<i data-color="${s.key}"></i>`);
      return html`<span>${swatch} ${s.label} <b>${totals[s.key]}</b></span>`;
    })}`,
  );
  legend.querySelectorAll("i").forEach((i) => (i.style.background = `var(--series-${i.dataset.color})`));

  const width = Math.max(host.clientWidth, 280);
  const height = 210;
  const m = { top: 10, right: 4, bottom: 24, left: 26 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const maxTotal = Math.max(...days.map((d) => d.bookings + d.callbacks));
  const yMax = Math.max(4, Math.ceil(maxTotal / 2) * 2);
  const band = innerW / days.length;
  const barW = Math.max(3, Math.min(18, band * 0.62));
  const y = (v) => (v / yMax) * innerH;

  const grid = [0, yMax / 2, yMax]
    .map((v) => {
      const gy = m.top + innerH - y(v);
      return `<line x1="${m.left}" x2="${width - m.right}" y1="${gy}" y2="${gy}"/><text x="${m.left - 8}" y="${gy + 3.5}" text-anchor="end">${v}</text>`;
    })
    .join("");

  let bars = "";
  let hits = "";
  let labels = "";
  days.forEach((d, i) => {
    const cx = m.left + band * i + band / 2;
    const x = cx - barW / 2;
    const base = m.top + innerH;
    const hb = y(d.bookings);
    const hc = y(d.callbacks);
    /* 2px na puwang sa pagitan ng dalawang bahagi ng iisang bar. */
    const gap = hb > 0 && hc > 0 ? 2 : 0;
    if (hb > 0) {
      bars += hc > 0
        ? `<rect x="${x}" y="${base - hb}" width="${barW}" height="${hb}" class="s-bookings"/>`
        : `<path d="${topRounded(x, base - hb, barW, hb, 4)}" class="s-bookings"/>`;
    }
    if (hc > 0) {
      const h = Math.max(hc - gap, 1);
      bars += `<path d="${topRounded(x, base - hb - gap - h, barW, h, 4)}" class="s-callbacks"/>`;
    }
    hits += `<rect class="hit" data-i="${i}" x="${m.left + band * i}" y="${m.top}" width="${band}" height="${innerH}" rx="4"/>`;
    if ((days.length - 1 - i) % 7 === 0) {
      labels += `<text x="${cx}" y="${height - 6}" text-anchor="middle">${esc(fmtDay(d.key, { day: "numeric", month: "short" }))}</text>`;
    }
  });

  const summary = `Requests over the last 30 days: ${totals.bookings} bookings and ${totals.callbacks} call-backs.`;
  host.innerHTML = `
    <svg width="${width}" height="${height}" role="img" aria-label="${esc(summary)}">
      <g class="grid axis">${grid}</g>
      <g>${hits}</g>
      <g pointer-events="none">${bars}</g>
      <g class="axis">${labels}</g>
    </svg>
    <div class="tooltip" hidden></div>`;

  const tip = host.querySelector(".tooltip");
  host.onmousemove = (event) => {
    const hit = event.target.closest(".hit");
    host.querySelectorAll(".hit.on").forEach((h) => h !== hit && h.classList.remove("on"));
    if (!hit) return (tip.hidden = true);
    hit.classList.add("on");
    const d = days[Number(hit.dataset.i)];
    tip.innerHTML = String(html`
      <strong>${fmtDay(d.key, { weekday: "short", day: "numeric", month: "short" })}</strong>
      ${SERIES.map((s) => html`<div>${new Safe(`<i data-color="${s.key}"></i>`)} ${s.label} <b>${d[s.key]}</b></div>`)}
    `);
    tip.querySelectorAll("i").forEach((i) => (i.style.background = `var(--series-${i.dataset.color})`));
    const i = Number(hit.dataset.i);
    const cx = m.left + band * i + band / 2;
    const top = m.top + innerH - y(d.bookings + d.callbacks);
    tip.style.left = `${Math.min(Math.max(cx, 80), width - 80)}px`;
    tip.style.top = `${top}px`;
    tip.hidden = false;
  };
  host.onmouseleave = () => {
    tip.hidden = true;
    host.querySelectorAll(".hit.on").forEach((h) => h.classList.remove("on"));
  };
}

/* ═══════════════════════════ Mga listahan ═══════════════════════════ */

const statusPill = (status) => html`<span class="pill ${status}">${status}</span>`;

function emptyState(title, small = false) {
  return html`<div class="empty ${small ? "small" : ""}">
    <strong>${title}</strong>
  </div>`;
}

function listPage(page) {
  const filters = state.filters[page];
  const houses = page === "bookings" ? [...new Set(state.data.bookings.map((b) => b.accommodationTitle))].sort() : [];
  return html`
    <section class="card">
      <div class="toolbar">
        <label class="search">
          <span class="sr-only">Search</span>
          ${ICON.search(16)}
          <input
            type="search"
            data-filter="q"
            value="${filters.q}"
            placeholder="${page === "subscribers" ? "Search email" : "Search name, email or mobile"}"
          />
        </label>
        <div class="chips" id="chips"></div>
        ${page === "bookings" && houses.length > 1
          ? html`<label
              ><span class="sr-only">House</span
              ><select class="select" data-filter="house">
                <option value="all">All houses</option>
                ${houses.map((h) => html`<option value="${h}" ${filters.house === h ? new Safe("selected") : ""}>${h}</option>`)}
              </select></label
            >`
          : ""}
        <span class="spacer"></span>
        <button class="btn-ghost" data-action="export">${ICON.download(14)} Export CSV</button>
      </div>
      <div id="results"></div>
    </section>
  `;
}

const SEARCH_FIELDS = {
  bookings: (r) => [fullName(r), r.email, r.mobile, r.accommodationTitle, r.message],
  callbacks: (r) => [fullName(r), r.email, r.mobile, r.interest, r.context, r.question],
  subscribers: (r) => [r.email],
  members: (r) => [fullName(r), r.email, r.mobile],
};

function filtered(page, { ignoreStatus = false } = {}) {
  const f = state.filters[page];
  const q = f.q.trim().toLowerCase();
  return state.data[page].filter((r) => {
    if (!ignoreStatus && f.status && f.status !== "all" && r.status !== f.status) return false;
    if (f.house && f.house !== "all" && r.accommodationTitle !== f.house) return false;
    if (!q) return true;
    return SEARCH_FIELDS[page](r).some((v) => v && String(v).toLowerCase().includes(q));
  });
}

function renderChips(page) {
  const box = document.getElementById("chips");
  if (!box) return;
  const statuses = state.data.statuses[page];
  if (!statuses) return (box.innerHTML = "");
  const rows = filtered(page, { ignoreStatus: true });
  const current = state.filters[page].status;
  const chip = (value, label, count) =>
    html`<button class="chip" data-action="chip" data-status="${value}" aria-pressed="${String(current === value)}">
      ${label} <em>${count}</em>
    </button>`;
  box.innerHTML = String(html`
    ${chip("all", "All", rows.length)}
    ${statuses.map((s) => chip(s, s[0].toUpperCase() + s.slice(1), rows.filter((r) => r.status === s).length))}
  `);
}

const COLUMNS = {
  bookings: {
    head: ["Received", "Guest", "House", "Preferred date", "Guests", "Status"],
    row: (r) => html`
      <td class="nowrap"><span class="primary">${relative(r.createdAt)}</span><span class="secondary">${fmtDate(r.createdAt)}</span></td>
      <td><span class="primary">${fullName(r)}</span><span class="secondary">${r.email}</span></td>
      <td>${r.accommodationTitle}</td>
      <td class="nowrap"><span class="primary">${fmtDay(r.preferredDate, { day: "numeric", month: "short", year: "numeric" })}</span><span class="secondary">${fmtDay(r.preferredDate, { weekday: "long" })}</span></td>
      <td class="num">${r.guests}</td>
      <td>${statusPill(r.status)}</td>`,
  },
  callbacks: {
    head: ["Received", "Name", "Interest", "Best time to call", "Source", "Status"],
    row: (r) => html`
      <td class="nowrap"><span class="primary">${relative(r.createdAt)}</span><span class="secondary">${fmtDate(r.createdAt)}</span></td>
      <td><span class="primary">${fullName(r)}</span><span class="secondary">${r.mobile}</span></td>
      <td><span class="primary">${r.interest}</span><span class="secondary">${plural(r.guests, "guest")} · ${r.timeframe}</span></td>
      <td>${r.callWindows}</td>
      <td>${r.context || "—"}</td>
      <td>${statusPill(r.status)}</td>`,
  },
  subscribers: {
    head: ["Subscribed", "Email", "Consent"],
    row: (r) => html`
      <td class="nowrap"><span class="primary">${relative(r.createdAt)}</span><span class="secondary">${fmtDate(r.createdAt)}</span></td>
      <td><a href="mailto:${r.email}">${r.email}</a></td>
      <td>${r.consented ? "Given" : "—"}</td>`,
  },
  members: {
    head: ["Joined", "Member", "Mobile", "Last sign-in"],
    row: (r) => html`
      <td class="nowrap"><span class="primary">${relative(r.createdAt)}</span><span class="secondary">${fmtDate(r.createdAt)}</span></td>
      <td><span class="primary">${fullName(r)}</span><span class="secondary">${r.email}</span></td>
      <td>${r.mobile || "—"}</td>
      <td>${r.lastLoginAt ? relative(r.lastLoginAt) : "Never"}</td>`,
  },
};

const EMPTY_TEXT = {
  bookings: "No bookings yet",
  callbacks: "No call-backs yet",
  subscribers: "No subscribers yet",
  members: "No members yet",
};

function renderResults() {
  const page = route();
  const box = document.getElementById("results");
  if (!box || page === "overview") return;
  renderChips(page);
  const rows = filtered(page);
  const all = state.data[page].length;
  if (!all) {
    box.innerHTML = String(emptyState(EMPTY_TEXT[page]));
    return;
  }
  if (!rows.length) {
    box.innerHTML = String(emptyState("No matches"));
    return;
  }
  const clickable = page !== "subscribers";
  const { head, row } = COLUMNS[page];
  box.innerHTML = String(html`
    <div class="table-wrap">
      <table>
        <thead><tr>${head.map((h) => html`<th scope="col">${h}</th>`)}</tr></thead>
        <tbody>
          ${rows.map(
            (r) => html`<tr
              class="${clickable ? "clickable" : ""} ${r.status === "new" ? "is-new" : ""}"
              ${clickable ? html`data-action="open" data-kind="${page}" data-id="${r.id}" tabindex="0"` : ""}
            >
              ${row(r)}
            </tr>`,
          )}
        </tbody>
      </table>
    </div>
    <div class="list-foot">Showing ${rows.length} of ${all}</div>
  `);
}

/* ═══════════════════════════ Drawer ═══════════════════════════ */

let returnFocus = null;

function openDrawer(kind, id) {
  returnFocus = document.activeElement;
  state.drawer = { kind, id: Number(id) };
  renderDrawer();
  document.querySelector(".drawer-close")?.focus();
}

function closeDrawer() {
  state.drawer = null;
  renderDrawer();
  returnFocus?.focus?.();
}

function detailRows(pairs) {
  return html`<dl class="details">
    ${pairs.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}
  </dl>`;
}

function renderDrawer() {
  const root = document.getElementById("drawer-root");
  if (!root) return;
  const d = state.drawer;
  const record = d && state.data[d.kind]?.find((r) => r.id === d.id);
  if (!record) {
    root.innerHTML = "";
    return;
  }

  let eyebrow;
  let subtitle;
  let details;
  let note = null;
  if (d.kind === "bookings") {
    eyebrow = `Booking request · #${record.id}`;
    subtitle = `${record.accommodationTitle} · ${fmtDay(record.preferredDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`;
    details = detailRows([
      ["House", record.accommodationTitle],
      ["Preferred date", fmtDay(record.preferredDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })],
      ["Guests", record.guests],
      ["Email", record.email],
      ["Mobile", record.mobile],
      ["Received", fmtDateTime(record.createdAt)],
    ]);
    note = record.message;
  } else if (d.kind === "callbacks") {
    eyebrow = `Call-back request · #${record.id}`;
    subtitle = `${record.interest} · ${plural(record.guests, "guest")}`;
    details = detailRows([
      ["Interest", record.interest],
      ["Guests", record.guests],
      ["Timeframe", record.timeframe],
      ["Call between", `${record.callWindows} (PH time)`],
      ["Email", record.email],
      ["Mobile", record.mobile],
      ["Postal code", record.postalCode],
      ["Source", record.context],
      ["Received", fmtDateTime(record.createdAt)],
    ]);
    note = record.question;
  } else {
    eyebrow = `Member · #${record.id}`;
    subtitle = record.email;
    details = detailRows([
      ["Email", record.email],
      ["Mobile", record.mobile],
      ["Joined", fmtDateTime(record.createdAt)],
      ["Last sign-in", record.lastLoginAt ? fmtDateTime(record.lastLoginAt) : "Never"],
    ]);
  }

  const statuses = state.data.statuses[d.kind];
  root.innerHTML = String(html`
    <div class="scrim" data-action="close-drawer"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <header class="drawer-head">
        <div class="eyebrow">${eyebrow}</div>
        <h2 id="drawer-title">${fullName(record)}</h2>
        <p>${subtitle}</p>
        <button class="drawer-close" data-action="close-drawer" aria-label="Close">${ICON.close(16)}</button>
      </header>
      <div class="drawer-body">
        <div class="contact-row">
          <a class="btn-ghost" href="mailto:${record.email}">${ICON.newsletter(14)} Email</a>
          ${record.mobile ? html`<a class="btn-ghost" href="${telHref(record.mobile)}">${ICON.callbacks(14)} Call</a>` : ""}
          ${record.mobile
            ? html`<button class="btn-ghost" data-action="copy" data-value="${record.mobile}">${ICON.copy(14)} Copy number</button>`
            : ""}
        </div>
        ${statuses
          ? html`<div class="eyebrow section-label">Status</div>
              <div class="status-switch" role="group" aria-label="Status">
                ${statuses.map(
                  (s) => html`<button
                    data-action="status"
                    data-kind="${d.kind}"
                    data-id="${record.id}"
                    data-status="${s}"
                    aria-pressed="${String(record.status === s)}"
                  >
                    ${s}
                  </button>`,
                )}
              </div>`
          : ""}
        ${note ? html`<div class="eyebrow section-label">${d.kind === "bookings" ? "Message" : "Question"}</div><blockquote class="note">${note}</blockquote>` : ""}
        <div class="eyebrow section-label">Details</div>
        ${details}
      </div>
    </aside>
  `);
}

async function changeStatus(kind, id, status) {
  const record = state.data[kind].find((r) => r.id === Number(id));
  if (!record || record.status === status) return;
  const previous = record.status;
  record.status = status;
  refreshViews();
  document.querySelector(`.status-switch [data-status="${status}"]`)?.focus();
  const { ok, data } = await api(`/api/${kind}/${id}`, { method: "PATCH", body: { status } });
  if (!ok) {
    record.status = previous;
    refreshViews();
    return toast(data.error || "Couldn't save the status.", "error");
  }
  toast(`Marked as ${status}.`);
}

/* ═══════════════════════════ CSV ═══════════════════════════ */

const CSV = {
  bookings: [
    ["Received", (r) => fmtDateTime(r.createdAt)],
    ["Status", (r) => r.status],
    ["House", (r) => r.accommodationTitle],
    ["Preferred date", (r) => r.preferredDate],
    ["Guests", (r) => r.guests],
    ["First name", (r) => r.firstName],
    ["Last name", (r) => r.lastName],
    ["Email", (r) => r.email],
    ["Mobile", (r) => r.mobile],
    ["Message", (r) => r.message],
  ],
  callbacks: [
    ["Received", (r) => fmtDateTime(r.createdAt)],
    ["Status", (r) => r.status],
    ["First name", (r) => r.firstName],
    ["Last name", (r) => r.lastName],
    ["Email", (r) => r.email],
    ["Mobile", (r) => r.mobile],
    ["Postal code", (r) => r.postalCode],
    ["Interest", (r) => r.interest],
    ["Guests", (r) => r.guests],
    ["Timeframe", (r) => r.timeframe],
    ["Call windows", (r) => r.callWindows],
    ["Source", (r) => r.context],
    ["Question", (r) => r.question],
  ],
  subscribers: [
    ["Subscribed", (r) => fmtDateTime(r.createdAt)],
    ["Email", (r) => r.email],
    ["Consent", (r) => (r.consented ? "yes" : "no")],
  ],
  members: [
    ["Joined", (r) => fmtDateTime(r.createdAt)],
    ["First name", (r) => r.firstName],
    ["Last name", (r) => r.lastName],
    ["Email", (r) => r.email],
    ["Mobile", (r) => r.mobile],
    ["Last sign-in", (r) => (r.lastLoginAt ? fmtDateTime(r.lastLoginAt) : "")],
  ],
};

function csvCell(value) {
  let text = String(value ?? "");
  /* Pangontra sa formula injection: hindi dapat tumakbo bilang formula sa
     Excel ang pangalan o mensahe ng bisita na nagsisimula sa = + - @. */
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCsv() {
  const page = route();
  const columns = CSV[page];
  const rows = filtered(page);
  if (!rows.length) return toast("Nothing to export.", "error");
  const lines = [columns.map(([h]) => csvCell(h)).join(",")];
  for (const r of rows) lines.push(columns.map(([, get]) => csvCell(get(r))).join(","));
  /* BOM para mabasa nang tama ng Excel ang ñ at iba pang titik. */
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `camsur-${page}-${todayKey()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast(`Exported ${plural(rows.length, "row")}.`);
}

/* ═══════════════════════════ Mga event ═══════════════════════════ */

/** Muling ipinapakita ang lahat ng bahaging nakadepende sa datos. */
function refreshViews() {
  renderNav();
  if (route() === "overview") renderMain();
  else renderResults();
  if (state.drawer) renderDrawer();
}

$app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, kind, id, status, value } = target.dataset;

  if (action === "open") return openDrawer(kind, id);
  if (action === "close-drawer") return closeDrawer();
  if (action === "status") return changeStatus(kind, id, status);
  if (action === "export") return exportCsv();
  if (action === "chip") {
    state.filters[route()].status = status;
    return renderResults();
  }
  if (action === "copy") {
    await navigator.clipboard?.writeText(value).catch(() => {});
    return toast("Number copied.");
  }
  if (action === "refresh") {
    target.classList.add("spin");
    if (await sync()) refreshViews();
    target.classList.remove("spin");
    return;
  }
  if (action === "signout") {
    await api("/api/logout", { method: "POST" });
    state.admin = null;
    state.data = null;
    lastPayload = "";
    return renderAuth("login");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.drawer) return closeDrawer();
  /* Bukas din sa Enter ang hilera ng talahanayan, para sa keyboard. */
  if (event.key === "Enter" && event.target.matches("tr[data-action=open]")) {
    openDrawer(event.target.dataset.kind, event.target.dataset.id);
  }
});

$app.addEventListener("input", (event) => {
  const key = event.target.dataset.filter;
  if (!key) return;
  state.filters[route()][key] = event.target.value;
  renderResults();
});

$app.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  submitAuth(form);
});

window.addEventListener("hashchange", () => {
  if (!state.admin || !state.data) return;
  state.drawer = null;
  renderDrawer();
  renderNav();
  renderMain();
  window.scrollTo(0, 0);
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => route() === "overview" && drawChart(), 150);
});

/* Kumukuha ulit bawat 30 segundo (hindi habang nakatago ang tab), at
   ina-update ang "Synced … ago" bawat 10 segundo. */
setInterval(async () => {
  if (!state.admin || document.hidden) return;
  /* Huwag galawin ang pahina habang may tina-type sa search. */
  if (await sync()) {
    const typing = document.activeElement?.matches?.("input[data-filter]");
    if (typing) renderResults();
    else refreshViews();
  }
}, 30_000);
setInterval(renderSynced, 10_000);

/* ═══════════════════════════ Simula ═══════════════════════════ */

async function startDashboard() {
  $app.innerHTML = '<div class="loading"><img src="/mark.png" alt="Loading" /></div>';
  await sync();
  if (state.admin && state.data) renderShell();
}

(async function boot() {
  $app.innerHTML = '<div class="loading"><img src="/mark.png" alt="Loading" /></div>';
  const { ok, data } = await api("/api/session");
  if (!ok) {
    $app.innerHTML = "";
    return toast("Can't reach the admin server.", "error");
  }
  if (data.admin) {
    state.admin = data.admin;
    return startDashboard();
  }
  renderAuth(data.needsSetup ? "setup" : "login");
})();
