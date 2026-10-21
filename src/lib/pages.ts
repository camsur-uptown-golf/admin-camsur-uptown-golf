import type { ListKind } from "./types.ts";

/** Mga pahina ng dashboard — susi, URL at pamagat. */
export const LIST_PAGES: Record<ListKind, { href: string; title: string }> = {
  teetimes: { href: "/tee-times", title: "Tee times" },
  bookings: { href: "/bookings", title: "Bookings" },
  callbacks: { href: "/callbacks", title: "Call-backs" },
  subscribers: { href: "/newsletter", title: "Newsletter" },
  members: { href: "/members", title: "Members" },
};
