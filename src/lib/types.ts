/** Mga hugis ng datos na pinagsasaluhan ng server (lib/site-db) at ng browser. */

export type BookingStatus = "new" | "contacted" | "confirmed" | "closed";
export type CallbackStatus = "new" | "contacted" | "closed";
export type TeeStatus = "confirmed" | "held" | "expired" | "cancelled";

export type TeeTime = {
  id: number;
  code: string;
  createdAt: string;
  date: string;
  tee: number;
  time: string;
  holes: number;
  players: number;
  playerNames: string[];
  contactName: string;
  email: string;
  mobile: string;
  memberId: number | null;
  addons: { name: string; qty: number }[];
  villa: string | null;
  amountTotal: number;
  amountDeposit: number;
  status: TeeStatus;
  holdExpiresAt: string;
  paymentRef: string | null;
  paidAt: string | null;
};

export type Booking = {
  id: number;
  createdAt: string;
  accommodationSlug: string;
  accommodationTitle: string;
  preferredDate: string;
  guests: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  message: string | null;
  status: BookingStatus;
};

export type Callback = {
  id: number;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  postalCode: string | null;
  interest: string;
  guests: number;
  timeframe: string;
  callWindows: string;
  question: string | null;
  context: string | null;
  status: CallbackStatus;
};

export type Subscriber = { id: number; createdAt: string; email: string; consented: boolean };

export type Member = {
  id: number;
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile: string | null;
  lastLoginAt: string | null;
};

export type DashboardData = {
  teetimes: TeeTime[];
  bookings: Booking[];
  callbacks: Callback[];
  subscribers: Subscriber[];
  members: Member[];
};

export type ListKind = keyof DashboardData;
/** Mga uri na may status na puwedeng palitan ng admin. */
export type EditableKind = "bookings" | "callbacks";

export type Admin = { id: number; username: string; name: string; lastLoginAt: string | null };

export const STATUSES = {
  bookings: ["new", "contacted", "confirmed", "closed"],
  callbacks: ["new", "contacted", "closed"],
} as const satisfies Record<EditableKind, readonly string[]>;

/** Mga status na pansala lang (ang site ang nagtatakda ng status ng tee time). */
export const FILTER_STATUSES: Partial<Record<ListKind, readonly string[]>> = {
  ...STATUSES,
  teetimes: ["confirmed", "held", "expired", "cancelled"],
};
