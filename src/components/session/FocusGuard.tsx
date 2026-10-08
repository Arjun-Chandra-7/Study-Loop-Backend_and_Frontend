"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { focusLock } from "@/lib/focus/focusLock";
import { clock } from "@/lib/format";
import { engine } from "@/lib/useStudyLoop";
import { Icon } from "../ui/Icon";

type Overlay = { kind: "confirm-end" } | { kind: "away"; awayMs: number; leftMs: number } | null;

let overlay: Overlay = null;
const listeners = new Set<() => void>();
function show(o: Overlay) {
  overlay = o;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

const AWAY_MIN_MS = 3000;

function remainingMs() {
  const { config, elapsedMs } = engine.getSnapshot().session;
  return Math.max(0, config.minutes * 60_000 - elapsedMs);
}

function isRunning() {
  const p = engine.getSnapshot().session.phase;
  return p === "baseline" || p === "active" || p === "paused";
}

export function requestEnd() {
  if (focusLock.getSnapshot().locked && isRunning() && engine.getSnapshot().session.phase !== "baseline") {
    show({ kind: "confirm-end" });
    return;
  }
  engine.end();
}

function endAndUnlock() {
  engine.logFocus("unlocked-early");
  show(null);
  engine.end();
}

if (typeof window !== "undefined") {
  let phase = engine.getSnapshot().session.phase;
  engine.subscribe(() => {
    const s = engine.getSnapshot().session;
    const prev = phase;
    phase = s.phase;
    if (prev === s.phase) return;
    const fresh = (prev === "idle" || prev === "complete") && (s.phase === "baseline" || s.phase === "active");
    if (fresh) {
      const lead = s.phase === "baseline" ? engine.baselineMs : 0;
      void focusLock.lock(Date.now() + lead + s.config.minutes * 60_000, s.config.subject);
    } else if (prev === "paused" && s.phase === "active" && focusLock.getSnapshot().locked) {
      void focusLock.lock(Date.now() + remainingMs(), s.config.subject);
    } else if ((s.phase === "idle" || s.phase === "complete") && focusLock.getSnapshot().locked) {
      void focusLock.unlock();
      if (overlay?.kind === "confirm-end") show(null);
    }
  });

  let awayAt: number | null = null;
  document.addEventListener("visibilitychange", () => {
    const watching = focusLock.getSnapshot().locked && engine.getSnapshot().session.phase === "active";
    if (document.visibilityState === "hidden") {
      awayAt = watching ? Date.now() : null;
      return;
    }
    if (awayAt == null) return;
    const awayMs = Date.now() - awayAt;
    awayAt = null;
    if (!watching || awayMs < AWAY_MIN_MS) return;
    engine.logFocus(`away:${Math.round(awayMs / 1000)}s`);
    show({ kind: "away", awayMs, leftMs: remainingMs() });
  });
}

export function FocusGuard() {
  const o = useSyncExternalStore(subscribe, () => overlay, () => null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!o) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && show(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [o]);

  return (
    <AnimatePresence>
      {o && (
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
            aria-labelledby="focus-title"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <span className="prompt__icon" aria-hidden>
              <Icon name="flag" size={18} />
            </span>
            {o.kind === "confirm-end" ? (
              <>
                <h2 id="focus-title" className="prompt__title">
                  End early and unlock?
                </h2>
                <p className="prompt__body">
                  Focus lock is on for another {clock(remainingMs())}. Ending now lifts the lock and is noted in this
                  session.
                </p>
                <div className="prompt__actions">
                  <button ref={first} type="button" className="btn btn--primary" onClick={() => show(null)}>
                    Keep studying
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={endAndUnlock}>
                    End and unlock
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="focus-title" className="prompt__title">
                  You stepped away for {clock(o.awayMs)}
                </h2>
                <p className="prompt__body">
                  Focus lock is still on, with {clock(o.leftMs)} to go. It’s noted in your session so you can see it in
                  Insights.
                </p>
                <div className="prompt__actions">
                  <button ref={first} type="button" className="btn btn--primary" onClick={() => show(null)}>
                    Back to it
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
