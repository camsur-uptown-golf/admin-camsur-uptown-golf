"use client";

import { useEffect, useRef, useState } from "react";
import { useDashboard } from "./DashboardProvider";
import { dayKey, fmtDay } from "@/lib/format";

/* Stacked bars, booking + call-back bawat araw sa nakaraang 30 araw. */

const SERIES = [
  { key: "bookings", label: "Bookings" },
  { key: "callbacks", label: "Call-backs" },
] as const;

type Day = { key: string; bookings: number; callbacks: number };

/* Parihaba na bilugan lang ang itaas — nakaangkla sa baseline ang ibaba. */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function Swatch({ series }: { series: string }) {
  return <i style={{ background: `var(--series-${series})` }} />;
}

export default function RequestsChart() {
  const { data } = useDashboard();
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  const days: Day[] = [];
  for (let i = 29; i >= 0; i -= 1) days.push({ key: dayKey(new Date(Date.now() - i * 86_400_000)), bookings: 0, callbacks: 0 });
  const index = new Map(days.map((d) => [d.key, d]));
  for (const s of SERIES) {
    for (const row of data[s.key]) {
      const day = index.get(dayKey(new Date(row.createdAt)));
      if (day) day[s.key] += 1;
    }
  }
  const totals = { bookings: days.reduce((n, d) => n + d.bookings, 0), callbacks: days.reduce((n, d) => n + d.callbacks, 0) };

  const w = Math.max(width, 280);
  const height = 210;
  const m = { top: 10, right: 4, bottom: 24, left: 26 };
  const innerW = w - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const maxTotal = Math.max(...days.map((d) => d.bookings + d.callbacks));
  const yMax = Math.max(4, Math.ceil(maxTotal / 2) * 2);
  const band = innerW / days.length;
  const barW = Math.max(3, Math.min(18, band * 0.62));
  const y = (v: number) => (v / yMax) * innerH;
  const base = m.top + innerH;
  const summary = `Requests over the last 30 days: ${totals.bookings} bookings and ${totals.callbacks} call-backs.`;
  const hovered = hover === null ? null : days[hover];

  return (
    <>
      <div className="legend">
        {SERIES.map((s) => (
          <span key={s.key}>
            <Swatch series={s.key} /> {s.label} <b>{totals[s.key]}</b>
          </span>
        ))}
      </div>
      <div className="chart" ref={host} onMouseLeave={() => setHover(null)}>
        {width ? (
          <svg width={w} height={height} role="img" aria-label={summary}>
            <g className="grid axis">
              {[0, yMax / 2, yMax].map((v) => {
                const gy = m.top + innerH - y(v);
                return (
                  <g key={v}>
                    <line x1={m.left} x2={w - m.right} y1={gy} y2={gy} />
                    <text x={m.left - 8} y={gy + 3.5} textAnchor="end">
                      {v}
                    </text>
                  </g>
                );
              })}
            </g>
            <g>
              {days.map((d, i) => (
                <rect
                  key={d.key}
                  className={`hit ${hover === i ? "on" : ""}`}
                  x={m.left + band * i}
                  y={m.top}
                  width={band}
                  height={innerH}
                  rx={4}
                  onMouseEnter={() => setHover(i)}
                />
              ))}
            </g>
            <g pointerEvents="none">
              {days.map((d, i) => {
                const x = m.left + band * i + band / 2 - barW / 2;
                const hb = y(d.bookings);
                const hc = y(d.callbacks);
                /* 2px na puwang sa pagitan ng dalawang bahagi ng iisang bar. */
                const gap = hb > 0 && hc > 0 ? 2 : 0;
                const h = Math.max(hc - gap, 1);
                return (
                  <g key={d.key}>
                    {hb > 0 ? (
                      hc > 0 ? (
                        <rect x={x} y={base - hb} width={barW} height={hb} className="s-bookings" />
                      ) : (
                        <path d={topRounded(x, base - hb, barW, hb, 4)} className="s-bookings" />
                      )
                    ) : null}
                    {hc > 0 ? <path d={topRounded(x, base - hb - gap - h, barW, h, 4)} className="s-callbacks" /> : null}
                  </g>
                );
              })}
            </g>
            <g className="axis">
              {days.map((d, i) =>
                (days.length - 1 - i) % 7 === 0 ? (
                  <text key={d.key} x={m.left + band * i + band / 2} y={height - 6} textAnchor="middle">
                    {fmtDay(d.key, { day: "numeric", month: "short" })}
                  </text>
                ) : null,
              )}
            </g>
          </svg>
        ) : null}
        {hovered && hover !== null ? (
          <div
            className="tooltip"
            style={{
              left: `${Math.min(Math.max(m.left + band * hover + band / 2, 80), w - 80)}px`,
              top: `${m.top + innerH - y(hovered.bookings + hovered.callbacks)}px`,
            }}
          >
            <strong>{fmtDay(hovered.key, { weekday: "short", day: "numeric", month: "short" })}</strong>
            {SERIES.map((s) => (
              <div key={s.key}>
                <Swatch series={s.key} /> {s.label} <b>{hovered[s.key]}</b>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
