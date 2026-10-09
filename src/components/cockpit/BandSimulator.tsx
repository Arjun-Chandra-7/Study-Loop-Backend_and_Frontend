"use client";

import { useEffect, useRef } from "react";
import { BEAT_INFO, useLoopAudio } from "@/lib/audio/loopAudio";
import { LOOP_AUDIO } from "@/lib/loop/switch";
import { PHYSIO_LABEL } from "@/lib/sensors/classify";
import type { MockScenario } from "@/lib/sensors/types";
import { engine, useStudyLoop } from "@/lib/useStudyLoop";

const SCENARIOS: { id: MockScenario; label: string; hint: string }[] = [
  { id: "normal", label: "Calm", hint: "Heart rate and skin conductance settle near baseline" },
  { id: "elevated", label: "Stress", hint: "Heart rate and skin conductance climb and stay up" },
  { id: "recovery", label: "Recovery", hint: "Signals ease back down toward baseline" },
  { id: "poorSignal", label: "Poor contact", hint: "Loose band: noisy readings and dropouts" },
  { id: "lowBattery", label: "Low battery", hint: "Battery drops toward empty" },
  { id: "disconnected", label: "Disconnect", hint: "The band drops out" },
];

const SPEEDS = [1, 5, 10];
const SPIKE_MS = 40_000;

let spikeTimer: ReturnType<typeof setTimeout> | null = null;
function stressSpike() {
  engine.demoScenario("elevated");
  if (spikeTimer) clearTimeout(spikeTimer);
  spikeTimer = setTimeout(() => engine.demoScenario("recovery"), SPIKE_MS);
}

export function BandSimulator() {
  const s = useStudyLoop();
  const audio = useLoopAudio();
  const r = s.reading;
  const connected = r.connection === "connected";
  const phase = s.session.phase;
  const mode = s.session.loop?.mode;

  return (
    <div className="band-sim" role="group" aria-label="Simulate the band">
      <div className="band-sim__head">
        <p className="label">Simulate</p>
        <p className="small muted tnum">
          {connected ? `${r.hr != null ? Math.round(r.hr) : "—"} bpm · ${r.eda != null ? r.eda.toFixed(2) : "—"} µS · ${PHYSIO_LABEL[s.physio]}` : "Band offline"}
        </p>
      </div>

      {!connected && (
        <button type="button" className="beats-pill" onClick={() => void engine.connectSimulated()}>
          Connect a simulated band
        </button>
      )}

      <div className="band-sim__row" role="group" aria-label="Band scenario">
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            type="button"
            className={`beats-pill ${s.scenario === sc.id ? "is-on" : ""}`}
            aria-pressed={s.scenario === sc.id}
            onClick={() => engine.demoScenario(sc.id)}
            title={sc.hint}
          >
            {sc.label}
          </button>
        ))}
        <button type="button" className="beats-pill beats-pill--blend" onClick={stressSpike} title="40 s of stress, then recovery">
          Stress spike
        </button>
      </div>

      <div className="band-sim__row" role="group" aria-label="Time speed">
        <span className="band-sim__label">Speed</span>
        {SPEEDS.map((x) => (
          <button
            key={x}
            type="button"
            className={`beats-pill ${s.speed === x ? "is-on" : ""}`}
            aria-pressed={s.speed === x}
            onClick={() => engine.setSpeed(x)}
          >
            {x}×
          </button>
        ))}
      </div>

      <div className="band-sim__row">
        <span className="band-sim__label">Session</span>
        <button type="button" className="beats-pill" disabled={phase !== "baseline"} onClick={engine.skipBaseline}>
          Skip baseline
        </button>
        <button type="button" className="beats-pill" disabled={phase !== "active"} onClick={() => engine.skipAhead(5 * 60_000)}>
          +5 min
        </button>
      </div>

      <p className="small muted band-sim__loop">
        Loop rule:{" "}
        {phase === "baseline" ? "Baseline" : phase === "active" || phase === "paused" ? LOOP_AUDIO[mode ?? "settling"].label : "No session"}
        {audio.playing && audio.state ? ` · playing ${BEAT_INFO[audio.state].label}` : ""}
      </p>
    </div>
  );
}

export function BandSimulatorPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !(t as Element).closest?.("[data-sim-toggle]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className="band-sim-pop">
      <BandSimulator />
    </div>
  );
}
