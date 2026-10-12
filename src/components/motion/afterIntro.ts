"use client";

import { useSyncExternalStore } from "react";
import { useIntroDone } from "@/lib/intro";

// Scroll scenes (pins, splits, reveals) are built together while the intro holds
// a still frame, so their layout work and ScrollTrigger's batched refresh never
// land on a frame that is animating.
let open = false;
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const scenes = {
  build(): Promise<void> {
    if (!open) {
      open = true;
      listeners.forEach((l) => l());
    }
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  },
};

export function useAfterIntro() {
  const built = useSyncExternalStore(subscribe, () => open, () => false);
  return useIntroDone() || built;
}
