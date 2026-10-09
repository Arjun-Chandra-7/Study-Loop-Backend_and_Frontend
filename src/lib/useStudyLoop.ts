"use client";

import { useEffect, useSyncExternalStore } from "react";
import { engine } from "./engine";

export function useStudyLoop() {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, () => engine.serverSnapshot);
}

export function useEngineLifecycle() {
  useEffect(() => {
    engine.start();
    return () => engine.stop();
  }, []);
}

export { engine };
