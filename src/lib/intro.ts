"use client";

import { useSyncExternalStore } from "react";
import { BASELINE } from "./kerning";

let done = false;
const listeners = new Set<() => void>();

export const intro = {
  isDone: () => done,
  finish(mark: string) {
    if (done || mark !== BASELINE) return;
    done = true;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useIntroDone() {
  return useSyncExternalStore(intro.subscribe, intro.isDone, () => false);
}
