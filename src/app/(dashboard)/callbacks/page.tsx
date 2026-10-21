import type { Metadata } from "next";
import ListView from "@/components/ListView";

export const metadata: Metadata = { title: "Call-backs" };

export default function CallbacksPage() {
  return <ListView kind="callbacks" />;
}
