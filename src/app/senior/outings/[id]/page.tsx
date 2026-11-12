"use client";

import { useParams } from "next/navigation";
import { OutingDetail } from "@/components/OutingDetail";
import { useStore } from "@/lib/store";

export default function SeniorOutingPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useStore();
  if (!me) return null;
  return <OutingDetail missionId={id} viewer={me} backHref="/senior/outings" />;
}
