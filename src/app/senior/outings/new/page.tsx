"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BookingForm } from "@/components/BookingForm";
import { BackLink, Loading, PageHead } from "@/components/ui";
import { useI18n } from "@/i18n";
import { addMinutes } from "@/lib/format";
import { activityById, payersFor } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Draft } from "@/lib/types";

function NewOutingForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, me } = useStore();
  if (!me) return null;

  const draftId = params.get("draft");
  const activityId = params.get("activity");
  let initial: Partial<Draft> | undefined;
  if (draftId) {
    initial = (state.chats[me.id] ?? []).find((m) => m.id === draftId)?.draft ?? undefined;
  } else if (activityId) {
    const a = activityById(state, activityId);
    if (a) initial = { activityId: a.id, type: "activity", start: addMinutes(a.start, -15), durationMin: 150, note: "" };
  }

  return (
    <BookingForm
      key={draftId ?? activityId ?? "new"}
      senior={me}
      booker={me}
      payers={payersFor(state, me.id)}
      initial={initial}
      via={draftId && initial ? "assistant" : "manual"}
      onBooked={(id) => router.push(`/senior/outings/${id}`)}
    />
  );
}

export default function NewOutingPage() {
  const { t } = useI18n();
  return (
    <div className="stack-lg">
      <BackLink href="/senior/outings" />
      <PageHead title={t.senior.newOutingTitle} lead={t.senior.newOutingLead} />
      <Suspense fallback={<Loading />}>
        <NewOutingForm />
      </Suspense>
    </div>
  );
}
