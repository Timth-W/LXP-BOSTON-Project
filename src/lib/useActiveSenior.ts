"use client";

/** For relatives: which linked senior is shown. Remembered in the browser. */
import { useCallback, useEffect, useState } from "react";
import { seniorsOf } from "./selectors";
import { useStore } from "./store";

const KEY = "joyto-active-senior";

export function useActiveSenior() {
  const { state, me } = useStore();
  const seniors = me ? seniorsOf(state, me.id) : [];
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    try {
      setChosen(localStorage.getItem(KEY));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const choose = useCallback((id: string) => {
    setChosen(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const senior = seniors.find((u) => u.id === chosen) ?? seniors[0];
  return { seniors, senior, choose };
}
