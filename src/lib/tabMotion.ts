import { useState } from "react";
import type { Variants } from "motion/react";
import type { Tab } from "./engine";

const ORDER: Tab[] = ["home", "session", "insights", "research", "music", "profile"];

export function useTabDirection(tab: Tab): number {
  const [seen, setSeen] = useState({ tab, dir: 0 });
  if (seen.tab === tab) return seen.dir;
  const dir = Math.sign(ORDER.indexOf(tab) - ORDER.indexOf(seen.tab));
  setSeen({ tab, dir });
  return dir;
}

export const tabVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28, y: dir === 0 ? 10 : 0 }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -18,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
  }),
};

export const tabMotion = {
  variants: tabVariants,
  initial: "enter",
  animate: "center",
  exit: "exit",
} as const;
