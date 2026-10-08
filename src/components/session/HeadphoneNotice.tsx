"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useHeadphones } from "@/lib/headphones/store";
import { needsHeadphones, useBeats } from "@/lib/music/gamma";
import { Icon } from "../ui/Icon";

const SETTLE_MS = 1500;
const SEARCH_GRACE_MS = 6000;

export function HeadphoneNotice() {
  const hp = useHeadphones();
  const { playing, active } = useBeats();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);
  const [searchStale, setSearchStale] = useState(false);

  const searching = hp.status === "searching";
  useEffect(() => {
    setSearchStale(false);
    if (!searching) return;
    const t = setTimeout(() => setSearchStale(true), SEARCH_GRACE_MS);
    return () => clearTimeout(t);
  }, [searching]);

  const wearing = hp.status === "connected" && !hp.preview;
  const unsure = searching && !searchStale;
  const want = playing && !wearing && !unsure && !dismissed;

  useEffect(() => {
    if (!playing || wearing) setDismissed(false);
  }, [playing, wearing]);

  useEffect(() => {
    if (!want) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, [want]);

  const binauralNow = needsHeadphones(active);
  const title = hp.status === "none" ? "No headphones detected" : "Are you wearing headphones?";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="hp-notice"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span className="hp-notice__icon" aria-hidden>
            <Icon name="music" size={16} />
          </span>
          <div className="hp-notice__text">
            <p className="hp-notice__title">{title}</p>
            <p className="hp-notice__body">
              Binaural beats don’t work without headphones. Each ear needs its own tone, so on speakers the beat
              disappears.
              {binauralNow ? "" : " 40 Hz focus works on speakers, but the Loop switches to alpha and theta too."}
            </p>
          </div>
          <button type="button" className="btn btn--ghost hp-notice__close" onClick={() => setDismissed(true)}>
            Got it
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
