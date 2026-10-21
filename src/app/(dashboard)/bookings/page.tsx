import type { Metadata } from "next";
import ListView from "@/components/ListView";

export const metadata: Metadata = { title: "Bookings" };

export default function BookingsPage() {
  return <ListView kind="bookings" />;
}
