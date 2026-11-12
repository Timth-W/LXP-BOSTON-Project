import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export default function CompanionLayout({ children }: { children: ReactNode }) {
  return <AppShell role="companion">{children}</AppShell>;
}
