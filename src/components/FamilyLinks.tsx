"use client";

/**
 * Links between a senior and their relatives (son, daughter, grandchild…).
 * The senior shares an invite code; the relative enters it. Either side can remove the link.
 */
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/i18n";
import { linkByCode, regenerateInviteCode, unlinkFamily } from "@/lib/actions";
import { RELATION_IDS } from "@/lib/constants";
import { findSeniorByCode, linksOfFamily, linksOfSenior, userById } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { FamilyLink, Relation, User } from "@/lib/types";
import { Icon } from "./Icon";
import { CopyButton, Person } from "./ui";

function LinkRow({ link, other, viewer }: { link: FamilyLink; other: User; viewer: User }) {
  const { run } = useStore();
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const question = viewer.role === "senior" ? t.profile.removeConfirm(other.firstName) : t.family.unlinkConfirm(other.firstName);
  return (
    <li style={{ flexWrap: "wrap" }}>
      <div className="list-body">
        <Person user={other} subtitle={viewer.role === "senior" ? t.relations[link.relation] : t.roles.senior} />
      </div>
      {confirming ? (
        <div className="row">
          <span className="small strong">{question}</span>
          <button type="button" className="btn btn-danger-solid btn-sm" onClick={() => run((s) => unlinkFamily(s, link.id, viewer.id))}>
            {viewer.role === "senior" ? t.profile.removeLink : t.family.unlink}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
            {t.common.cancel}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>
          {viewer.role === "senior" ? t.profile.removeLink : t.family.unlink}
        </button>
      )}
    </li>
  );
}

/** Senior side: invite code + list of relatives. */
export function SeniorFamilyPanel({ senior }: { senior: User }) {
  const { state, run } = useStore();
  const { t } = useI18n();
  const links = linksOfSenior(state, senior.id);
  return (
    <section className="card" aria-labelledby="family-title">
      <h2 id="family-title" className="row" style={{ fontSize: "1.25rem", gap: 10 }}>
        <Icon name="users" /> {t.profile.familyTitle}
      </h2>
      <p className="muted">{t.profile.familyLead}</p>
      <div className="stack-sm">
        <span className="label">{t.profile.inviteCode}</span>
        <div className="code-box">
          <span className="code-value" data-testid="invite-code">
            {senior.inviteCode}
          </span>
          <div className="row">
            <CopyButton value={senior.inviteCode ?? ""} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => run((s) => regenerateInviteCode(s, senior.id))}>
              <Icon name="refresh" size={18} /> {t.profile.regenerate}
            </button>
          </div>
        </div>
        <small className="help">{t.profile.inviteHelp}</small>
      </div>
      {links.length ? (
        <ul className="list">
          {links.map((l) => {
            const other = userById(state, l.familyId);
            return other ? <LinkRow key={l.id} link={l} other={other} viewer={senior} /> : null;
          })}
        </ul>
      ) : (
        <p className="muted">{t.profile.noFamily}</p>
      )}
    </section>
  );
}

/** Relative side: form to enter a code. */
export function ConnectForm({ family, onLinked }: { family: User; onLinked?: (seniorId: string) => void }) {
  const { state, run } = useStore();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [relation, setRelation] = useState<Relation>("daughter");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setError(t.auth.errors.code);
    const senior = findSeniorByCode(state, code);
    const err = run((s) => linkByCode(s, family.id, code, relation));
    if (err) return setError(err === "alreadyLinked" ? t.auth.errors.alreadyLinked : t.auth.errors.code);
    setError(null);
    setCode("");
    if (senior && onLinked) onLinked(senior.id);
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="fields-2">
        <div className="field">
          <label htmlFor="cn-code">{t.auth.inviteCode}</label>
          <input
            id="cn-code"
            className="input"
            placeholder="JOY-0000"
            autoCapitalize="characters"
            value={code}
            aria-invalid={Boolean(error)}
            aria-describedby="cn-code-help"
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
          />
          {error ? (
            <span className="error" id="cn-code-help" role="alert">
              {error}
            </span>
          ) : (
            <small id="cn-code-help">{t.family.connectLead}</small>
          )}
        </div>
        <div className="field">
          <label htmlFor="cn-relation">{t.auth.relation}</label>
          <select id="cn-relation" className="input" value={relation} onChange={(e) => setRelation(e.target.value as Relation)}>
            {RELATION_IDS.map((r) => (
              <option key={r} value={r}>
                {t.relations[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="row">
        <button type="submit" className="btn btn-block-mobile">
          <Icon name="link" /> {t.family.connect}
        </button>
      </div>
    </form>
  );
}

/** Relative side: list of linked seniors and the connect form. */
export function FamilySeniorsPanel({ family }: { family: User }) {
  const { state } = useStore();
  const { t } = useI18n();
  const links = linksOfFamily(state, family.id);
  return (
    <>
      <section className="card" aria-labelledby="linked-title">
        <h2 id="linked-title" className="row" style={{ fontSize: "1.25rem", gap: 10 }}>
          <Icon name="users" /> {t.family.linkedSeniors}
        </h2>
        {links.length ? (
          <ul className="list">
            {links.map((l) => {
              const other = userById(state, l.seniorId);
              return other ? <LinkRow key={l.id} link={l} other={other} viewer={family} /> : null;
            })}
          </ul>
        ) : (
          <p className="muted">{t.family.noLinked}</p>
        )}
      </section>
      <section className="card" aria-labelledby="connect-title">
        <h2 id="connect-title" style={{ fontSize: "1.25rem" }}>
          {t.family.connectTitle}
        </h2>
        <ConnectForm family={family} />
        <Link href="/family" className="link-btn">
          {t.nav.home} <Icon name="chevronRight" size={18} />
        </Link>
      </section>
    </>
  );
}
