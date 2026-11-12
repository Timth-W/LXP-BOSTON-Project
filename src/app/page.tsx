"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo, LogoMark } from "@/components/Logo";
import { Avatar } from "@/components/ui";
import { useI18n } from "@/i18n";
import { loginAsDemo } from "@/lib/actions";
import { DEMO_PASSWORD, HOME_BY_ROLE } from "@/lib/constants";
import { activityById, attendees } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const ROLE_STYLE: Record<Role, { icon: "bench" | "heart" | "users"; bg: string; fg: string }> = {
  senior: { icon: "bench", bg: "var(--sage-soft)", fg: "#2c4a35" },
  companion: { icon: "heart", bg: "var(--coral-soft)", fg: "var(--coral-text)" },
  family: { icon: "users", bg: "#e4ebf1", fg: "var(--navy)" },
};

function Leaf({ size, style }: { size: number; style: React.CSSProperties }) {
  return (
    <svg className="hero-leaf" width={size} height={size} viewBox="0 0 64 64" style={style} aria-hidden="true">
      <path d="M8 56C10 30 26 12 56 8c-2 28-20 46-48 48z" fill="currentColor" />
      <path d="M10 54 44 20M24 40l-2-12M32 32l10 2M18 46l12 2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export default function Landing() {
  const { state, me, run } = useStore();
  const { t, f } = useI18n();
  const router = useRouter();

  const demoUsers = state.users.filter((u) => u.demo);
  const sample = activityById(state, "a1");
  const sampleMates = sample ? attendees(state, sample.id).map((u) => u.firstName) : [];

  function enterDemo(userId: string, role: Role) {
    run((s) => loginAsDemo(s, userId));
    router.push(HOME_BY_ROLE[role]);
  }

  return (
    <div className="stack-lg" style={{ gap: 0 }}>
      <header className="landing-header">
        <div className="container">
          <Logo size={42} />
          <div className="row" style={{ gap: 8 }}>
            <LanguageSwitch />
            <Link href="/login" className="btn btn-ghost btn-sm">
              {t.landing.login}
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="container hero">
          <div className="stack-lg" style={{ gap: 20 }}>
            <p className="hand">{t.common.tagline}</p>
            <h1>{t.landing.title}</h1>
            <p className="lead">{t.landing.lead}</p>
            <div className="row">
              {me ? (
                <Link href={HOME_BY_ROLE[me.role]} className="btn btn-block-mobile">
                  {t.landing.demoEnter(me.firstName)} <Icon name="arrowRight" size={20} />
                </Link>
              ) : (
                <>
                  <Link href="/signup" className="btn btn-block-mobile">
                    {t.landing.signup}
                  </Link>
                  <a href="#demo" className="btn btn-secondary btn-block-mobile">
                    {t.landing.demoTitle}
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <Leaf size={70} style={{ top: -10, left: "4%", transform: "rotate(-20deg)" }} />
            <Leaf size={46} style={{ bottom: 40, right: "2%", color: "var(--sun)", transform: "rotate(40deg)" }} />
            <div className="phone">
              <div className="phone-screen">
                <div className="row-between">
                  <LogoMark size={30} />
                  <span className="chip">{t.nav.activities}</span>
                </div>
                {sample ? (
                  <div className="card" style={{ padding: 16, gap: 10 }}>
                    <div className="activity-top">
                      <div className="date-block" style={{ width: 54 }}>
                        <span className="date-day">{new Date(sample.start).getDate()}</span>
                        <span className="date-month">{f.month(sample.start)}</span>
                      </div>
                      <div className="min-0">
                        <h3 style={{ fontSize: "1.02rem" }}>{f.text(sample.title)}</h3>
                        <p className="muted small">{f.date(sample.start)}</p>
                      </div>
                    </div>
                    <p className="small">{t.activity.with(f.names(sampleMates))}</p>
                    <span className="btn btn-sm btn-block">
                      <Icon name="check" size={18} /> {t.activity.imIn}
                    </span>
                  </div>
                ) : null}
                <div className="card card-sage" style={{ padding: 14, gap: 6 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Icon name="mic" size={20} />
                    <strong className="small">{t.joy.name}</strong>
                  </div>
                  <p className="small">“{t.joy.greeting.senior("Marie")}”</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container stack-lg" style={{ paddingBlock: "8px 48px" }} aria-labelledby="how">
          <h2 id="how">{t.landing.stepsTitle}</h2>
          <ol className="feature-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {t.landing.steps.map((step, i) => (
              <li key={step.title} className="card feature">
                <span className="feature-num" style={{ background: ["var(--forest)", "var(--coral-text)", "var(--navy)"][i] }}>
                  {i + 1}
                </span>
                <h3>{step.title}</h3>
                <p className="muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="demo" className="container" style={{ paddingBlock: "8px 24px", scrollMarginTop: 24 }} aria-labelledby="demo-title">
          <div className="card card-soft stack-lg" style={{ gap: 18 }}>
            <div className="stack-sm">
              <span className="eyebrow">{t.common.demo}</span>
              <h2 id="demo-title">{t.landing.demoTitle}</h2>
              <p className="muted">
                {t.landing.demoText}{" "}
                <strong className="strong" style={{ color: "var(--navy)" }}>
                  {DEMO_PASSWORD}
                </strong>
                .
              </p>
            </div>
            {(["senior", "companion", "family"] as Role[]).map((role) => (
              <div key={role} className="stack">
                <h3 className="row" style={{ gap: 8 }}>
                  <Icon name={ROLE_STYLE[role].icon} size={20} /> {t.roles[role]}
                </h3>
                <div className="demo-grid">
                  {demoUsers
                    .filter((u) => u.role === role)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="demo-profile"
                        onClick={() => enterDemo(u.id, u.role)}
                        aria-label={t.landing.demoEnter(u.firstName)}
                      >
                        <Avatar user={u} size={44} />
                        <span className="min-0" style={{ flex: 1 }}>
                          <span className="person-name" style={{ display: "block" }}>
                            {u.firstName} {u.lastName}
                          </span>
                          <span
                            className="muted small"
                            style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {u.email}
                          </span>
                        </span>
                        <Icon name="chevronRight" size={20} className="muted" />
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="container landing-footer">
        <div className="row-between">
          <Logo size={28} />
          <p>{t.landing.footer}</p>
        </div>
      </footer>
    </div>
  );
}
