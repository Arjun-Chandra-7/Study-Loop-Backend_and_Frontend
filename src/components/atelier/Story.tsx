"use client";

import { useEffect } from "react";
import { scrollToEl } from "@/components/motion/SmoothScroll";
import { intro } from "@/lib/intro";
import { Universe } from "./Universe";

const M = "/media/atelier";

const SPREADS = [
  {
    img: `${M}/band-front.webp`,
    alt: "The StudyLoop band on dark stone, its cyan line lit and two steel contacts visible",
    side: "right" as const,
    label: "Materials",
    title: "Matte shell,",
    em: "woven strap",
    body: "A soft-touch polymer housing, two brushed-steel contacts and a woven textile strap. Nothing shines except the line that tells you it is working.",
  },
  {
    img: `${M}/band-exploded.webp`,
    alt: "The band opened: cover, two circuit boards, battery and the sensor tray",
    side: "left" as const,
    label: "Engineering",
    title: "Small enough",
    em: "to forget",
    body: "Two stacked boards and a slim cell sit inside the curve of the housing, leaving the underside free for the sensors that touch your skin.",
    specs: [
      ["Pulse", "Optical heart-rate sensor"],
      ["Skin", "Two steel contacts for skin conductance"],
      ["Link", "Bluetooth to the browser, or a simulated band"],
      ["Light", "One cyan line that shows the band is reading"],
    ],
  },
  {
    img: `${M}/band-angle.webp`,
    alt: "The band resting at an angle on a dark slab",
    side: "right" as const,
    label: "Wear",
    title: "Worn,",
    em: "not watched",
    body: "No notifications, no screen, no score to chase. The band only measures, and the session only changes the sound.",
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

function Spreads() {
  return (
    <section className="at-spreads" id="craft" data-tone="light" aria-label="Craft">
      {SPREADS.map((s) => (
        <article key={s.img} className="at-spread" data-side={s.side}>
          <figure className="at-spread__figure" data-reveal>
            <img src={s.img} alt={s.alt} loading="lazy" />
          </figure>
          <div className="at-panel at-spread__panel" data-reveal>
            <p className="at-eyebrow">{s.label}</p>
            <h2 className="at-display at-display--md">
              {s.title} <em>{s.em}</em>
            </h2>
            <p className="at-body">{s.body}</p>
            {s.specs && (
              <dl className="at-specs">
                {s.specs.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

function SoundChapter() {
  return (
    <section className="at-sound" id="sound" data-tone="light" aria-labelledby="at-sound-title">
      <header className="at-sound__head" data-reveal>
        <p className="at-eyebrow">The sound</p>
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

function LoopChapter() {
  return (
    <section className="at-loop" id="loop" data-tone="light" aria-labelledby="at-loop-title">
      <header className="at-loop__head" data-reveal>
        <p className="at-eyebrow">The loop</p>
        <h2 id="at-loop-title" className="at-display at-display--lg">
          It listens, <em>then it answers</em>
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
      <Universe />
      <Overture />
      <Spreads />
      <SoundChapter />
      <LoopChapter />
    </>
  );
}

export function AtelierClosing() {
  return (
    <section className="at-closing" data-tone="light" aria-labelledby="at-closing-title">
      <figure className="at-closing__figure" data-reveal>
        <img src={`${M}/study-exploded.webp`} alt="" loading="lazy" />
      </figure>
      <div className="at-closing__copy" data-reveal>
        <p className="at-eyebrow">Your next session</p>
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
