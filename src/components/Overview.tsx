"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useDashboard, type DrawerTarget } from "./DashboardProvider";
import { Icon } from "./icons";
import RequestsChart from "./RequestsChart";
import Topbar from "./Topbar";
import { EmptyState, StatusPill } from "./ui";
import { TZ, fmtDateTime, fmtDay, fmtTime, fullName, peso, plural, relative, teeLabel, teeOrder, todayKey, withinDays } from "@/lib/format";
import { LIST_PAGES } from "@/lib/pages";
import type { ListKind } from "@/lib/types";

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Score({ kind, value, children }: { kind: ListKind; value: number; children: ReactNode }) {
  return (
    <Link className="score" href={LIST_PAGES[kind].href}>
      <div className="score-head">
        <span>{LIST_PAGES[kind].title}</span>
      </div>
      <div className="score-body">
        <div className="score-value">{value}</div>
        <div className="score-sub">{children}</div>
      </div>
    </Link>
  );
}

type FeedItem = { at: string; kind: ListKind; target: DrawerTarget; who: string; what: string; gold?: boolean };

export default function Overview() {
  const { admin, data, openDrawer } = useDashboard();
  const { teetimes, bookings, callbacks, subscribers, members } = data;
  const today = todayKey();
  const fresh = (rows: { status: string }[]) => rows.filter((r) => r.status === "new").length;
  const week = (rows: { createdAt: string }[]) => rows.filter((r) => withinDays(r.createdAt, 7)).length;
  const waiting = fresh(bookings) + fresh(callbacks);
  const activeMembers = members.filter((m) => m.lastLoginAt && withinDays(m.lastLoginAt, 30)).length;
  const nextTees = teetimes
    .filter((r) => r.date >= today && r.status === "confirmed")
    .sort(teeOrder)
    .slice(0, 8);
  const upcoming = bookings
    .filter((b) => b.preferredDate >= today && b.status !== "closed")
    .sort((a, b) => a.preferredDate.localeCompare(b.preferredDate))
    .slice(0, 6);

  const feed: FeedItem[] = [
    ...teetimes
      .filter((r) => r.status === "confirmed")
      .map((r) => ({
        at: r.createdAt,
        kind: "teetimes" as const,
        target: { kind: "teetimes" as const, id: r.id },
        who: r.contactName,
        what: `booked a tee time for ${fmtDay(r.date, { day: "numeric", month: "short" })}, ${fmtTime(r.time)} · ${plural(r.players, "player")}`,
        gold: true,
      })),
    ...bookings.map((r) => ({
      at: r.createdAt,
      kind: "bookings" as const,
      target: { kind: "bookings" as const, id: r.id },
      who: fullName(r),
      what: `asked about ${r.accommodationTitle} for ${fmtDay(r.preferredDate, { day: "numeric", month: "short" })}`,
      gold: r.status === "new",
    })),
    ...callbacks.map((r) => ({
      at: r.createdAt,
      kind: "callbacks" as const,
      target: { kind: "callbacks" as const, id: r.id },
      who: fullName(r),
      what: `wants a call about ${r.interest}${r.context ? ` · from ${r.context}` : ""}`,
      gold: r.status === "new",
    })),
    ...subscribers.map((r) => ({ at: r.createdAt, kind: "subscribers" as const, target: null, who: r.email, what: "subscribed to the newsletter" })),
    ...members.map((r) => ({
      at: r.createdAt,
      kind: "members" as const,
      target: { kind: "members" as const, id: r.id },
      who: fullName(r),
      what: "created a member account",
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return (
    <>
      <Topbar title="Overview" />

      <section className="welcome">
        <div>
          <h2>
            {greeting()}, {admin.name.split(" ")[0]}.
          </h2>
          <p>
            {waiting ? (
              <>
                <b>{plural(waiting, "request")}</b> {waiting === 1 ? "is" : "are"} waiting for a reply.
              </>
            ) : (
              "You're all caught up. No new requests waiting."
            )}
          </p>
        </div>
      </section>

      <section className="scorecard" aria-label="Totals">
        <Score kind="bookings" value={bookings.length}>
          {fresh(bookings) ? <span className="flagged">● {fresh(bookings)} new</span> : null}
          <span>
            <b>{week(bookings)}</b> this week
          </span>
        </Score>
        <Score kind="callbacks" value={callbacks.length}>
          {fresh(callbacks) ? <span className="flagged">● {fresh(callbacks)} new</span> : null}
          <span>
            <b>{week(callbacks)}</b> this week
          </span>
        </Score>
        <Score kind="subscribers" value={subscribers.length}>
          <span>
            <b>{week(subscribers)}</b> joined this week
          </span>
        </Score>
        <Score kind="members" value={members.length}>
          <span>
            <b>{week(members)}</b> new this week
          </span>
          <span>
            <b>{activeMembers}</b> active
          </span>
        </Score>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Upcoming tee times</h3>
          <Link className="link-more" href={LIST_PAGES.teetimes.href}>
            All tee times →
          </Link>
        </div>
        <div className="card-body">
          {nextTees.length ? (
            <ul className="tee">
              {nextTees.map((r) => (
                <li key={r.id}>
                  <button onClick={() => openDrawer({ kind: "teetimes", id: r.id })}>
                    <span className="date-chip">
                      <b>{fmtDay(r.date, { day: "numeric" })}</b>
                      <small>{fmtDay(r.date, { month: "short" })}</small>
                    </span>
                    <span className="who-line">
                      <strong>
                        {fmtTime(r.time)} · {r.contactName}
                      </strong>
                      <small>
                        {teeLabel(r)} · {plural(r.players, "player")} · {peso(r.amountTotal)}
                      </small>
                    </span>
                    <StatusPill status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No upcoming tee times" small />
          )}
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h3>Requests, last 30 days</h3>
          </div>
          <div className="card-body">
            <RequestsChart />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Upcoming bookings</h3>
            <Link className="link-more" href={LIST_PAGES.bookings.href}>
              All bookings →
            </Link>
          </div>
          <div className="card-body">
            {upcoming.length ? (
              <ul className="tee">
                {upcoming.map((b) => (
                  <li key={b.id}>
                    <button onClick={() => openDrawer({ kind: "bookings", id: b.id })}>
                      <span className="date-chip">
                        <b>{fmtDay(b.preferredDate, { day: "numeric" })}</b>
                        <small>{fmtDay(b.preferredDate, { month: "short" })}</small>
                      </span>
                      <span className="who-line">
                        <strong>{fullName(b)}</strong>
                        <small>
                          {b.accommodationTitle} · {plural(b.guests, "guest")} · {fmtDay(b.preferredDate, { weekday: "long" })}
                        </small>
                      </span>
                      <StatusPill status={b.status} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No upcoming bookings" small />
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>Latest activity</h3>
        </div>
        <div className="card-body">
          {feed.length ? (
            <ul className="feed">
              {feed.map((item, i) => {
                const FeedIcon = Icon[item.kind];
                return (
                  <li key={`${item.kind}-${item.at}-${i}`}>
                    <span className={`ico ${item.gold ? "gold" : ""}`}>
                      <FeedIcon size={16} />
                    </span>
                    <p>
                      {item.target ? <button onClick={() => openDrawer(item.target)}>{item.who}</button> : <strong>{item.who}</strong>}{" "}
                      {item.what}
                    </p>
                    <time dateTime={item.at} title={fmtDateTime(item.at)}>
                      {relative(item.at)}
                    </time>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No activity yet" small />
          )}
        </div>
      </section>
    </>
  );
}
