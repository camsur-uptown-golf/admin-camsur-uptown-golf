"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./DashboardProvider";
import { Icon } from "./icons";
import { relative } from "@/lib/format";

export default function Topbar({ title }: { title: string }) {
  const { lastSync, syncFailed, refresh } = useDashboard();
  const [spinning, setSpinning] = useState(false);
  /* Ina-update ang "Synced … ago" bawat 10 segundo. */
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  const label = syncFailed ? "Offline — retrying" : lastSync ? `Synced ${relative(lastSync.toISOString())}` : "Syncing…";

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
      </div>
      <div className={`live ${syncFailed ? "stale" : ""}`}>
        <span className="live-dot" aria-hidden="true" />
        <span>{label}</span>
        <button
          className={`btn-ghost ${spinning ? "spin" : ""}`}
          aria-label="Refresh now"
          onClick={async () => {
            setSpinning(true);
            await refresh();
            setSpinning(false);
          }}
        >
          <Icon.refresh size={14} /> Refresh
        </button>
      </div>
    </header>
  );
}
