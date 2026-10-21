"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Admin, DashboardData, EditableKind, ListKind } from "@/lib/types";

/**
 * Isang beses kinukuha ang lahat ng datos (`/api/data`) at dito na sa browser
 * sinasala, hinahanap at binibilang; sapat ito dahil daan-daan lang ang hilera.
 * Inuulit ang pagkuha bawat 30 segundo kaya lumalabas ang bagong pasa nang
 * hindi nire-refresh ang pahina.
 */

export type Filters = { q: string; status: string; house: string; when: string };
export type DrawerTarget = { kind: Exclude<ListKind, "subscribers">; id: number } | null;
type Toast = { message: string; kind: "" | "error"; key: number } | null;

type Dashboard = {
  admin: Admin;
  data: DashboardData;
  lastSync: Date | null;
  syncFailed: boolean;
  refresh: () => Promise<void>;
  changeStatus: (kind: EditableKind, id: number, status: string) => Promise<void>;
  filters: Record<ListKind, Filters>;
  setFilter: (kind: ListKind, key: keyof Filters, value: string) => void;
  drawer: DrawerTarget;
  openDrawer: (target: DrawerTarget) => void;
  toast: Toast;
  showToast: (message: string, kind?: "" | "error") => void;
  signOut: () => Promise<void>;
};

const Context = createContext<Dashboard | null>(null);

export function useDashboard(): Dashboard {
  const value = useContext(Context);
  if (!value) throw new Error("useDashboard needs <DashboardProvider>");
  return value;
}

const blankFilters = (when = ""): Filters => ({ q: "", status: "all", house: "all", when });

export default function DashboardProvider({
  admin,
  initialData,
  children,
}: {
  admin: Admin;
  initialData: DashboardData;
  children: ReactNode;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const [drawer, setDrawer] = useState<DrawerTarget>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [filters, setFilters] = useState<Record<ListKind, Filters>>({
    teetimes: blankFilters("upcoming"),
    bookings: blankFilters(),
    callbacks: blankFilters(),
    subscribers: blankFilters(),
    members: blankFilters(),
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string, kind: "" | "error" = "") => {
    setToast({ message, kind, key: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?ended=1");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as DashboardData);
      setSyncFailed(false);
      setLastSync(new Date());
    } catch {
      setSyncFailed(true);
    }
  }, [router]);

  /* Kumukuha ulit bawat 30 segundo, maliban kung nakatago ang tab. */
  useEffect(() => {
    setLastSync(new Date());
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const changeStatus = useCallback(
    async (kind: EditableKind, id: number, status: string) => {
      const record = data[kind].find((r) => r.id === id);
      if (!record || record.status === status) return;
      const previous = record.status;
      const apply = (value: string) =>
        setData((d) => ({ ...d, [kind]: d[kind].map((r) => (r.id === id ? { ...r, status: value } : r)) }));
      apply(status);
      const res = await fetch(`/api/${kind}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).catch(() => null);
      if (!res?.ok) {
        apply(previous);
        const body = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
        showToast(body?.error || "Couldn't save the status.", "error");
        return;
      }
      showToast(`Marked as ${status}.`);
    },
    [data, showToast],
  );

  const setFilter = useCallback((kind: ListKind, key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [kind]: { ...f[kind], [key]: value } }));
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }, [router]);

  const value = useMemo<Dashboard>(
    () => ({
      admin,
      data,
      lastSync,
      syncFailed,
      refresh,
      changeStatus,
      filters,
      setFilter,
      drawer,
      openDrawer: setDrawer,
      toast,
      showToast,
      signOut,
    }),
    [admin, data, lastSync, syncFailed, refresh, changeStatus, filters, setFilter, drawer, toast, showToast, signOut],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
