"use client";

import { useState } from "react";
import { beatDescription, BEAT_INFO, loopAudio, useLoopAudio, type Mix } from "@/lib/audio/loopAudio";
import { NOISE_COLORS } from "@/lib/audio/noise";
import { toggleLoop } from "./SessionPrompts";
import { Icon } from "../ui/Icon";

const MIX_LABELS: Record<keyof Mix, string> = { noise: "Noise", beat: "Beat", master: "Master" };

export function LoopSoundSettings() {
  const a = useLoopAudio();
  return (
    <div className="loop-sound">
      <div className="loop-sound__row" role="radiogroup" aria-label="Noise colour">
        <span className="loop-sound__label">Noise</span>
        {NOISE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={a.noise === c}
            className={`beats-pill ${a.noise === c ? "is-on" : ""}`}
            onClick={() => loopAudio.setNoiseColor(c)}
          >
            {c[0].toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>
      {(Object.keys(MIX_LABELS) as (keyof Mix)[]).map((k) => (
        <label key={k} className="loop-sound__slider">
          <span className="loop-sound__label">{MIX_LABELS[k]}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(a.mix[k] * 100)}
            onChange={(e) => loopAudio.setMix({ [k]: Number(e.target.value) / 100 })}
          />
          <span className="loop-sound__val tnum">{Math.round(a.mix[k] * 100)}</span>
        </label>
      ))}
      <div className="loop-sound__row">
        <span className="loop-sound__label">Ear test</span>
        <button type="button" className="beats-pill" onClick={() => void loopAudio.testEar("left")}>
          Left
        </button>
        <button type="button" className="beats-pill" onClick={() => void loopAudio.testEar("right")}>
          Right
        </button>
      </div>
    </div>
  );
}

export function LoopNowPlaying() {
  const a = useLoopAudio();
  const [open, setOpen] = useState(false);
  if (!a.playing) return null;
  const info = a.state ? BEAT_INFO[a.state] : null;
  return (
    <aside className="loop-now" aria-label="Now playing">
      <div className="loop-now__bar">
        <span className="loop-now__icon" aria-hidden>
          <Icon name="wave" size={14} />
        </span>
        <div className="loop-now__text" aria-live="polite">
          <b className="loop-now__title">
            {info ? info.label : "Noise only"} <em className="loop-now__exp">Experimental</em>
          </b>
          <span>
            {a.state ? beatDescription(a.state) : "beat starts after the baseline"} · {a.noise} noise
          </span>
        </div>
        <button
          type="button"
          className="loop-now__btn"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Sound settings"
          title="Sound settings"
        >
          <Icon name="sliders" size={16} />
        </button>
        <button
          type="button"
          className="loop-now__btn"
          onClick={() => loopAudio.setMuted(!a.muted)}
          aria-pressed={a.muted}
          aria-label={a.muted ? "Unmute Loop" : "Mute Loop"}
          title={a.muted ? "Unmute" : "Mute"}
        >
          <Icon name={a.muted ? "mute" : "volume"} size={16} />
        </button>
        <button type="button" className="loop-now__btn loop-now__btn--stop" onClick={toggleLoop} aria-label="Stop Loop" title="Stop">
          <Icon name="stop" size={16} />
        </button>
      </div>
      {open && <LoopSoundSettings />}
    </aside>
  );
}
