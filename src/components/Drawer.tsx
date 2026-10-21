"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { useDashboard } from "./DashboardProvider";
import { Icon } from "./icons";
import { StatusPill } from "./ui";
import { LONG_DAY, fmtDateTime, fmtDay, fmtTime, fullName, peso, plural, teeLabel, telHref } from "@/lib/format";
import { STATUSES, type EditableKind } from "@/lib/types";

type Detail = [string, ReactNode];

function Details({ rows }: { rows: Detail[] }) {
  return (
    <dl className="details">
      {rows
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => (
          <Fragment key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </Fragment>
        ))}
    </dl>
  );
}

const lines = (items: string[]) =>
  items.map((item, i) => (
    <Fragment key={i}>
      {i ? <br /> : null}
      {item}
    </Fragment>
  ));

export default function Drawer() {
  const { data, drawer, openDrawer, changeStatus, showToast } = useDashboard();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const isOpen = Boolean(drawer);

  useEffect(() => {
    if (!isOpen) return;
    returnFocus.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openDrawer(null);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (returnFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen, openDrawer]);

  if (!drawer) return null;
  const record = data[drawer.kind].find((r) => r.id === drawer.id);
  if (!record) return null;

  let eyebrow: string;
  let subtitle: string;
  let details: Detail[];
  let note: { label: string; text: string } | null = null;
  let editable: EditableKind | null = null;

  if ("code" in record) {
    eyebrow = `Tee time · ${record.code}`;
    subtitle = `${fmtDay(record.date, LONG_DAY)} · ${fmtTime(record.time)} · ${teeLabel(record)}`;
    details = [
      ["Date", fmtDay(record.date, LONG_DAY)],
      ["Tee time", fmtTime(record.time)],
      ["Starting tee", `Tee ${record.tee}`],
      ["Holes", record.holes],
      ["Players", lines(record.playerNames.map((n, i) => `${i + 1}. ${n}`))],
      ["Add-ons", record.addons.length ? lines(record.addons.map((a) => `${a.name} × ${a.qty}`)) : null],
      ["Villa night", record.villa],
      ["Total", peso(record.amountTotal)],
      ["Deposit", peso(record.amountDeposit)],
      ["Balance", peso(record.amountTotal - record.amountDeposit)],
      ["Paid", record.paidAt ? fmtDateTime(record.paidAt) : "Not yet"],
      ["Payment ref", record.paymentRef],
      ["Member", record.memberId ? `#${record.memberId}` : null],
      ["Email", record.email],
      ["Mobile", record.mobile],
      ["Booked", fmtDateTime(record.createdAt)],
    ];
  } else if ("accommodationTitle" in record) {
    editable = "bookings";
    eyebrow = `Booking request · #${record.id}`;
    subtitle = `${record.accommodationTitle} · ${fmtDay(record.preferredDate, LONG_DAY)}`;
    details = [
      ["House", record.accommodationTitle],
      ["Preferred date", fmtDay(record.preferredDate, LONG_DAY)],
      ["Guests", record.guests],
      ["Email", record.email],
      ["Mobile", record.mobile],
      ["Received", fmtDateTime(record.createdAt)],
    ];
    if (record.message) note = { label: "Message", text: record.message };
  } else if ("interest" in record) {
    editable = "callbacks";
    eyebrow = `Call-back request · #${record.id}`;
    subtitle = `${record.interest} · ${plural(record.guests, "guest")}`;
    details = [
      ["Interest", record.interest],
      ["Guests", record.guests],
      ["Timeframe", record.timeframe],
      ["Call between", `${record.callWindows} (PH time)`],
      ["Email", record.email],
      ["Mobile", record.mobile],
      ["Postal code", record.postalCode],
      ["Source", record.context],
      ["Received", fmtDateTime(record.createdAt)],
    ];
    if (record.question) note = { label: "Question", text: record.question };
  } else {
    eyebrow = `Member · #${record.id}`;
    subtitle = record.email;
    details = [
      ["Email", record.email],
      ["Mobile", record.mobile],
      ["Joined", fmtDateTime(record.createdAt)],
      ["Last sign-in", record.lastLoginAt ? fmtDateTime(record.lastLoginAt) : "Never"],
    ];
  }

  const mobile = record.mobile;
  const close = () => openDrawer(null);

  return (
    <>
      <div className="scrim" onClick={close} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-head">
          <div className="eyebrow">{eyebrow}</div>
          <h2 id="drawer-title">{fullName(record)}</h2>
          <p>{subtitle}</p>
          <button ref={closeRef} className="drawer-close" onClick={close} aria-label="Close">
            <Icon.close size={16} />
          </button>
        </header>
        <div className="drawer-body">
          <div className="contact-row">
            <a className="btn-ghost" href={`mailto:${record.email}`}>
              <Icon.subscribers size={14} /> Email
            </a>
            {mobile ? (
              <>
                <a className="btn-ghost" href={telHref(mobile)}>
                  <Icon.callbacks size={14} /> Call
                </a>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(mobile).catch(() => {});
                    showToast("Number copied.");
                  }}
                >
                  <Icon.copy size={14} /> Copy number
                </button>
              </>
            ) : null}
          </div>

          {editable ? (
            <>
              <div className="eyebrow section-label">Status</div>
              <div className="status-switch" role="group" aria-label="Status">
                {STATUSES[editable].map((s) => (
                  <button
                    key={s}
                    aria-pressed={"status" in record && record.status === s}
                    onClick={() => changeStatus(editable, record.id, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : "code" in record ? (
            <>
              <div className="eyebrow section-label">Status</div>
              <StatusPill status={record.status} />
            </>
          ) : null}

          {note ? (
            <>
              <div className="eyebrow section-label">{note.label}</div>
              <blockquote className="note">{note.text}</blockquote>
            </>
          ) : null}

          <div className="eyebrow section-label">Details</div>
          <Details rows={details} />
        </div>
      </aside>
    </>
  );
}
