"use client";

import { useReducedMotionSafe } from "@/lib/useReducedMotionSafe";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { engine, useStudyLoop } from "@/lib/useStudyLoop";
import { Icon } from "../ui/Icon";
import { Magnetic } from "../ui/Magnetic";

/**
 * Editorial home: a paper page with a giant condensed headline, the band as a
 * taped polaroid, and marker doodles that draw themselves in.
 */
export function HomeView({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const reduced = useReducedMotionSafe();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const polX = useTransform(sx, (v) => v * 14);
  const polY = useTransform(sy, (v) => v * 10);
  const polR = useTransform(sx, (v) => 4 + v * 1.5);
  const inkX = useTransform(sx, (v) => v * -6);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || reduced) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
      my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    };
    const onLeave = () => {
      mx.set(0);
      my.set(0);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [stageRef, reduced, mx, my]);

  return (
    <div className="ed">
      <p className="ed__side" aria-hidden>
        StudyLoop® · prototype 2026
      </p>

      <h1 className="ed__title">
        <span className="ed__line">A band that</span>
        <span className="ed__line ed__line--row">
          feels
          <span className="ed__sticker" aria-hidden>
            music that answers it.
          </span>
          <motion.span className="ed__body" style={{ x: inkX }} aria-hidden>
            Wear it while you study. When stress climbs, your music slows and softens with you.
          </motion.span>
        </span>
        <span className="ed__line ed__line--hit">
          stress.
          <svg className="ed-ink ed-ink--circle" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden>
            <path
              pathLength={1}
              d="M30 70C18 40 90 14 170 12c80-2 128 20 120 52-8 34-90 48-170 46C50 108 6 90 14 62 20 40 70 26 120 22"
            />
          </svg>
        </span>
      </h1>

      <p className="sr-only">
        Music that answers it. Wear it while you study. When stress climbs, your music slows and softens with you.
      </p>

      <svg className="ed-ink ed-ink--arrow" viewBox="0 0 200 90" aria-hidden>
        <path pathLength={1} d="M6 70C40 20 110 4 176 34" />
        <path pathLength={1} className="ed-ink__late" d="M152 16l26 19-30 10" />
      </svg>

      <motion.figure className="ed-pol" style={{ x: polX, y: polY, rotate: polR }}>
        <span className="ed-pol__tape" aria-hidden />
        <div className="ed-pol__photo">
          <Image
            src="/media/studyloop-band-hd.png"
            alt="The StudyLoop band: a matte black wristband with a cyan status light, one button and two EDA electrodes"
            fill
            preload
            sizes="(max-width: 1023px) 80vw, 34vw"
          />
          <span className="ed-pol__led" aria-hidden />
        </div>
        <figcaption>fig. 01 — the band</figcaption>
      </motion.figure>

      <svg className="ed-ink ed-ink--pulse" viewBox="0 0 220 60" aria-hidden>
        <path pathLength={1} d="M2 34h48l10-22 14 40 12-30 9 12h36c10 0 14-8 22-8s14 10 22 10h41" />
      </svg>

      <p className="ed__scrawl" aria-hidden>
        in the loop<span>*</span>
      </p>

      <svg className="ed-ink ed-ink--star" viewBox="0 0 60 60" aria-hidden>
        <path pathLength={1} d="M30 4v52M6 18l48 24M54 18 6 42" />
      </svg>
    </div>
  );
}

export function HomeFoot() {
  const s = useStudyLoop();
  const conn = s.reading.connection;
  const start = () => {
    engine.setTab("session");
    if (s.session.phase === "complete") engine.newSession();
  };
  return (
    <div className="foot foot--home ed-foot">
      <Magnetic>
        <button type="button" className="ed-cta" onClick={start}>
          Start a session
          <Icon name="arrow" size={18} />
        </button>
      </Magnetic>
      <button type="button" className="ed-link" onClick={() => engine.setTab("research")}>
        explore the research
      </button>
      <p className="ed-foot__status" role="status">
        <span className={`ed-foot__dot is-${conn}`} aria-hidden />
        {conn === "connected"
          ? s.session.baseline
            ? "Band on wrist · baseline set"
            : "Band on wrist · ready for baseline"
          : conn === "connecting"
            ? "Pairing with band…"
            : "No band? A timed session works too."}
      </p>
      <a className="foot__scroll ed-foot__scroll" href="#story">
        Inside the band
        <Icon name="arrow" size={14} style={{ transform: "rotate(90deg)" }} />
      </a>
    </div>
  );
}
