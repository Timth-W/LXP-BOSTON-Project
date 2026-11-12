"use client";

import Link from "next/link";
import { JoyScreen } from "@/components/joy/JoyScreen";
import { SeniorSwitcher } from "@/components/SeniorSwitcher";
import { Empty } from "@/components/ui";
import { useI18n } from "@/i18n";
import { useActiveSenior } from "@/lib/useActiveSenior";
import { useStore } from "@/lib/store";

export default function FamilyJoyPage() {
  const { me } = useStore();
  const { t } = useI18n();
  const { seniors, senior, choose } = useActiveSenior();
  if (!me) return null;
  if (!senior) {
    return (
      <Empty
        icon="link"
        action={
          <Link href="/family" className="btn btn-sm">
            {t.family.connect}
          </Link>
        }
      >
        {t.family.noLinked}
      </Empty>
    );
  }
  return (
    <div className="stack-lg">
      <SeniorSwitcher seniors={seniors} value={senior.id} onChange={choose} />
      <JoyScreen key={senior.id} viewer={me} seniorId={senior.id} />
    </div>
  );
}
