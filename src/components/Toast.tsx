"use client";

import { useDashboard } from "./DashboardProvider";

export default function Toast() {
  const { toast } = useDashboard();
  return (
    <div id="toast" role="status" className={toast?.kind ?? ""} hidden={!toast}>
      {toast?.message}
    </div>
  );
}
