import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { Icon } from "@/components/icons";
import { SESSION_HOURS, adminCount } from "@/lib/auth";
import { currentAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ ended?: string }> }) {
  if (await currentAdmin()) redirect("/");
  const setup = (await adminCount()) === 0;
  const { ended } = await searchParams;

  return (
    <div className="auth">
      <section className="auth-visual">
        <div className="auth-brand">
          <Image src="/mark.png" alt="" width={44} height={44} priority />
          <span>
            CamSur Uptown Golf <small> Est. 2026</small>
          </span>
        </div>
        <div className="auth-headline">
          <div className="eyebrow rule">Bookings · Enquiries · Members</div>
          <h1>The Clubhouse Office</h1>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <Image className="mark" src="/mark.png" alt="CamSur Uptown Golf Club" width={64} height={64} />
          <div className="eyebrow">{setup ? "First-time setup" : "Staff only"}</div>
          <h2>{setup ? "Create the first admin" : "Sign in"}</h2>
          <p className="lede">
            {setup
              ? "No admin account exists yet. The account you create here can open the dashboard."
              : "Use your admin username and password."}
          </p>
          <AuthForm setup={setup} notice={ended ? "Your session ended. Please sign in again." : undefined} />
          <p className="auth-foot">
            <Icon.lock size={14} /> Staff only. Sessions end after {SESSION_HOURS} hours.
          </p>
        </div>
      </section>
    </div>
  );
}
