"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { loopAudio, type BeatState } from "@/lib/audio/loopAudio";
import { LOOP_AUDIO, type LoopMode } from "@/lib/loop/switch";
import { vibeEngine } from "@/lib/music/vibe/engine";
import { isDemo } from "@/lib/demo";
import { getPrefs, setPref } from "@/lib/prefs";
import { engine } from "@/lib/useStudyLoop";
import { Icon } from "../ui/Icon";

type Prompt = "music" | "beats-conflict" | "ear-test" | null;

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

const ACTIVE_PHASES = ["active", "paused"];

export function currentLoopMode(): LoopMode | null {
  const { phase, loop } = engine.getSnapshot().session;
  if (!ACTIVE_PHASES.includes(phase)) return null;
  return loop?.mode ?? "settling";
}

function sessionState(): BeatState | null {
  const mode = currentLoopMode();
  return mode ? LOOP_AUDIO[mode].state : null;
}

function startingState(): BeatState | null {
  const phase = engine.getSnapshot().session.phase;
  if (phase === "baseline") return null;
  return sessionState() ?? "gamma";
}

let follow = true;
const followListeners = new Set<() => void>();
function setFollow(v: boolean) {
  follow = v;
  followListeners.forEach((l) => l());
}
export function useLoopFollow() {
  return useSyncExternalStore(
    (l) => {
      followListeners.add(l);
      return () => {
        followListeners.delete(l);
      };
    },
    () => follow,
    () => true,
  );
}

let pendingForce: BeatState | null = null;

function begin(state: BeatState | null) {
  if (!getPrefs().earTestDone) {
    pendingForce = state;
    show("ear-test");
    return;
  }
  void loopAudio.start(state);
}

function clearForLoop(): boolean {
  if (loopAudio.getSnapshot().playing) return true;
  if (vibeEngine.getSnapshot().playing) {
    if (!getPrefs().autoPauseForBeats) {
      show("beats-conflict");
      return false;
    }
    vibeEngine.stop();
  }
  return true;
}

function startLoop() {
  setFollow(true);
  begin(startingState());
}

export function toggleLoop() {
  if (loopAudio.getSnapshot().playing) return loopAudio.stop();
  if (!clearForLoop()) return;
  startLoop();
}

export const toggleBeats = toggleLoop;

export function forceState(state: BeatState) {
  setFollow(false);
  if (loopAudio.getSnapshot().playing) return loopAudio.setState(state);
  if (!clearForLoop()) return;
  begin(state);
}

export function resumeFollow() {
  setFollow(true);
  followLoop();
}

function followLoop() {
  if (!follow || !loopAudio.getSnapshot().playing) return;
  const state = sessionState();
  if (state && state !== loopAudio.getSnapshot().state) loopAudio.setState(state);
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
    if (started && !isDemo() && getPrefs().askMusicOnStart && !vibeEngine.getSnapshot().playing && !loopAudio.getSnapshot().playing) {
      show("music");
    }

    if ((next === "idle" || next === "complete") && loopAudio.getSnapshot().playing) {
      if (prev === "baseline") loopAudio.stop();
      else loopAudio.setState("winddown");
    }
  });

  loopAudio.onLog((e) => {
    if (e.kind === "state") engine.logAudio(`state:${e.value}`);
    else if (e.kind === "noise") engine.logAudio(`noise:${e.value}`);
    else if (e.kind === "start") engine.logAudio(`noise:${e.value}`);
    else if (e.kind === "stop") engine.logAudio("state:off");
  });

  vibeEngine.subscribe(() => {
    if (vibeEngine.getSnapshot().playing && loopAudio.getSnapshot().playing) loopAudio.stop();
  });
}

function EarTest({ firstBtn }: { firstBtn: React.RefObject<HTMLButtonElement | null> }) {
  return (
    <>
      <h2 id="prompt-title" className="prompt__title">
        Headphones required
      </h2>
      <p className="prompt__body">
        Alpha and theta are binaural beats: your left and right ear each get a slightly different tone. They only work on
        headphones. Put them on and check both sides.
      </p>
      <div className="prompt__actions">
        <button ref={firstBtn} type="button" className="btn btn--ghost" onClick={() => void loopAudio.testEar("left")}>
          Play left
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => void loopAudio.testEar("right")}>
          Play right
        </button>
      </div>
      <div className="prompt__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setPref("earTestDone", true);
            show(null);
            void loopAudio.start(pendingForce);
            pendingForce = null;
          }}
        >
          Both sides sound right, start
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => show(null)}>
          Cancel
        </button>
      </div>
      <p className="prompt__fine">Experimental audio. Not a medical treatment.</p>
    </>
  );
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
            {prompt === "ear-test" ? (
              <EarTest firstBtn={firstBtn} />
            ) : prompt === "music" ? (
              <>
                <h2 id="prompt-title" className="prompt__title">
                  Hey, we see you’re not listening to any Loop.
                </h2>
                <p className="prompt__body">
                  Want us to play the StudyLoop Loop? Soft noise with an experimental beat layer that follows your band:
                  alpha to settle in, 40 Hz for focus, theta if stress rises.
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
