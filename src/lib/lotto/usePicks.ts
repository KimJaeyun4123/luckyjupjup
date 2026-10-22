"use client";

import { useMemo, useSyncExternalStore } from "react";
import { PICKS_KEY, type SavedPick, loadPicks } from "./picks";

const EVENT = "luckyjupjup:picks-changed";

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};
const getSnapshot = () => {
  try {
    return localStorage.getItem(PICKS_KEY) ?? "";
  } catch {
    return "";
  }
};
const getServerSnapshot = () => null;

/** 저장한 번호를 읽는다. 서버·첫 렌더에서는 null(아직 모름), 그 뒤에는 배열 */
export function usePicks(): SavedPick[] | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => (raw === null ? null : loadPicks()), [raw]);
}
