"use client";

/** Small shared building blocks. */
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { initials } from "@/lib/format";
import type { StatusTone } from "@/lib/selectors";
import type { Category, User } from "@/lib/types";
import { CATEGORY_ICON, Icon } from "./Icon";
import { LogoMark } from "./Logo";

const AVATAR_COLOURS = ["#203B52", "#2F6B57", "#A8442A", "#5E7E64", "#7A5300", "#4F5D8A"];

function colourFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

export function Avatar({ user, size = 44 }: { user: Pick<User, "id" | "firstName" | "lastName">; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: colourFor(user.id), fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(user.firstName, user.lastName)}
    </span>
  );
}

export function Person({
  user,
  subtitle,
  size = 48,
  showLastName = true,
}: {
  user: User;
  subtitle?: ReactNode;
  size?: number;
  showLastName?: boolean;
}) {
  return (
    <div className="person">
      <Avatar user={showLastName ? user : { ...user, lastName: "" }} size={size} />
      <div className="min-0">
        <div className="person-name">
          {user.firstName}
          {showLastName && user.lastName ? ` ${user.lastName}` : ""}
        </div>
        {subtitle ? <div className="muted small">{subtitle}</div> : null}
      </div>
    </div>
  );
}

export function Badge({ tone = "neutral", children, plain }: { tone?: StatusTone; children: ReactNode; plain?: boolean }) {
  return <span className={`badge badge-${tone}${plain ? " badge-plain" : ""}`}>{children}</span>;
}

export function PageHead({
  title,
  lead,
  action,
  eyebrow,
}: {
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="min-0">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {action ? <div className="row">{action}</div> : null}
    </header>
  );
}

export function Empty({
  children,
  action,
  icon = "bench",
}: {
  children: ReactNode;
  action?: ReactNode;
  icon?: Parameters<typeof Icon>[0]["name"];
}) {
  return (
    <div className="empty">
      <Icon name={icon} size={36} />
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Interests({ list, highlight = [] }: { list: Category[]; highlight?: Category[] }) {
  const { t } = useI18n();
  if (!list.length) return null;
  return (
    <div className="chip-list">
      {list.map((c) => (
        <span key={c} className={`chip${highlight.includes(c) ? " chip-coral" : ""}`}>
          <Icon name={CATEGORY_ICON[c]} size={16} />
          {t.categories[c]}
        </span>
      ))}
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  const { t } = useI18n();
  return (
    <span className="stars" role="img" aria-label={t.outing.ratingValue(value)}>
      {"★".repeat(value)}
      <span className="off">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export function BackLink({ href }: { href: string }) {
  const { t } = useI18n();
  return (
    <Link href={href} className="link-btn">
      <Icon name="chevronLeft" size={20} /> {t.common.back}
    </Link>
  );
}

export function Loading() {
  const { t } = useI18n();
  return (
    <div className="loading-screen" role="status">
      <div className="stack center" style={{ alignItems: "center" }}>
        <span className="icon-pulse">
          <LogoMark size={56} />
        </span>
        <span>{t.common.loading}</span>
      </div>
    </div>
  );
}

/** Short confirmation message that disappears by itself. */
export function useToast(): [ReactNode, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 3200);
    return () => window.clearTimeout(id);
  }, [message]);
  const node = message ? (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  ) : null;
  return [node, setMessage];
}

export function CopyButton({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard refused: the code stays visible and selectable */
    }
  }
  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
      <Icon name={copied ? "check" : "copy"} size={18} />
      {copied ? t.common.copied : t.common.copy}
    </button>
  );
}
