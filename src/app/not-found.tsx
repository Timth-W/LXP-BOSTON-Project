"use client";

import Link from "next/link";
import { AuthFrame } from "@/components/AuthFrame";
import { Empty } from "@/components/ui";
import { useI18n } from "@/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <AuthFrame>
      <Empty
        icon="alert"
        action={
          <Link href="/" className="btn btn-sm">
            {t.common.goHome}
          </Link>
        }
      >
        {t.common.notFound}
      </Empty>
    </AuthFrame>
  );
}
