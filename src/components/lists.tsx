import type { ReactNode } from "react";
import { StatusPill } from "./ui";
import { SHORT_DAY, fmtDate, fmtDateTime, fmtDay, fmtTime, fullName, peso, plural, relative, teeLabel, todayKey } from "@/lib/format";
import type { DashboardData, ListKind } from "@/lib/types";

/** Kung paano ipinapakita, hinahanap at ini-export ang bawat uri ng listahan. */

export type RowOf<K extends ListKind> = DashboardData[K][number];
export type AnyRow = RowOf<ListKind>;

type Config<R> = {
  empty: string;
  placeholder: string;
  head: string[];
  cells: (r: R) => ReactNode;
  search: (r: R) => (string | null | undefined)[];
  csv: [string, (r: R) => string | number | null | undefined][];
};

const define = <K extends ListKind>(config: Config<RowOf<K>>) => config as unknown as Config<AnyRow>;

function Received({ at }: { at: string }) {
  return (
    <td className="nowrap">
      <span className="primary">{relative(at)}</span>
      <span className="secondary">{fmtDate(at)}</span>
    </td>
  );
}

function Two({ primary, secondary, className }: { primary: ReactNode; secondary: ReactNode; className?: string }) {
  return (
    <td className={className}>
      <span className="primary">{primary}</span>
      <span className="secondary">{secondary}</span>
    </td>
  );
}

export const extrasLabel = (r: RowOf<"teetimes">) =>
  [...r.addons.map((a) => `${a.name} × ${a.qty}`), ...(r.villa ? [`${r.villa} · 1 night`] : [])].join(", ");

export const LISTS: Record<ListKind, Config<AnyRow>> = {
  teetimes: define<"teetimes">({
    empty: "No tee times yet",
    placeholder: "Search name, player, code or mobile",
    head: ["Tee time", "Booked by", "Players", "Add-ons", "Total", "Status"],
    cells: (r) => (
      <>
        <Two className="nowrap" primary={`${fmtDay(r.date, SHORT_DAY)} · ${fmtTime(r.time)}`} secondary={teeLabel(r)} />
        <Two primary={r.contactName} secondary={r.code} />
        <Two primary={r.players} secondary={r.playerNames.join(", ")} />
        <td>{extrasLabel(r) || "—"}</td>
        <Two className="num nowrap" primary={peso(r.amountTotal)} secondary={`${peso(r.amountDeposit)} deposit`} />
        <td>
          <StatusPill status={r.status} />
        </td>
      </>
    ),
    search: (r) => [r.code, r.contactName, r.email, r.mobile, ...r.playerNames],
    csv: [
      ["Code", (r) => r.code],
      ["Date", (r) => r.date],
      ["Time", (r) => r.time],
      ["Tee", (r) => r.tee],
      ["Holes", (r) => r.holes],
      ["Players", (r) => r.players],
      ["Player names", (r) => r.playerNames.join("; ")],
      ["Booked by", (r) => r.contactName],
      ["Email", (r) => r.email],
      ["Mobile", (r) => r.mobile],
      ["Add-ons", (r) => r.addons.map((a) => `${a.name} x ${a.qty}`).join("; ")],
      ["Villa night", (r) => r.villa],
      ["Total (PHP)", (r) => r.amountTotal],
      ["Deposit (PHP)", (r) => r.amountDeposit],
      ["Status", (r) => r.status],
      ["Paid", (r) => (r.paidAt ? fmtDateTime(r.paidAt) : "")],
      ["Payment ref", (r) => r.paymentRef],
      ["Booked", (r) => fmtDateTime(r.createdAt)],
    ],
  }),
  bookings: define<"bookings">({
    empty: "No bookings yet",
    placeholder: "Search name, email or mobile",
    head: ["Received", "Guest", "House", "Preferred date", "Guests", "Status"],
    cells: (r) => (
      <>
        <Received at={r.createdAt} />
        <Two primary={fullName(r)} secondary={r.email} />
        <td>{r.accommodationTitle}</td>
        <Two className="nowrap" primary={fmtDay(r.preferredDate, SHORT_DAY)} secondary={fmtDay(r.preferredDate, { weekday: "long" })} />
        <td className="num">{r.guests}</td>
        <td>
          <StatusPill status={r.status} />
        </td>
      </>
    ),
    search: (r) => [fullName(r), r.email, r.mobile, r.accommodationTitle, r.message],
    csv: [
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
  }),
  callbacks: define<"callbacks">({
    empty: "No call-backs yet",
    placeholder: "Search name, email or mobile",
    head: ["Received", "Name", "Interest", "Best time to call", "Source", "Status"],
    cells: (r) => (
      <>
        <Received at={r.createdAt} />
        <Two primary={fullName(r)} secondary={r.mobile} />
        <Two primary={r.interest} secondary={`${plural(r.guests, "guest")} · ${r.timeframe}`} />
        <td>{r.callWindows}</td>
        <td>{r.context || "—"}</td>
        <td>
          <StatusPill status={r.status} />
        </td>
      </>
    ),
    search: (r) => [fullName(r), r.email, r.mobile, r.interest, r.context, r.question],
    csv: [
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
  }),
  subscribers: define<"subscribers">({
    empty: "No subscribers yet",
    placeholder: "Search email",
    head: ["Subscribed", "Email", "Consent"],
    cells: (r) => (
      <>
        <Received at={r.createdAt} />
        <td>
          <a href={`mailto:${r.email}`}>{r.email}</a>
        </td>
        <td>{r.consented ? "Given" : "—"}</td>
      </>
    ),
    search: (r) => [r.email],
    csv: [
      ["Subscribed", (r) => fmtDateTime(r.createdAt)],
      ["Email", (r) => r.email],
      ["Consent", (r) => (r.consented ? "yes" : "no")],
    ],
  }),
  members: define<"members">({
    empty: "No members yet",
    placeholder: "Search name, email or mobile",
    head: ["Joined", "Member", "Mobile", "Last sign-in"],
    cells: (r) => (
      <>
        <Received at={r.createdAt} />
        <Two primary={fullName(r)} secondary={r.email} />
        <td>{r.mobile || "—"}</td>
        <td>{r.lastLoginAt ? relative(r.lastLoginAt) : "Never"}</td>
      </>
    ),
    search: (r) => [fullName(r), r.email, r.mobile],
    csv: [
      ["Joined", (r) => fmtDateTime(r.createdAt)],
      ["First name", (r) => r.firstName],
      ["Last name", (r) => r.lastName],
      ["Email", (r) => r.email],
      ["Mobile", (r) => r.mobile],
      ["Last sign-in", (r) => (r.lastLoginAt ? fmtDateTime(r.lastLoginAt) : "")],
    ],
  }),
};

export function matchesWhen(date: string, when: string): boolean {
  const today = todayKey();
  if (when === "upcoming") return date >= today;
  if (when === "today") return date === today;
  if (when === "past") return date < today;
  return true;
}

function csvCell(value: unknown): string {
  let text = String(value ?? "");
  /* Pangontra sa formula injection: hindi dapat tumakbo bilang formula sa
     Excel ang pangalan o mensahe ng bisita na nagsisimula sa = + - @. */
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Ini-download ang mga hilera bilang CSV. */
export function downloadCsv(kind: ListKind, rows: AnyRow[]) {
  const columns = LISTS[kind].csv;
  const lines = [columns.map(([h]) => csvCell(h)).join(",")];
  for (const r of rows) lines.push(columns.map(([, get]) => csvCell(get(r))).join(","));
  /* BOM para mabasa nang tama ng Excel ang ñ at iba pang titik. */
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `camsur-${kind}-${todayKey()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
