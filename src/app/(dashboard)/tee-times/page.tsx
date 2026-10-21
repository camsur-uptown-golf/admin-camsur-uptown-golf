import type { Metadata } from "next";
import ListView from "@/components/ListView";

export const metadata: Metadata = { title: "Tee times" };

export default function TeeTimesPage() {
  return <ListView kind="teetimes" />;
}
