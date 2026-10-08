"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { beats, gammaBeats, type BeatBandId } from "@/lib/music/gamma";
import { LOOP_AUDIO, LOOP_RULES, type LoopMode } from "@/lib/loop/switch";
import { vibeEngine } from "@/lib/music/vibe/engine";
import { isDemo } from "@/lib/demo";
import { getPrefs, setPref } from "@/lib/prefs";
import { engine } from "@/lib/useStudyLoop";
import { Icon } from "../ui/Icon";

type Prompt = "music" | "beats-conflict" | null;

let open: Prompt = null;
const listeners = new Set<() => void>();
function show(p: Prompt) {
  open = p;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const LIVE_PHASES = ["baseline", "active", "paused"];

export function currentLoopMode(): LoopMode | null {
  const { phase, loop } = engine.getSnapshot().session;
  if (!LIVE_PHASES.includes(phase)) return null;
  return phase === "baseline" ? "settling" : (loop?.mode ?? "settling");
}

function loopBand(): BeatBandId {
  return LOOP_AUDIO[currentLoopMode() ?? "focus"].band;
}

function startLoop() {
  beats.setAuto(true);
  void gammaBeats.start([loopBand()]);
}

export function toggleBeats() {
  if (gammaBeats.getSnapshot()) return gammaBeats.stop();
  if (vibeEngine.getSnapshot().playing) {
    if (!getPrefs().autoPauseForBeats) return show("beats-conflict");
    vibeEngine.stop();
  }
  startLoop();
}

export const toggleLoop = toggleBeats;

function clearForBeats(): boolean {
  if (beats.getSnapshot()) return true;
  if (vibeEngine.getSnapshot().playing) {
    if (!getPrefs().autoPauseForBeats) {
      show("beats-conflict");
      return false;
    }
    vibeEngine.stop();
  }
  return true;
}

export function toggleBeatBand(id: BeatBandId) {
  const { active, auto } = beats.getState();
  const turningOn = auto || !active.includes(id);
  if (turningOn && !clearForBeats()) return;
  if (auto) {
    beats.setAuto(false);
    void beats.setBands([id]);
    return;
  }
  void beats.toggleBand(id);
}

export function playAuto() {
  const { auto, playing } = beats.getState();
  if (auto && playing) return beats.stop();
  if (!clearForBeats()) return;
  beats.setAuto(true);
  void beats.setBands([loopBand()]);
}

function followLoop() {
  const st = beats.getState();
  if (!st.auto || !st.playing) return;
  const mode = currentLoopMode();
  if (!mode) return;
  void beats.crossfadeTo(LOOP_AUDIO[mode].band, LOOP_RULES.crossfadeS);
  if (mode === "winddown") {
    const s = engine.getSnapshot().session;
    beats.fadeOut((s.config.minutes * 60_000 - s.elapsedMs) / 1000);
  }
}

if (typeof window !== "undefined") {
  let phase = engine.getSnapshot().session.phase;
  engine.subscribe(() => {
    const next = engine.getSnapshot().session.phase;
    const prev = phase;
    phase = next;
    followLoop();
    if (next === prev) return;

    const started = (prev === "idle" || prev === "complete") && (next === "baseline" || next === "active");
    if (started && !isDemo() && getPrefs().askMusicOnStart && !vibeEngine.getSnapshot().playing && !gammaBeats.getSnapshot()) {
      show("music");
    }

    if (next === "idle" || next === "complete") gammaBeats.stop();
  });

  vibeEngine.subscribe(() => {
    if (vibeEngine.getSnapshot().playing) gammaBeats.stop();
  });
}

export function SessionPrompts() {
  const prompt = useSyncExternalStore(subscribe, () => open, () => null);

  const dontAsk = useRef<HTMLInputElement>(null);
  const firstBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!prompt) return;
    firstBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && show(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prompt]);

  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          className="prompt-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && show(null)}
        >
          <motion.div
            className="prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-title"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <span className="prompt__icon" aria-hidden>
              <Icon name="music" size={18} />
            </span>
            {prompt === "music" ? (
              <>
                <h2 id="prompt-title" className="prompt__title">
                  Hey, we see you’re not listening to any Loop.
                </h2>
                <p className="prompt__body">
                  Want us to play the StudyLoop Loop? It starts on alpha to settle you in, moves to 40 Hz for focus,
                  and drops to theta if your band reads stress.
                </p>
                <div className="prompt__actions">
                  <button
                    ref={firstBtn}
                    type="button"
                    className="btn btn--primary"
                    onClick={() => {
                      show(null);
                      startLoop();
                    }}
                  >
                    Yes, start the Loop
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      show(null);
                      engine.setTab("music");
                    }}
                  >
                    Play my playlist
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => show(null)}>
                    No
                  </button>
                </div>
                <button
                  type="button"
                  className="prompt__never"
                  onClick={() => {
                    setPref("askMusicOnStart", false);
                    show(null);
                  }}
                >
                  Don’t ask me again
                </button>
              </>
            ) : (
              <>
                <h2 id="prompt-title" className="prompt__title">
                  Hey, you’ve already got some music flowing.
                </h2>
                <p className="prompt__body">Maybe want to pause that first? Then we’ll start the Loop.</p>
                <label className="prompt__check">
                  <input ref={dontAsk} type="checkbox" />
                  Don’t ask me again
                </label>
                <div className="prompt__actions">
                  <button
                    ref={firstBtn}
                    type="button"
                    className="btn btn--primary"
                    onClick={() => {
                      if (dontAsk.current?.checked) setPref("autoPauseForBeats", true);
                      show(null);
                      vibeEngine.stop();
                      startLoop();
                    }}
                  >
                    Yes, pause
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => show(null)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
