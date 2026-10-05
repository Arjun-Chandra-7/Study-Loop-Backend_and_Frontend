"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";
import { useStudyLoop } from "@/lib/useStudyLoop";
import { scrollToTop } from "./SmoothScroll";

export function QuietLock() {
  const { quiet } = useStudyLoop();
  useEffect(() => {
    if (!quiet) return;
    scrollToTop();

    const t = setTimeout(() => {
      document.documentElement.dataset.quiet = "";
      ScrollTrigger.refresh();
    }, 700);
    return () => {
      clearTimeout(t);
      if (!("quiet" in document.documentElement.dataset)) return;
      delete document.documentElement.dataset.quiet;
      ScrollTrigger.refresh();
    };
  }, [quiet]);
  return null;
}
