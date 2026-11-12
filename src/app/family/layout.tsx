import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export default function FamilyLayout({ children }: { children: ReactNode }) {
  return <AppShell role="family">{children}</AppShell>;
}
