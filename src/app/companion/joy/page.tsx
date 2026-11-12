"use client";

import { JoyScreen } from "@/components/joy/JoyScreen";
import { useStore } from "@/lib/store";

export default function CompanionJoyPage() {
  const { me } = useStore();
  if (!me) return null;
  return <JoyScreen viewer={me} />;
}
