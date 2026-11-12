import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export default function SeniorLayout({ children }: { children: ReactNode }) {
  return <AppShell role="senior">{children}</AppShell>;
}
