"use client";

import { useSyncExternalStore } from "react";
import {
  PALETTES,
  PREFS_KEY,
  THEME_COLOR,
  paletteFor,
  paletteVars,
  type Palette,
  type PaletteId,
  type Theme,
} from "./palettes";

export interface Prefs {
  palette: PaletteId;

  theme: Theme;

  askMusicOnStart: boolean;

  autoPauseForBeats: boolean;

  earTestDone: boolean;
}

const DEFAULTS: Prefs = { palette: "track", theme: "dark", askMusicOnStart: true, autoPauseForBeats: false, earTestDone: false };

function read(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<Prefs>;
    const palette = raw.palette && raw.palette in PALETTES ? raw.palette : DEFAULTS.palette;
    const theme: Theme = raw.theme === "light" ? "light" : "dark";
    return { ...DEFAULTS, ...raw, palette, theme };
  } catch {
    return DEFAULTS;
  }
}

let prefs: Prefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function current() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    prefs = read();
  }
  return prefs;
}

function apply(id: PaletteId) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(paletteVars(paletteFor(id, current().theme)))) root.style.setProperty(k, v);
  root.dataset.palette = id;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  // A chosen palette is set inline, so swap it for the same palette's version in this theme.
  if (root.dataset.palette) apply(current().palette);
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  prefs = { ...current(), [key]: value };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
  if (key === "palette") apply(value as PaletteId);
  if (key === "theme") applyTheme(value as Theme);
  listeners.forEach((l) => l());
}

export function getPrefs() {
  return current();
}

export function palette(): Palette {
  return paletteFor(current().palette, current().theme);
}

export function toggleTheme() {
  setPref("theme", current().theme === "dark" ? "light" : "dark");
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function usePrefs() {
  return useSyncExternalStore(subscribe, current, () => DEFAULTS);
}

export function usePalette(): Palette {
  const p = usePrefs();
  return paletteFor(p.palette, p.theme);
}

export function useTheme(): Theme {
  return usePrefs().theme;
}
