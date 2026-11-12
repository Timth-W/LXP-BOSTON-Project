"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/AuthFrame";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/i18n";
import { login } from "@/lib/actions";
import { hashPassword, isValidEmail } from "@/lib/auth";
import { HOME_BY_ROLE } from "@/lib/constants";
import { useStore } from "@/lib/store";

/** Only internal paths are accepted after login (protection against open redirects). */
function safeNext(): string | null {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export default function LoginPage() {
  const { run } = useStore();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) return setError(t.auth.errors.email);
    if (!password) return setError(t.auth.errors.credentials);
    setBusy(true);
    const hash = await hashPassword(email, password);
    const result = run((s) => login(s, email, hash));
    setBusy(false);
    if (!result.ok) return setError(t.auth.errors.credentials);
    const next = safeNext();
    const home = HOME_BY_ROLE[result.user.role];
    router.push(next && (next.startsWith(home) || next === "/notifications") ? next : home);
  }

  return (
    <AuthFrame>
      <div className="card stack-lg" style={{ gap: 22 }}>
        <div className="stack-sm">
          <h1>{t.auth.loginTitle}</h1>
          <p className="muted">{t.auth.loginLead}</p>
        </div>
        <form className="form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="login-email">{t.auth.email}</label>
            <input
              id="login-email"
              className="input"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              aria-invalid={Boolean(error)}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">{t.auth.password}</label>
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              aria-invalid={Boolean(error)}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
            />
          </div>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="btn btn-block" type="submit" disabled={busy}>
            {t.auth.loginSubmit}
          </button>
        </form>
        <div className="notice notice-navy small">
          <Icon name="sparkle" size={20} />
          <p>
            {t.auth.demoHint} <Link href="/#demo">{t.landing.demoTitle}</Link>
          </p>
        </div>
        <p className="center">
          {t.auth.noAccount} <Link href="/signup">{t.landing.signup}</Link>
        </p>
      </div>
    </AuthFrame>
  );
}
