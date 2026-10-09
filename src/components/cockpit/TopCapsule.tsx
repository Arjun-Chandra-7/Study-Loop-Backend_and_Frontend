"use client";

import { useState } from "react";
import { toggleTheme, useTheme } from "@/lib/prefs";
import { engine, useStudyLoop } from "@/lib/useStudyLoop";
import { Icon } from "../ui/Icon";
import { BandSimulatorPopover } from "./BandSimulator";

export function TopCapsule() {
  const s = useStudyLoop();
  const [sim, setSim] = useState(false);
  const theme = useTheme();
  const conn = s.reading.connection;
  const phase = s.session.phase;

  const sessionLabel =
    phase === "active" ? "Pause session" : phase === "paused" ? "Resume session" : "Open session";

  return (
    <div className="top-capsule glass" role="toolbar" aria-label="System controls">
      <CapsuleButton
        label={conn === "connected" ? "Disconnect band" : conn === "connecting" ? "Connecting…" : "Connect band"}
        onClick={engine.toggleConnection}
        pressed={conn === "connected"}
        tone="measured"
      >
        <Icon name="band" />
        <span className={`cap-dot cap-dot--${conn}`} aria-hidden />
      </CapsuleButton>
      <span data-sim-toggle className="cap-sim">
        <CapsuleButton label="Simulate band" onClick={() => setSim((o) => !o)} pressed={sim} expanded={sim} tone="measured">
          <Icon name="sliders" />
        </CapsuleButton>
      </span>
      <CapsuleButton label={sessionLabel} onClick={engine.togglePause} pressed={phase === "active"} tone="action">
        <Icon name={phase === "active" ? "pause" : "play"} />
      </CapsuleButton>
      <CapsuleButton
        label={s.research ? "Hide research layer" : "Show research layer"}
        onClick={engine.toggleResearch}
        pressed={s.research}
        tone="action"
      >
        <Icon name="wave" />
      </CapsuleButton>
      <CapsuleButton
        label={s.quiet ? "Leave quiet mode" : "Quiet mode"}
        onClick={engine.toggleQuiet}
        pressed={s.quiet}
        tone="neutral"
      >
        <Icon name="focus" />
      </CapsuleButton>
      <CapsuleButton
        label={theme === "dark" ? "Light mode" : "Dark mode"}
        onClick={toggleTheme}
        pressed={theme === "dark"}
        tone="neutral"
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} />
      </CapsuleButton>
      <BandSimulatorPopover open={sim} onClose={() => setSim(false)} />
    </div>
  );
}

function CapsuleButton({
  label,
  onClick,
  pressed,
  tone,
  expanded,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed: boolean;
  tone: "measured" | "action" | "neutral";
  expanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`cap-btn cap-btn--${tone}`}
      aria-label={label}
      aria-pressed={expanded === undefined ? pressed : undefined}
      aria-expanded={expanded}
      data-on={pressed || undefined}
      data-tip={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
