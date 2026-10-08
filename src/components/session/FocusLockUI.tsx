"use client";

import { BLOCK_GROUPS } from "@/lib/focus/blocklist";
import { focusLock, useFocusLock } from "@/lib/focus/focusLock";
import { Icon } from "../ui/Icon";

export function FocusLockSetup({ minutes }: { minutes: number }) {
  const f = useFocusLock();
  return (
    <fieldset className="field focus-lock">
      <legend className="label">Focus lock</legend>
      <button
        type="button"
        role="switch"
        aria-checked={f.enabled}
        className="toggle focus-lock__toggle"
        onClick={() => focusLock.setEnabled(!f.enabled)}
      >
        <span className="toggle__text">
          <span>Lock distractions for {minutes} min</span>
          <span className="small muted">Blocked until the session ends. Ending early asks first and is noted.</span>
        </span>
        <span className="toggle__track" aria-hidden>
          <span className="toggle__thumb" />
        </span>
      </button>
      {f.enabled && (
        <>
          <div className="choice-row" role="group" aria-label="What to block">
            {BLOCK_GROUPS.map((g) => (
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
          </div>
          <p className="small muted focus-lock__examples">
            {BLOCK_GROUPS.filter((g) => f.categories.includes(g.id))
              .map((g) => g.examples)
              .join(" · ") || "Nothing selected"}
          </p>
          <ul className="focus-lock__status">
            <li className={`focus-lock__line is-${f.extension}`}>
              <Icon name={f.extension === "connected" ? "check" : "alert"} size={14} />
              {f.extension === "connected" ? (
                <span>Websites: blocker connected in this browser.</span>
              ) : f.extension === "checking" ? (
                <span>Websites: checking for the blocker…</span>
              ) : (
                <span>
                  Websites: add the StudyLoop Focus Lock extension to block them.{" "}
                  <a href="/focus-lock" target="_blank" rel="noreferrer">
                    How to install
                  </a>
                </span>
              )}
            </li>
            <li className="focus-lock__line is-missing">
              <Icon name="alert" size={14} />
              <span>Phone apps: not yet. Locking Instagram or WhatsApp apps needs the StudyLoop phone app.</span>
            </li>
            <li className="focus-lock__line is-connected">
              <Icon name="check" size={14} />
              <span>Leaving this tab during a session is noted in Insights.</span>
            </li>
          </ul>
        </>
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
