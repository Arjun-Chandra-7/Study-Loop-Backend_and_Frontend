"use client";

import { useEffect } from "react";
import { OPEN_MUSIC } from "@/lib/music/spotifyAuth";
import { engine } from "@/lib/useStudyLoop";

export function MusicReturn() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(OPEN_MUSIC) !== null) engine.setTab("music");
    } catch {}
  }, []);
  return null;
}
