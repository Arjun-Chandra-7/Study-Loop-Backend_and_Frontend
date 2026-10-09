"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StageProgress } from "./BandStage";

const BandStage = dynamic(
  () => import("./BandStage").then((m) => m.BandStage),
  { ssr: false },
);

type Chapter = {
  id?: string;
  side: "left" | "right" | "center";
  label?: string;
  title: string;
  em?: string;
  body?: string;
};

const CHAPTERS: Chapter[] = [
  { side: "center", title: "StudyLoop", em: "the study band" },
  {
    id: "object",
    side: "right",
    label: "I · Form",
    title: "Shaped",
    em: "to the wrist",
    body: "A curved shell follows the arc of the wrist, so the sensors rest flat against the skin and stay there for the length of a session.",
  },
  {
    side: "left",
    label: "II · Light",
    title: "One line",
    em: "of light",
    body: "A single cyan line is the only thing the band shows you. When it glows, the band is listening.",
  },
  {
    side: "right",
    label: "III · Control",
    title: "One key",
    body: "A recessed button wakes the band and pairs it with your session. No screen to check, nothing to scroll.",
  },
  {
    side: "left",
    label: "IV · Contact",
    title: "Two contacts",
    em: "and a pulse",
    body: "Two brushed-steel pads read skin conductance. Between them, an optical sensor follows your heart rate.",
  },
  {
    id: "inside",
    side: "right",
    label: "V · Inside",
    title: "Opened",
    em: "in layers",
    body: "Cover, two small boards, a rechargeable cell and the contact tray. Every part has a single job, and nothing is there for show.",
  },
  {
    side: "left",
    label: "VI · Closed",
    title: "Then it",
    em: "disappears",
    body: "Put it on, start a session and forget it. The band reads you, the headphones answer, and you read your notes.",
  },
];

export function Universe() {
  const section = useRef<HTMLElement>(null);
  const progress = useMemo<StageProgress>(() => ({ current: 0 }), []);
  const [state, setState] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const [active, setActive] = useState(0);
  const onReady = useCallback(() => setState("ready"), []);
  const onFail = useCallback(() => setState("fallback"), []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      progress.current = p;
      setActive(Math.round(p * (CHAPTERS.length - 1)));
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [progress]);

  return (
    <section
      ref={section}
      className="at-universe"
      id="top"
      data-tone="light"
      data-stage={state}
      aria-label="The StudyLoop band"
      style={{ "--chapters": CHAPTERS.length } as React.CSSProperties}
    >
      <div className="at-stage-track">
        <div className="at-stage">
          {state !== "fallback" && (
            <BandStage progress={progress} onReady={onReady} onFail={onFail} />
          )}
          <img
            className="at-stage__fallback"
            src="/media/atelier/study-top.webp"
            alt=""
          />
          <div className="at-stage__index" aria-hidden="true">
            {CHAPTERS.map((c, i) => (
              <span key={c.title} data-active={i === active || undefined} />
            ))}
          </div>
          <p
            className="at-stage__cue"
            aria-hidden="true"
            data-hidden={active > 0 || undefined}
          >
            Scroll to explore
          </p>
        </div>
      </div>
      {CHAPTERS.map((c, i) => (
        <div key={c.title} className="at-chapter" data-side={c.side} id={c.id}>
          {c.side === "center" ? (
            <header className="at-chapter__intro">
              <p className="at-eyebrow">Tech Innovators presents</p>
              <h1 className="at-display at-display--xl">
                {c.title}
                <br />
                <em>{c.em}</em>
              </h1>
            </header>
          ) : (
            <article
              className="at-panel at-chapter__panel"
              data-active={i === active || undefined}
            >
              <p className="at-eyebrow">{c.label}</p>
              <h2 className="at-display at-display--md">
                {c.title} {c.em && <em>{c.em}</em>}
              </h2>
              <p className="at-body">{c.body}</p>
            </article>
          )}
        </div>
      ))}
    </section>
  );
}
