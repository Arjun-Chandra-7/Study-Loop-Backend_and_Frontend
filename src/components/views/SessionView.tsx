"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { clock } from "@/lib/format";
import { PHYSIO_HINT } from "@/lib/sensors/classify";
import { BEAT_INFO, BEAT_STATES, useLoopAudio } from "@/lib/audio/loopAudio";
import { isDemo } from "@/lib/demo";
import { LOOP_AUDIO } from "@/lib/loop/switch";
import { engine, useStudyLoop } from "@/lib/useStudyLoop";
import { Sparkline } from "../charts/Sparkline";
import { orbFor } from "../orb/orbState";
import { StateOrb } from "../orb/StateOrb";
import { requestEnd } from "../session/FocusGuard";
import { FocusLockChip } from "../session/FocusLockUI";
import { SentenceSetup } from "../session/SentenceSetup";
import { currentLoopMode, forceState, resumeFollow, toggleLoop, useLoopFollow } from "../session/SessionPrompts";
import { Icon } from "../ui/Icon";
import { Magnetic } from "../ui/Magnetic";
import { StateBadge } from "../ui/StateBadge";


function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize(Math.floor(Math.min(width, height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function useOrb() {
  const s = useStudyLoop();
  return orbFor({
    connection: s.reading.connection,
    phase: s.session.phase,
    physio: s.physio,
    research: s.research,
  });
}

export function SessionView() {
  const { session } = useStudyLoop();
  const phase = session.phase;
  const key = phase === "paused" ? "active" : phase;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        className="view-fill"
        initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
        transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {phase === "idle" && <SentenceSetup />}
        {phase === "baseline" && <BaselineCapture />}
        {(phase === "active" || phase === "paused") && <LiveSession />}
        {phase === "complete" && <SessionComplete />}
      </motion.div>
    </AnimatePresence>
  );
}

function BaselineCapture() {
  const s = useStudyLoop();
  const orb = useOrb();
  const [box, size] = useBoxSize<HTMLDivElement>();
  const p = s.session.baselineProgress;
  const remaining = Math.ceil(((1 - p) * engine.baselineMs) / 1000);
  const ring = Math.min(size, 380);
  const r = ring / 2 - 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="baseline">
      <div className="baseline__orb" ref={box}>
        {size > 0 && (
          <div className="ring-wrap" style={{ width: ring, height: ring }}>
            <svg width={ring} height={ring} className="ring" aria-hidden>
              <circle cx={ring / 2} cy={ring / 2} r={r} className="ring__track" />
              <circle
                cx={ring / 2}
                cy={ring / 2}
                r={r}
                className="ring__fill"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - p)}
              />
            </svg>
            <StateOrb {...orb} size={Math.round(ring * 0.72)} density={1.6} dotScale={0.6} className="ring__orb" />
          </div>
        )}
      </div>
      <div className="baseline__copy" aria-live="polite">
        <p className="label label--action">Capturing baseline</p>
        <p className="timer timer--md tnum">00:{String(remaining).padStart(2, "0")}</p>
        <p className="serif serif--md">Sit still. Breathe normally.</p>
        <p className="small muted">
          The band is learning your resting heart rate and skin conductance. Every state you see later is relative to
          this moment.
        </p>
      </div>
    </div>
  );
}

function LiveSession() {
  const s = useStudyLoop();
  const { config, elapsedMs, phase } = s.session;
  const orb = useOrb();
  const [box, size] = useBoxSize<HTMLDivElement>();
  const remaining = config.minutes * 60_000 - elapsedMs;
  const paused = phase === "paused";

  return (
    <div className={`live ${paused ? "is-paused" : ""}`}>
      <div className="live__left">
        <div className="live__subject">
          <p className="label">{config.subject}</p>
          <p className="serif serif--lg">{config.topic || "Untitled topic"}</p>
        </div>
        <div className="live__timer">
          <p className="timer tnum" aria-label={`${clock(remaining)} remaining`}>
            {clock(remaining)}
          </p>
          <p className="small muted">
            {paused ? "Paused" : "Remaining"} · {config.minutes} min {config.mode.toLowerCase()}
          </p>
          <FocusLockChip />
        </div>
        <div className="live__state" aria-live="polite">
          {paused ? (
            <span className="state state--paused state--lg">
              <Icon name="pause" size={20} />
              <span>Paused</span>
            </span>
          ) : (
            <StateBadge state={s.physio} size="lg" />
          )}
          <p className="small muted">{paused ? "Paused. Pick up right where you left off whenever you're ready." : PHYSIO_HINT[s.physio]}</p>
        </div>
      </div>
      <div className="live__orb" ref={box}>
        {size > 0 && (
          <StateOrb {...orb} size={Math.min(size, 420)} paused={paused} density={2.6} dotScale={0.85} />
        )}
        {s.research && !paused && (
          <span className="chip chip--action-outline live__research">Research layer · experimental</span>
        )}
      </div>
    </div>
  );
}

function SessionComplete() {
  const s = useStudyLoop();
  const last = s.summaries[0];
  if (!last) return null;
  return (
    <div className="complete">
      <div className="complete__head">
        <p className="label label--measured">
          <Icon name="check" size={14} /> Session complete
        </p>
        <p className="timer tnum">{clock(last.minutes * 60_000)}</p>
        <p className="serif serif--lg">
          {last.subject} — {last.topic}
        </p>
      </div>
      <dl className="stat-row">
        <div>
          <dt>Near baseline</dt>
          <dd className="tnum">{Math.round(last.stableShare * 100)}%</dd>
        </div>
        <div>
          <dt>Elevated moments</dt>
          <dd className="tnum">{last.elevatedMoments}</dd>
        </div>
        <div>
          <dt>Moments you marked</dt>
          <dd className="tnum">{last.marks}</dd>
        </div>
      </dl>
      <div className="complete__spark">
        <Sparkline values={last.samples.map((x) => x.eda)} baseline={last.baseline?.eda} height={64} />
      </div>
    </div>
  );
}

export function SessionFoot() {
  const s = useStudyLoop();
  const phase = s.session.phase;
  const orb = orbFor({ connection: s.reading.connection, phase, physio: s.physio, research: s.research });

  if (phase === "idle") {
    const ready = s.reading.connection === "connected";
    return (
      <div className="foot">
        <p className="foot__status" role="status">
          <span className={`link-dot link-dot--${s.reading.connection}`} aria-hidden />
          {ready
            ? "Band ready · keep your wrist still for the baseline"
            : s.reading.connection === "connecting"
              ? "Pairing with your band…"
              : "No band — you can still run a timed session"}
        </p>
        {s.reading.connection === "disconnected" && (
          <button type="button" className="btn btn--ghost" onClick={engine.connect}>
            <Icon name="link" size={16} />
            Connect band
          </button>
        )}
        <Magnetic>
          <button type="button" className="btn btn--primary" disabled={s.reading.connection === "connecting"} onClick={engine.beginSession}>
            {ready ? "Begin baseline" : "Start without band"}
            <Icon name="arrow" size={16} />
          </button>
        </Magnetic>
      </div>
    );
  }
  if (phase === "baseline") {
    return (
      <div className="foot">
        <p className="foot__status">{orb.label}</p>
        <div className="btn-row">
          <LoopControl />
          <button type="button" className="btn btn--ghost" onClick={requestEnd}>
            Cancel
          </button>
        </div>
      </div>
    );
  }
  if (phase === "complete") {
    return (
      <div className="foot">
        <p className="foot__status">Saved to Insights</p>
        <div className="btn-row">
          <button type="button" className="btn btn--ghost" onClick={engine.newSession}>
            New session
          </button>
          <button type="button" className="btn btn--primary" onClick={() => engine.setTab("insights")}>
            Review in Insights
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>
    );
  }
  const paused = phase === "paused";
  return (
    <div className="foot">
      <p className="foot__status">{orb.label}</p>
      <div className="btn-row">
        <LoopControl />
        <button type="button" className="btn btn--ghost" onClick={engine.mark} disabled={paused}>
          <Icon name="flag" size={16} />
          Mark moment
        </button>
        <button type="button" className="btn btn--ghost" onClick={requestEnd}>
          <Icon name="stop" size={16} />
          End
        </button>
        <button type="button" className={`btn ${paused ? "btn--primary" : "btn--solid"}`} onClick={engine.togglePause}>
          <Icon name={paused ? "play" : "pause"} size={16} />
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
    </div>
  );
}

function LoopControl() {
  const a = useLoopAudio();
  const follow = useLoopFollow();
  useStudyLoop();
  const mode = currentLoopMode();
  const demo = isDemo();
  return (
    <div className={`beats-bands ${a.playing ? "is-live" : ""}`} role="group" aria-label="Loop">
      <span className="beats-bands__label">
        <Icon name="wave" size={14} />
        Loop
        <span className="loop-now__exp">Experimental</span>
      </span>
      <button type="button" className={`beats-pill ${a.playing ? "is-on" : ""}`} aria-pressed={a.playing} onClick={toggleLoop}>
        {a.playing ? "Stop" : "Start"}
      </button>
      {demo &&
        BEAT_STATES.map((st) => (
          <button
            key={st}
            type="button"
            className={`beats-pill ${!follow && a.state === st ? "is-on" : ""}`}
            aria-pressed={!follow && a.state === st}
            onClick={() => forceState(st)}
            title={`Force ${BEAT_INFO[st].label} (demo)`}
          >
            {BEAT_INFO[st].label}
          </button>
        ))}
      {demo && !follow && (
        <button type="button" className="beats-pill beats-pill--blend" onClick={resumeFollow} title="Follow the band again">
          Auto
        </button>
      )}
      {a.playing && follow && mode && (
        <span className="beats-bands__stage" aria-live="polite">
          {LOOP_AUDIO[mode].label} · {BEAT_INFO[LOOP_AUDIO[mode].state].label}
        </span>
      )}
    </div>
  );
}
