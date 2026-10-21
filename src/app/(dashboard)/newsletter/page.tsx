import type { Metadata } from "next";
import ListView from "@/components/ListView";

export const metadata: Metadata = { title: "Newsletter" };

export default function NewsletterPage() {
  return <ListView kind="subscribers" />;
}
