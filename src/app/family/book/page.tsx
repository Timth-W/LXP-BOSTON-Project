"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookingForm } from "@/components/BookingForm";
import { SeniorSwitcher } from "@/components/SeniorSwitcher";
import { BackLink, Empty, PageHead } from "@/components/ui";
import { useI18n } from "@/i18n";
import { useActiveSenior } from "@/lib/useActiveSenior";
import { useStore } from "@/lib/store";

export default function FamilyBookPage() {
  const { me } = useStore();
  const { t } = useI18n();
  const router = useRouter();
  const { seniors, senior, choose } = useActiveSenior();
  if (!me) return null;

  return (
    <div className="stack-lg">
      <BackLink href="/family" />
      <PageHead title={senior ? t.family.bookFor(senior.firstName) : t.family.book} lead={t.family.bookLead} />
      {senior ? (
        <>
          <SeniorSwitcher seniors={seniors} value={senior.id} onChange={choose} />
          <BookingForm
            key={senior.id}
            senior={senior}
            booker={me}
            payers={[me]}
            via="manual"
            onBooked={(id) => router.push(`/family/outings/${id}`)}
          />
        </>
      ) : (
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
      )}
    </div>
  );
}
