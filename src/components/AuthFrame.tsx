"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitch } from "./LanguageSwitch";
import { Logo } from "./Logo";

export function AuthFrame({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="auth-wrap">
      <header className="landing-header">
        <div className="container">
          <Link href="/" className="brand" aria-label="JoyTo" style={{ textDecoration: "none" }}>
            <Logo size={40} />
          </Link>
          <LanguageSwitch />
        </div>
      </header>
      <main id="main" className="container auth-main">
        <div className={`auth-card${wide ? " wide" : ""}`}>{children}</div>
      </main>
    </div>
  );
}
