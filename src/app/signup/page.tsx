"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/AuthFrame";
import { Icon } from "@/components/Icon";
import { InterestPicker, SectorPicker } from "@/components/ProfileFields";
import { useI18n } from "@/i18n";
import { signUp } from "@/lib/actions";
import { hashPassword, isValidEmail, isValidPassword } from "@/lib/auth";
import { HOME_BY_ROLE, RELATION_IDS } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { Category, Relation, Role, SectorId } from "@/lib/types";

const ROLES: { id: Role; icon: "bench" | "heart" | "users"; bg: string; fg: string }[] = [
  { id: "senior", icon: "bench", bg: "var(--sage-soft)", fg: "#2c4a35" },
  { id: "family", icon: "users", bg: "#e4ebf1", fg: "var(--navy)" },
  { id: "companion", icon: "heart", bg: "var(--coral-soft)", fg: "var(--coral-text)" },
];

type Errors = Partial<Record<"firstName" | "lastName" | "email" | "password" | "consent" | "inviteCode", string>>;

export default function SignupPage() {
  const { run } = useStore();
  const { t } = useI18n();
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sector, setSector] = useState<SectorId>("centre");
  const [interests, setInterests] = useState<Category[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [relation, setRelation] = useState<Relation>("daughter");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const clear = (key: keyof Errors) => setErrors(({ [key]: _removed, ...rest }) => rest);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!role) return;
    const errs: Errors = {};
    if (!firstName.trim()) errs.firstName = t.auth.errors.firstName;
    if (!lastName.trim()) errs.lastName = t.auth.errors.lastName;
    if (!isValidEmail(email)) errs.email = t.auth.errors.email;
    if (!isValidPassword(password)) errs.password = t.auth.errors.password;
    if (!consent) errs.consent = t.auth.errors.consent;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    const passwordHash = await hashPassword(email, password);
    const result = run((s) =>
      signUp(s, {
        role,
        email,
        passwordHash,
        firstName,
        lastName,
        sector,
        interests: role === "family" ? [] : interests,
        inviteCode: role === "family" && inviteCode.trim() ? inviteCode : undefined,
        relation,
      }),
    );
    setBusy(false);
    if (!result.ok) {
      if (result.error === "emailTaken") setErrors({ email: t.auth.errors.emailTaken });
      else if (result.error === "code") setErrors({ inviteCode: t.auth.errors.code });
      return;
    }
    router.push(HOME_BY_ROLE[role]);
  }

  if (!role) {
    return (
      <AuthFrame wide>
        <div className="stack-lg">
          <div className="stack-sm">
            <h1>{t.auth.signupTitle}</h1>
            <p className="muted">{t.auth.signupLead}</p>
          </div>
          <h2>{t.auth.chooseRole}</h2>
          <div className="role-cards">
            {ROLES.map((r) => (
              <button key={r.id} type="button" className="role-card" onClick={() => setRole(r.id)}>
                <span className="role-icon" style={{ background: r.bg, color: r.fg }}>
                  <Icon name={r.icon} size={28} />
                </span>
                <h3>{t.roles[r.id]}</h3>
                <span className="muted">{t.roleIntro[r.id]}</span>
                <span className="link-btn" style={{ marginTop: "auto" }}>
                  {t.common.continue} <Icon name="arrowRight" size={18} />
                </span>
              </button>
            ))}
          </div>
          <p className="center">
            {t.auth.haveAccount} <Link href="/login">{t.landing.login}</Link>
          </p>
        </div>
      </AuthFrame>
    );
  }

  const selected = ROLES.find((r) => r.id === role)!;
  const err = (key: keyof Errors) =>
    errors[key] ? (
      <span className="error" id={`err-${key}`}>
        {errors[key]}
      </span>
    ) : null;

  return (
    <AuthFrame>
      <div className="card stack-lg" style={{ gap: 22 }}>
        <div className="stack-sm">
          <h1>{t.auth.signupTitle}</h1>
          <div className="row-between">
            <span className="row" style={{ gap: 10 }}>
              <span
                className="role-icon"
                style={{
                  background: selected.bg,
                  color: selected.fg,
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name={selected.icon} size={22} />
              </span>
              <strong style={{ color: "var(--navy)" }}>{t.roles[role]}</strong>
            </span>
            <button type="button" className="link-btn" onClick={() => setRole(null)}>
              {t.auth.changeRole}
            </button>
          </div>
        </div>

        <form className="form" onSubmit={submit} noValidate>
          <div className="fields-2">
            <div className="field">
              <label htmlFor="su-first">{t.auth.firstName}</label>
              <input
                id="su-first"
                className="input"
                autoComplete="given-name"
                value={firstName}
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={errors.firstName ? "err-firstName" : undefined}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clear("firstName");
                }}
              />
              {err("firstName")}
            </div>
            <div className="field">
              <label htmlFor="su-last">{t.auth.lastName}</label>
              <input
                id="su-last"
                className="input"
                autoComplete="family-name"
                value={lastName}
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={errors.lastName ? "err-lastName" : undefined}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clear("lastName");
                }}
              />
              {err("lastName")}
            </div>
          </div>
          <div className="field">
            <label htmlFor="su-email">{t.auth.email}</label>
            <input
              id="su-email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "err-email" : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                clear("email");
              }}
            />
            {err("email")}
          </div>
          <div className="field">
            <label htmlFor="su-password">{t.auth.password}</label>
            <input
              id="su-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              aria-invalid={Boolean(errors.password)}
              aria-describedby="su-password-help"
              onChange={(e) => {
                setPassword(e.target.value);
                clear("password");
              }}
            />
            {errors.password ? err("password") : <small id="su-password-help">{t.auth.passwordHelp}</small>}
          </div>

          {role !== "family" ? (
            <>
              <SectorPicker legend={t.auth.sector} value={sector} onChange={setSector} />
              <InterestPicker legend={t.auth.interests} value={interests} onChange={setInterests} />
            </>
          ) : (
            <div className="card card-soft" style={{ padding: 18 }}>
              <div className="field">
                <label htmlFor="su-code">
                  {t.auth.inviteCode} <span className="muted small">({t.common.optional})</span>
                </label>
                <input
                  id="su-code"
                  className="input"
                  placeholder="JOY-0000"
                  autoCapitalize="characters"
                  value={inviteCode}
                  aria-invalid={Boolean(errors.inviteCode)}
                  aria-describedby="su-code-help"
                  onChange={(e) => {
                    setInviteCode(e.target.value);
                    clear("inviteCode");
                  }}
                />
                {errors.inviteCode ? err("inviteCode") : <small id="su-code-help">{t.auth.inviteCodeHelp}</small>}
              </div>
              <div className="field">
                <label htmlFor="su-relation">{t.auth.relation}</label>
                <select id="su-relation" className="input" value={relation} onChange={(e) => setRelation(e.target.value as Relation)}>
                  {RELATION_IDS.map((r) => (
                    <option key={r} value={r}>
                      {t.relations[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="field">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={consent}
                aria-invalid={Boolean(errors.consent)}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  clear("consent");
                }}
              />
              <span>{t.auth.consent}</span>
            </label>
            {err("consent")}
          </div>

          <button className="btn btn-block" type="submit" disabled={busy}>
            {t.auth.signupSubmit}
          </button>
        </form>
        <p className="center">
          {t.auth.haveAccount} <Link href="/login">{t.landing.login}</Link>
        </p>
      </div>
    </AuthFrame>
  );
}
