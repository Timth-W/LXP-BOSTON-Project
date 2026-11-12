"use client";

import { ProfileForm } from "@/components/ProfileForm";
import { PageHead } from "@/components/ui";
import { useI18n } from "@/i18n";
import { useStore } from "@/lib/store";

export default function CompanionProfilePage() {
  const { me } = useStore();
  const { t } = useI18n();
  if (!me) return null;
  return (
    <div className="stack-lg">
      <PageHead title={t.profile.title} />
      <div style={{ maxWidth: 820 }}>
        <ProfileForm user={me} />
      </div>
    </div>
  );
}
