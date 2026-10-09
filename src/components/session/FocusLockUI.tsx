"use client";

import { BLOCK_GROUPS } from "@/lib/focus/blocklist";
import { focusLock, useFocusLock } from "@/lib/focus/focusLock";
import { Icon } from "../ui/Icon";

export function FocusLockSetup({ minutes }: { minutes: number }) {
  const f = useFocusLock();
  const status =
    f.extension === "connected"
      ? `Distracting websites are blocked for ${minutes} min by the Focus Lock extension. Phone apps aren't covered yet.`
      : f.extension === "checking"
        ? "Checking for the Focus Lock extension…"
        : "Needs the Focus Lock extension to block websites.";
  return (
    <fieldset className="field focus-lock">
      <legend className="label">Focus lock</legend>
      <div className="choice-row">
        <button
          type="button"
          role="switch"
          aria-checked={f.enabled}
          aria-describedby={f.enabled ? "focus-lock-status" : undefined}
          className={`choice focus-lock__switch is-${f.extension}`}
          onClick={() => focusLock.setEnabled(!f.enabled)}
          title={f.enabled ? status : "Block distracting sites until the session ends. Ending early asks first."}
        >
          <span className="focus-lock__dot" aria-hidden />
          {f.enabled ? "On" : "Off"}
        </button>
        {f.enabled &&
          BLOCK_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className="choice"
              aria-pressed={f.categories.includes(g.id)}
              onClick={() => focusLock.toggleCategory(g.id)}
              title={g.examples}
            >
              {g.label}
            </button>
          ))}
        {f.enabled && f.extension === "missing" && (
          <a className="choice focus-lock__install" href="/focus-lock" target="_blank" rel="noreferrer">
            <Icon name="alert" size={14} />
            Install
          </a>
        )}
      </div>
      {f.enabled && (
        <span id="focus-lock-status" className="sr-only" role="status">
          {status}
        </span>
      )}
    </fieldset>
  );
}

export function FocusLockChip() {
  const f = useFocusLock();
  if (!f.locked) return null;
  const until = f.until ? new Date(f.until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
  return (
    <p className="chip focus-lock__chip">
      <Icon name="flag" size={12} />
      Locked{until ? ` until ${until}` : ""}
      {f.extension !== "connected" ? " · this tab only" : ""}
    </p>
  );
}
