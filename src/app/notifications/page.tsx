"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Empty, PageHead } from "@/components/ui";
import { useI18n } from "@/i18n";
import { markAllRead, markRead } from "@/lib/actions";
import { notificationText } from "@/lib/notifications";
import { useStore } from "@/lib/store";

function NotificationsList() {
  const { state, me, run } = useStore();
  const { t, f } = useI18n();
  if (!me) return null;
  const user = me;
  const list = state.notifications
    .filter((n) => n.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id, undefined, { numeric: true }));
  const unread = list.filter((n) => !n.read).length;

  return (
    <div className="stack-lg">
      <PageHead
        title={t.notifications.title}
        lead={unread ? t.notifications.unread(unread) : undefined}
        action={
          unread ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => run((s) => markAllRead(s, user.id))}>
              <Icon name="check" size={18} /> {t.notifications.markAll}
            </button>
          ) : null
        }
      />
      {list.length ? (
        <div className="stack" style={{ maxWidth: 820 }}>
          {list.map((n) => (
            <Link key={n.id} href={n.href} className={`notif-item${n.read ? "" : " unread"}`} onClick={() => run((s) => markRead(s, n.id))}>
              <span className={`notif-dot${n.read ? " read" : ""}`} aria-hidden="true" />
              <span className="min-0">
                <span style={{ display: "block", fontWeight: n.read ? 600 : 800, color: "var(--navy)" }}>
                  {notificationText(state, n, t, f)}
                </span>
                <span className="muted small">{f.date(n.createdAt)}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <Empty icon="bell">{t.notifications.empty}</Empty>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AppShell>
      <NotificationsList />
    </AppShell>
  );
}
