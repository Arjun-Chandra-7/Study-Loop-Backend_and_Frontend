"use client";

import { useEffect, useRef, useState } from "react";
import { scrollToEl } from "@/components/motion/SmoothScroll";
import { intro } from "@/lib/intro";

const M = "/media/atelier";

const OBJECT_STEPS = [
  {
    img: `${M}/study-top.webp`,
    alt: "The StudyLoop band seen from above on a pale grey ground",
    label: "I · Form",
    title: "Shaped to the wrist",
    body: "A curved shell follows the arc of the wrist, so the sensors sit flat against the skin and stay there for the length of a session.",
  },
  {
    img: `${M}/macro-button.webp`,
    alt: "Close view of the recessed power button and indicator pinhole",
    label: "II · Control",
    title: "One button",
    body: "A single recessed key wakes the band and pairs it. There is no screen to check and nothing to scroll. The band stays out of the way.",
  },
  {
    img: `${M}/macro-weave.webp`,
    alt: "Macro of the woven textile strap",
    label: "III · Strap",
    title: "Woven, not buckled",
    body: "A soft woven strap, light enough to forget about an hour into revision and breathable enough to wear all day.",
  },
];

const SOUND = [
  {
    band: "Alpha",
    hz: "≈ 10 Hz",
    kind: "Binaural",
    state: "Settling in",
    body: "After a quiet minute to learn your baseline, a soft alpha bed eases you from arrival into attention.",
  },
  {
    band: "Gamma",
    hz: "40 Hz",
    kind: "Isochronic",
    state: "Focus",
    body: "Once you have been settled for five minutes, or after fifteen at most, the sound sharpens toward gamma.",
  },
  {
    band: "Theta",
    hz: "≈ 7.5 Hz",
    kind: "Binaural",
    state: "Relief and wind down",
    body: "If your skin conductance or pulse climbs and stays up, theta takes over until you are calm again.",
  },
];

const LOOP = [
  { t: "0:00", title: "Baseline", body: "Sixty seconds of listening. The band learns your settled heart rate and skin conductance." },
  { t: "1:00", title: "Settling in", body: "Alpha begins. Every threshold that follows is measured against you, not an average." },
  { t: "≥ 6:00", title: "Focus", body: "Five settled minutes, or a fifteen-minute cap, and gamma takes the lead." },
  {
    t: "When needed",
    title: "Relief",
    body: "Skin conductance up 15–20%, or heart rate up 10 bpm, held for thirty seconds: theta. Back to focus after a calm minute and at least three of theta.",
  },
  { t: "Last minutes", title: "Wind down", body: "Theta fades out as the session closes, and the summary waits for you in Insights." },
];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".atelier [data-reveal]");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/** 0 → 1 progress of `el` through its own scroll length (top at viewport top → bottom at viewport bottom). */
function useScrollProgress(ref: React.RefObject<HTMLElement | null>, onProgress: (p: number) => void) {
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      onProgress(span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0);
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
  }, [ref, onProgress]);
}

function Hero() {
  return (
    <section className="at-hero" id="top" data-tone="dark" aria-labelledby="at-hero-title">
      <img className="at-hero__img" src={`${M}/band-front.webp`} alt="" fetchPriority="high" />
      <div className="at-hero__veil" />
      <div className="at-hero__copy">
        <p className="at-eyebrow at-hero__eyebrow">StudyLoop · The study band</p>
        <h1 id="at-hero-title" className="at-display at-display--xl">
          Attention,
          <br />
          <em>worn lightly.</em>
        </h1>
      </div>
      <p className="at-hero__cue" aria-hidden="true">
        Scroll
      </p>
    </section>
  );
}

function Overture() {
  return (
    <section className="at-overture" data-tone="light" aria-label="Introduction">
      <p className="at-overture__text" data-reveal>
        A band that listens to your pulse and your skin. Headphones that answer with sound. Nothing to look at and
        nothing to tap, so the only thing in front of you is the work.
      </p>
    </section>
  );
}

function ObjectChapter() {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  useScrollProgress(ref, (p) => setStep(Math.min(OBJECT_STEPS.length - 1, Math.floor(p * OBJECT_STEPS.length))));

  return (
    <section ref={ref} className="at-pin" id="object" data-tone="light" aria-labelledby="at-object-title" style={{ "--steps": OBJECT_STEPS.length } as React.CSSProperties}>
      <div className="at-pin__stage">
        <div className="at-pin__media">
          {OBJECT_STEPS.map((s, i) => (
            <img key={s.img} src={s.img} alt={s.alt} className="at-pin__img" data-active={i === step || undefined} loading="lazy" />
          ))}
        </div>
        <article className="at-panel at-pin__panel">
          <p className="at-eyebrow">Chapter I</p>
          <h2 id="at-object-title" className="at-display at-display--md">
            The object
          </h2>
          <ol className="at-steps">
            {OBJECT_STEPS.map((s, i) => (
              <li key={s.label} data-active={i === step || undefined} aria-current={i === step ? "step" : undefined}>
                <p className="at-steps__label">{s.label}</p>
                <h3 className="at-steps__title">{s.title}</h3>
                <p className="at-steps__body">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="at-pin__ticks" aria-hidden="true">
            {OBJECT_STEPS.map((s, i) => (
              <span key={s.label} data-active={i <= step || undefined} />
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function InsideChapter() {
  return (
    <section className="at-inside" id="inside" data-tone="dark" aria-labelledby="at-inside-title">
      <div className="at-inside__frame">
        <img className="at-inside__img" src={`${M}/band-exploded.webp`} alt="The band opened in layers: cover, two circuit boards, battery and the sensor tray" loading="lazy" />
      </div>
      <article className="at-panel at-inside__panel" data-reveal>
        <p className="at-eyebrow">Chapter II</p>
        <h2 id="at-inside-title" className="at-display at-display--md">
          Inside
        </h2>
        <p className="at-body">
          Under the cover sit two small boards, a rechargeable cell and a tray that carries the sensors to your skin.
        </p>
        <dl className="at-specs">
          <div>
            <dt>Pulse</dt>
            <dd>Optical heart-rate sensor</dd>
          </div>
          <div>
            <dt>Skin</dt>
            <dd>Two brushed-steel contacts for skin conductance</dd>
          </div>
          <div>
            <dt>Link</dt>
            <dd>Bluetooth to the browser, or a simulated band for testing</dd>
          </div>
          <div>
            <dt>Light</dt>
            <dd>A single cyan line that shows the band is reading</dd>
          </div>
        </dl>
      </article>
      <div className="at-pair">
        <figure className="at-pair__fig" data-reveal>
          <img src={`${M}/macro-boards.webp`} alt="The two circuit boards and battery, separated" loading="lazy" />
          <figcaption>The boards and the cell, separated.</figcaption>
        </figure>
        <figure className="at-pair__fig at-pair__fig--low" data-reveal>
          <img src={`${M}/study-underside.webp`} alt="Underside of the band showing the two steel skin contacts" loading="lazy" />
          <figcaption>The underside: two contacts, flush to the skin.</figcaption>
        </figure>
      </div>
    </section>
  );
}

const TURN_FRAMES = Array.from({ length: 8 }, (_, i) => `${M}/turn-${i}.webp`);

function Turntable() {
  const ref = useRef<HTMLElement>(null);
  const [frame, setFrame] = useState(0);
  useScrollProgress(ref, (p) => setFrame(Math.min(TURN_FRAMES.length - 1, Math.round(p * (TURN_FRAMES.length - 1)))));

  return (
    <section ref={ref} className="at-turn" data-tone="dark" aria-label="The band from every side">
      <div className="at-turn__stage">
        <div className="at-turn__frames">
          {TURN_FRAMES.map((src, i) => (
            <img key={src} src={src} alt={i === 0 ? "The band rotating as you scroll" : ""} className="at-turn__img" data-active={i === frame || undefined} loading="lazy" />
          ))}
        </div>
        <p className="at-turn__caption">
          <span className="at-eyebrow">Turn it over</span>
          <span className="at-turn__count">
            {String(frame + 1).padStart(2, "0")} / {String(TURN_FRAMES.length).padStart(2, "0")}
          </span>
        </p>
      </div>
    </section>
  );
}

function SoundChapter() {
  return (
    <section className="at-sound" id="sound" data-tone="light" aria-labelledby="at-sound-title">
      <header className="at-sound__head" data-reveal>
        <p className="at-eyebrow">Chapter III</p>
        <h2 id="at-sound-title" className="at-display at-display--lg">
          Three states <em>of sound</em>
        </h2>
        <p className="at-lede">
          The headphones play non-lyrical audio tuned to a rhythm. The band decides which one, and when.
        </p>
      </header>
      <div className="at-sound__cols">
        {SOUND.map((s, i) => (
          <article key={s.band} className="at-sound__col" data-reveal style={{ "--i": i } as React.CSSProperties}>
            <p className="at-sound__hz">{s.hz}</p>
            <h3 className="at-display at-display--sm">{s.band}</h3>
            <p className="at-sound__meta">
              {s.kind} · {s.state}
            </p>
            <p className="at-body">{s.body}</p>
          </article>
        ))}
      </div>
      <p className="at-note" data-reveal>
        The research behind these rhythms is early and mixed. StudyLoop explores it; it does not promise it.
      </p>
    </section>
  );
}

function AngleBreak() {
  return (
    <section className="at-break" data-tone="dark" aria-label="The band at rest">
      <img className="at-break__img" src={`${M}/band-angle.webp`} alt="The band resting on dark stone, its cyan line lit" loading="lazy" />
      <p className="at-break__quote at-display at-display--lg" data-reveal>
        It reads you.
        <br />
        <em>You read your notes.</em>
      </p>
    </section>
  );
}

function LoopChapter() {
  return (
    <section className="at-loop" id="loop" data-tone="light" aria-labelledby="at-loop-title">
      <header className="at-loop__head" data-reveal>
        <p className="at-eyebrow">Chapter IV</p>
        <h2 id="at-loop-title" className="at-display at-display--lg">
          The loop
        </h2>
        <p className="at-lede">
          Three-minute minimum in every state. Thirty-second crossfades. Smoothing, so one deep breath never flips the
          sound.
        </p>
      </header>
      <ol className="at-timeline">
        {LOOP.map((s, i) => (
          <li key={s.title} data-reveal style={{ "--i": i } as React.CSSProperties}>
            <p className="at-timeline__t">{s.t}</p>
            <h3 className="at-timeline__title">{s.title}</h3>
            <p className="at-body">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function AtelierStory() {
  useReveal();
  // The atelier design has no loader screen; release everything that waits on the intro.
  useEffect(() => intro.finish(), []);
  return (
    <>
      <Hero />
      <Overture />
      <ObjectChapter />
      <InsideChapter />
      <Turntable />
      <SoundChapter />
      <AngleBreak />
      <LoopChapter />
    </>
  );
}

export function AtelierClosing() {
  return (
    <section className="at-closing" data-tone="light" aria-labelledby="at-closing-title">
      <img className="at-closing__img" src={`${M}/study-exploded.webp`} alt="" loading="lazy" />
      <div className="at-closing__copy" data-reveal>
        <h2 id="at-closing-title" className="at-display at-display--xl">
          <em>Begin.</em>
        </h2>
        <button type="button" className="at-button" onClick={() => scrollToEl(document.querySelector("#session"))}>
          Start a study session
        </button>
      </div>
    </section>
  );
}
