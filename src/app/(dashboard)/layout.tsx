import { redirect } from "next/navigation";
import DashboardProvider from "@/components/DashboardProvider";
import Drawer from "@/components/Drawer";
import Sidebar from "@/components/Sidebar";
import Toast from "@/components/Toast";
import { currentAdmin } from "@/lib/session";
import { dashboardData } from "@/lib/site-db";

/** Lahat ng pahina sa loob nito ay para lang sa naka-login na admin. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) redirect("/login");

  return (
    <DashboardProvider admin={admin} initialData={await dashboardData()}>
      <div className="shell">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
      <Drawer />
      <Toast />
    </DashboardProvider>
  );
}
