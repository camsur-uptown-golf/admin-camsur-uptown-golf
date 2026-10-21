import type { Metadata } from "next";
import ListView from "@/components/ListView";

export const metadata: Metadata = { title: "Members" };

export default function MembersPage() {
  return <ListView kind="members" />;
}
