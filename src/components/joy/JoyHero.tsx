"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import type { Role } from "@/lib/types";
import { Icon } from "../Icon";
import { LogoMark } from "../Logo";

/** Entry point to Joy on each home screen. Opening the page with ?start=1 makes Joy speak at once. */
export function JoyHero({ role }: { role: Role }) {
  const { t } = useI18n();
  return (
    <section className="card joy-hero" aria-label={t.joy.name}>
      <span className="joy-orb" data-status="off" aria-hidden="true">
        <LogoMark size={44} />
      </span>
      <div className="min-0" style={{ flex: "1 1 220px" }}>
        <h2 style={{ fontSize: "1.3rem" }}>{t.joy.name}</h2>
        <p className="muted">{t.joy.lead}</p>
      </div>
      <Link href={`/${role}/joy?start=1`} className="btn btn-block-mobile">
        <Icon name="mic" /> {t.joy.start}
      </Link>
    </section>
  );
}
