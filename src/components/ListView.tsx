"use client";

import { useDashboard } from "./DashboardProvider";
import { Icon } from "./icons";
import { LISTS, downloadCsv, matchesWhen, type AnyRow } from "./lists";
import { EmptyState } from "./ui";
import Topbar from "./Topbar";
import { capitalize, plural, teeOrder } from "@/lib/format";
import { LIST_PAGES } from "@/lib/pages";
import { FILTER_STATUSES, type ListKind } from "@/lib/types";

const WHEN_OPTIONS = [
  ["upcoming", "Upcoming"],
  ["today", "Today"],
  ["past", "Past"],
  ["all", "All dates"],
] as const;

export default function ListView({ kind }: { kind: ListKind }) {
  const { data, filters, setFilter, openDrawer, showToast } = useDashboard();
  const f = filters[kind];
  const list = LISTS[kind];
  const all = data[kind] as AnyRow[];
  const statuses = FILTER_STATUSES[kind];

  const q = f.q.trim().toLowerCase();
  const matching = all.filter((r) => {
    if ("accommodationTitle" in r && f.house !== "all" && r.accommodationTitle !== f.house) return false;
    if ("code" in r && !matchesWhen(r.date, f.when)) return false;
    if (!q) return true;
    return list.search(r).some((v) => v && String(v).toLowerCase().includes(q));
  });
  const rows = matching.filter((r) => f.status === "all" || !("status" in r) || r.status === f.status);
  if (kind === "teetimes") {
    (rows as { date: string; time: string }[]).sort(teeOrder);
    if (f.when === "past" || f.when === "all") rows.reverse();
  }

  const houses = kind === "bookings" ? [...new Set(data.bookings.map((b) => b.accommodationTitle))].sort() : [];
  const clickable = kind !== "subscribers";

  return (
    <>
      <Topbar title={LIST_PAGES[kind].title} />
      <section className="card">
        <div className="toolbar">
          <label className="search">
            <span className="sr-only">Search</span>
            <Icon.search size={16} />
            <input type="search" value={f.q} placeholder={list.placeholder} onChange={(e) => setFilter(kind, "q", e.target.value)} />
          </label>
          {statuses ? (
            <div className="chips">
              {["all", ...statuses].map((s) => {
                const count = s === "all" ? matching.length : matching.filter((r) => "status" in r && r.status === s).length;
                return (
                  <button key={s} className="chip" aria-pressed={f.status === s} onClick={() => setFilter(kind, "status", s)}>
                    {s === "all" ? "All" : capitalize(s)} <em>{count}</em>
                  </button>
                );
              })}
            </div>
          ) : null}
          {kind === "teetimes" ? (
            <label>
              <span className="sr-only">When</span>
              <select className="select" value={f.when} onChange={(e) => setFilter(kind, "when", e.target.value)}>
                {WHEN_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {houses.length > 1 ? (
            <label>
              <span className="sr-only">House</span>
              <select className="select" value={f.house} onChange={(e) => setFilter(kind, "house", e.target.value)}>
                <option value="all">All houses</option>
                {houses.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <span className="spacer" />
          <button
            className="btn-ghost"
            onClick={() => {
              if (!rows.length) return showToast("Nothing to export.", "error");
              downloadCsv(kind, rows);
              showToast(`Exported ${plural(rows.length, "row")}.`);
            }}
          >
            <Icon.download size={14} /> Export CSV
          </button>
        </div>

        {!all.length ? (
          <EmptyState title={list.empty} />
        ) : !rows.length ? (
          <EmptyState title="No matches" />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {list.head.map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const open = () => kind !== "subscribers" && openDrawer({ kind, id: r.id });
                    return (
                      <tr
                        key={r.id}
                        className={`${clickable ? "clickable" : ""} ${"status" in r && r.status === "new" ? "is-new" : ""}`}
                        tabIndex={clickable ? 0 : undefined}
                        onClick={clickable ? open : undefined}
                        onKeyDown={clickable ? (e) => e.key === "Enter" && open() : undefined}
                      >
                        {list.cells(r)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="list-foot">
              Showing {rows.length} of {all.length}
            </div>
          </>
        )}
      </section>
    </>
  );
}
