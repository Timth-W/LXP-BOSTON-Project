"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { OutingList } from "@/components/OutingList";
import { Empty, PageHead } from "@/components/ui";
import { useI18n } from "@/i18n";
import { isPast, outingsOf } from "@/lib/selectors";
import { useStore } from "@/lib/store";

export default function OutingsPage() {
  const { state, me } = useStore();
  const { t } = useI18n();
  if (!me) return null;
  const all = outingsOf(state, me.id);
  const upcoming = all.filter((i) => !isPast(state, i.date));
  const past = all.filter((i) => isPast(state, i.date)).reverse();

  return (
    <div className="stack-lg">
      <PageHead
        title={t.senior.outingsTitle}
        action={
          <Link href="/senior/outings/new" className="btn btn-block-mobile">
            <Icon name="plus" /> {t.senior.newOuting}
          </Link>
        }
      />
      <section className="stack">
        <h2>{t.senior.upcoming}</h2>
        {upcoming.length ? (
          <OutingList items={upcoming} outingBase="/senior/outings" />
        ) : (
          <Empty icon="calendar">{t.senior.noUpcoming}</Empty>
        )}
      </section>
      <section className="stack">
        <h2>{t.senior.past}</h2>
        {past.length ? <OutingList items={past} outingBase="/senior/outings" /> : <Empty icon="calendar">{t.senior.noPast}</Empty>}
      </section>
    </div>
  );
}
