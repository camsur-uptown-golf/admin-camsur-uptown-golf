/** Mga format na ginagamit ng UI — oras ng Pilipinas ang batayan. */

export const TZ = "Asia/Manila";

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
const pesoFmt = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

/** "YYYY-MM-DD" sa oras ng Pilipinas. */
export const dayKey = (date: Date) => dayKeyFmt.format(date);
export const todayKey = () => dayKey(new Date());

export const fmtDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");
export const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "—");
export const peso = (amount: number | null | undefined) => pesoFmt.format(amount ?? 0);

/* Petsa lang ang "YYYY-MM-DD" (walang oras), kaya binubuo bilang tanghali
   UTC para hindi lumipat ng araw sa anumang timezone. */
const fromDayKey = (key: string) => new Date(`${key}T12:00:00Z`);
export const fmtDay = (key: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", ...options }).format(fromDayKey(key));
export const LONG_DAY: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
export const SHORT_DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

/** "13:40" → "1:40 PM" */
export function fmtTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function relative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  if (seconds < 7 * 86_400) return `${Math.round(seconds / 86_400)} d ago`;
  return fmtDate(iso);
}

type Named = { contactName?: string; firstName?: string; lastName?: string };
export const fullName = (r: Named) => r.contactName || `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—";

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
export const withinDays = (iso: string, days: number) => Date.now() - new Date(iso).getTime() < days * 86_400_000;
export const telHref = (mobile: string) => `tel:${mobile.replace(/[^\d+]/g, "")}`;
export const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export const teeLabel = (r: { tee: number; holes: number }) => `Tee ${r.tee} · ${r.holes} holes`;
/* Tee times: pinakamalapit muna. */
export const teeOrder = (a: { date: string; time: string }, b: { date: string; time: string }) =>
  `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
