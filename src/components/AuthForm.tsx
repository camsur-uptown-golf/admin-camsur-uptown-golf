"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ setup, notice }: { setup: boolean; notice?: string }) {
  const router = useRouter();
  const [error, setError] = useState(notice ?? "");
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const fail = (message: string) => {
      setError(message);
      form.current?.querySelector<HTMLInputElement>("input[type=password]")?.select();
    };
    if (setup && values.password !== values.confirm) return fail("The two passwords don't match.");
    setBusy(true);
    const res = await fetch(setup ? "/api/setup" : "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (!res?.ok) {
      setBusy(false);
      return fail(body?.error || (res ? "Something went wrong." : "Can't reach the admin server. Is it still running?"));
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form ref={form} onSubmit={submit} noValidate>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {setup ? (
        <label className="field">
          <span>Your name</span>
          <input name="name" autoComplete="name" required maxLength={80} autoFocus />
        </label>
      ) : null}
      <label className="field">
        <span>Username</span>
        <input name="username" autoComplete="username" required maxLength={40} autoCapitalize="none" spellCheck={false} autoFocus={!setup} />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete={setup ? "new-password" : "current-password"} required />
        {setup ? <small className="hint">At least 10 characters, with letters and numbers.</small> : null}
      </label>
      {setup ? (
        <label className="field">
          <span>Confirm password</span>
          <input name="confirm" type="password" autoComplete="new-password" required />
        </label>
      ) : null}
      <button className="btn-primary" type="submit" disabled={busy}>
        {setup ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
