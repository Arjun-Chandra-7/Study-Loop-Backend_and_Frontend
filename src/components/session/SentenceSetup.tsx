"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { StudyMode } from "@/lib/engine";
import { BLOCK_GROUPS } from "@/lib/focus/blocklist";
import { focusLock, useFocusLock } from "@/lib/focus/focusLock";
import { engine, useStudyLoop } from "@/lib/useStudyLoop";
import { Icon } from "../ui/Icon";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology", "History", "Literature"];
const DURATIONS = [25, 45, 60, 90];
const MODES: StudyMode[] = ["Deep work", "Review", "Practice"];

/**
 * Session setup written as one sentence. Every underlined word is a choice:
 * click it for a small menu, or type straight into the topic.
 */
export function SentenceSetup() {
  const s = useStudyLoop();
  const { config } = s.session;
  const f = useFocusLock();
  const picked = f.enabled ? BLOCK_GROUPS.filter((g) => f.categories.includes(g.id)) : [];
  const lockWord =
    picked.length === 0
      ? "nothing"
      : picked.length === BLOCK_GROUPS.length
        ? "every distraction"
        : picked.length <= 2
          ? picked.map((g) => g.label.toLowerCase()).join(" & ")
          : `${picked.length} distractions`;

  return (
    <div className="setup nl">
      <p className="eyebrow nl__eyebrow">
        <span className="eyebrow__rule" aria-hidden />
        New session
      </p>
      <h2 className="sr-only">Set up your session</h2>
      <p className="nl__sentence">
        <span className="nl__word">I&apos;m studying</span>{" "}
        <Choice
          label="Subject"
          value={config.subject}
          options={SUBJECTS.map((v) => ({ value: v, label: v }))}
          onPick={(v) => engine.configure({ subject: v })}
        />
        <span className="nl__word">,</span> <TopicInput value={config.topic} />
        <span className="nl__word">, for</span>{" "}
        <Choice
          label="Length"
          value={String(config.minutes)}
          display={`${config.minutes} min`}
          options={DURATIONS.map((m) => ({ value: String(m), label: `${m} minutes` }))}
          onPick={(v) => engine.configure({ minutes: Number(v) })}
        />{" "}
        <span className="nl__word">of</span>{" "}
        <Choice
          label="Mode"
          value={config.mode}
          display={config.mode.toLowerCase()}
          options={MODES.map((m) => ({ value: m, label: m, hint: MODE_HINT[m] }))}
          onPick={(v) => engine.configure({ mode: v as StudyMode })}
        />
        <span className="nl__word">, with</span>{" "}
        <LockChoice word={lockWord} minutes={config.minutes} />{" "}
        <span className="nl__word">locked.</span>
      </p>
      <p className="nl__hint small">
        {f.enabled && picked.length > 0 && f.extension === "missing" ? (
          <>
            <span className="nl__dot is-warn" aria-hidden />
            <span>
              Locking websites needs the Focus Lock extension.{" "}
              <a href="/focus-lock" target="_blank" rel="noreferrer">
                Install it
              </a>
            </span>
          </>
        ) : (
          <>
            <span className="nl__dot" aria-hidden />
            <span>Tap any underlined word to change it.</span>
          </>
        )}
      </p>
    </div>
  );
}

const MODE_HINT: Record<StudyMode, string> = {
  "Deep work": "New material, long focus",
  Review: "Going over what you know",
  Practice: "Problems and past papers",
};

type Option = { value: string; label: string; hint?: string };

function Choice({
  label,
  value,
  display,
  options,
  onPick,
}: {
  label: string;
  value: string;
  display?: string;
  options: Option[];
  onPick: (v: string) => void;
}) {
  return (
    <Popover label={label} trigger={display ?? value}>
      <OptionList label={label} value={value} options={options} onPick={onPick} />
    </Popover>
  );
}

function OptionList({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: string;
  options: Option[];
  onPick: (v: string) => void;
}) {
  const close = useContext(CloseMenu);
  return (
    <div role="listbox" aria-label={label} className="nl-menu__list">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="option"
          aria-selected={o.value === value}
          className="nl-menu__item"
          onClick={() => {
            onPick(o.value);
            close();
          }}
        >
          <span>
            {o.label}
            {o.hint && <small>{o.hint}</small>}
          </span>
          {o.value === value && <Icon name="check" size={16} />}
        </button>
      ))}
    </div>
  );
}

function LockChoice({ word, minutes }: { word: string; minutes: number }) {
  const f = useFocusLock();
  const status = f.extension === "connected" ? "ok" : f.extension === "missing" ? "warn" : "wait";
  return (
    <Popover label="Focus lock" trigger={word} badge={f.enabled && f.categories.length > 0 ? status : undefined}>
      {
        <div className="nl-menu__list">
          <p className="nl-menu__title">Blocked for {minutes} min</p>
          {BLOCK_GROUPS.map((g) => {
            const on = f.enabled && f.categories.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                className="nl-menu__item"
                onClick={() => {
                  if (!f.enabled) {
                    focusLock.setEnabled(true);
                    if (!f.categories.includes(g.id)) focusLock.toggleCategory(g.id);
                    return;
                  }
                  focusLock.toggleCategory(g.id);
                }}
              >
                <span>
                  {g.label}
                  <small>{g.examples}</small>
                </span>
                <span className="nl-check" aria-hidden>
                  {on && <Icon name="check" size={14} />}
                </span>
              </button>
            );
          })}
          <p className={`nl-menu__foot is-${status}`}>
            {f.extension === "connected" ? (
              "Blocker connected. Phone apps aren't covered yet."
            ) : f.extension === "checking" ? (
              "Looking for the Focus Lock extension…"
            ) : (
              <>
                Needs the Focus Lock extension.{" "}
                <a href="/focus-lock" target="_blank" rel="noreferrer">
                  Install
                </a>
              </>
            )}
          </p>
        </div>
      }
    </Popover>
  );
}

function TopicInput({ value }: { value: string }) {
  return (
    <label className="nl-topic" data-value={value || "a topic"}>
      <span className="sr-only">Topic</span>
      <input
        value={value}
        onChange={(e) => engine.configure({ topic: e.target.value })}
        placeholder="a topic"
        maxLength={60}
        size={1}
        spellCheck={false}
      />
    </label>
  );
}

const CloseMenu = createContext<() => void>(() => {});

/** A word in the sentence that opens a small menu right under it. */
function Popover({
  label,
  trigger,
  badge,
  children,
}: {
  label: string;
  trigger: ReactNode;
  badge?: "ok" | "warn" | "wait";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = useCallback(() => {
    setOpen(false);
    btn.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect();
      const h = menu.current?.offsetHeight ?? 280;
      const w = menu.current?.offsetWidth ?? 280;
      const up = r.bottom + h + 12 > innerHeight && r.top - h - 12 > 0;
      setPos({
        left: Math.max(12, Math.min(r.left, innerWidth - w - 12)),
        top: up ? r.top - h - 8 : r.bottom + 8,
        up,
      });
    };
    place();
    const raf = requestAnimationFrame(place);
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", place);
      removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = [...(menu.current?.querySelectorAll<HTMLElement>("button, a") ?? [])];
        if (!items.length) return;
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next].focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    const first = menu.current?.querySelector<HTMLElement>('[aria-selected="true"], button');
    first?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="nl-token"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`${label}: ${typeof trigger === "string" ? trigger : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
        {badge && <span className={`nl-token__badge is-${badge}`} aria-hidden />}
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menu}
                id={id}
                className="nl-menu"
                style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
                initial={{ opacity: 0, y: pos?.up ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: pos?.up ? 4 : -4, scale: 0.98, transition: { duration: 0.12 } }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <CloseMenu.Provider value={close}>{children}</CloseMenu.Provider>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
