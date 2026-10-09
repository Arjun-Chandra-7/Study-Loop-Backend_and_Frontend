// Every palette is tuned for the paper background: the measured colour must
// read as a thin chart line on cream, and the action colour carries ink text.
export const PALETTES = {
  track: {
    name: "Editorial",
    blurb: "Sky blue, hot pink",
    measured: "#2F7FC1",
    measuredHi: "#8FBFE3",
    action: "#EE5C96",
    actionHi: "#F6A6C7",
    actionHover: "#F27AAB",
    onAction: "#15130F",
  },
  lagoon: {
    name: "Pool & tangerine",
    blurb: "Pool teal, tangerine",
    measured: "#16858A",
    measuredHi: "#8ED1CC",
    action: "#FF7A2F",
    actionHi: "#FFB48A",
    actionHover: "#FF8F4F",
    onAction: "#15130F",
  },
  berry: {
    name: "Grape & lime",
    blurb: "Grape violet, lime",
    measured: "#6B4FD8",
    measuredHi: "#B9A9F2",
    action: "#C9EC3C",
    actionHi: "#E1F59B",
    actionHover: "#D4F05E",
    onAction: "#15130F",
  },
  raceday: {
    name: "Race day",
    blurb: "Track green, blaze",
    measured: "#2E8B3A",
    measuredHi: "#9FD79A",
    action: "#FF5A1F",
    actionHi: "#FF9666",
    actionHover: "#FF7846",
    onAction: "#15130F",
  },
} as const;

// The benchmark (dark) versions of the same palettes, tuned for a near-black background.
export const PALETTES_DARK = {
  track: {
    name: "Collegiate track",
    blurb: "Infield sage, cinder brick",
    measured: "#9DBA8E",
    measuredHi: "#C3D6B4",
    action: "#CF4F33",
    actionHi: "#E58A6F",
    actionHover: "#DA6448",
    onAction: "#12110F",
  },
  lagoon: {
    name: "Calypso & gold",
    blurb: "Harbour blue, varsity gold",
    measured: "#7FB0C8",
    measuredHi: "#B3D2E0",
    action: "#D9A441",
    actionHi: "#E8C47E",
    actionHover: "#E2B256",
    onAction: "#12110F",
  },
  berry: {
    name: "Berry & sand",
    blurb: "Dune sand, crew berry",
    measured: "#D2BE9A",
    measuredHi: "#E6D9BF",
    action: "#C24E68",
    actionHi: "#DB8A9B",
    actionHover: "#CD627A",
    onAction: "#F5EFE3",
  },
  raceday: {
    name: "Race day",
    blurb: "Volt and blaze, turned up",
    measured: "#D7FF3A",
    measuredHi: "#E5FF8A",
    action: "#FF5A1F",
    actionHi: "#FF9666",
    actionHover: "#FF7846",
    onAction: "#12110F",
  },
} as const satisfies Record<keyof typeof PALETTES, unknown>;

export type PaletteId = keyof typeof PALETTES;
export interface Palette {
  readonly name: string;
  readonly blurb: string;
  readonly measured: string;
  readonly measuredHi: string;
  readonly action: string;
  readonly actionHi: string;
  readonly actionHover: string;
  readonly onAction: string;
}
export type Theme = "light" | "dark";

export const PREFS_KEY = "sl-prefs";

export function paletteFor(id: PaletteId, theme: Theme): Palette {
  return (theme === "dark" ? PALETTES_DARK : PALETTES)[id];
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");

export function paletteVars(p: Palette): Record<string, string> {
  return {
    "--m-500": p.measured,
    "--m-300": p.measuredHi,
    "--measured-rgb": rgb(p.measured),
    "--measured-hi-rgb": rgb(p.measuredHi),
    "--a-500": p.action,
    "--a-300": p.actionHi,
    "--action-rgb": rgb(p.action),
    "--action-hover": p.actionHover,
    "--text-on-action": p.onAction,
  };
}

/** Browser chrome colour (status bar, tab strip) for each theme. */
export const THEME_COLOR: Record<Theme, string> = { light: "#e9e1cf", dark: "#0c0b08" };

/** Runs before first paint: applies the saved theme and palette so nothing flashes. */
export function prePaintScript() {
  const vars = (theme: Theme) =>
    Object.fromEntries(Object.keys(PALETTES).map((id) => [id, paletteVars(paletteFor(id as PaletteId, theme))]));
  const all = { light: vars("light"), dark: vars("dark") };
  return `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_KEY)})||"{}"),r=document.documentElement,t=s.theme==="dark"?"dark":"light";r.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=${JSON.stringify(THEME_COLOR)}[t];var v=${JSON.stringify(all)}[t][s.palette];if(v){for(var k in v)r.style.setProperty(k,v[k]);r.dataset.palette=s.palette}}catch(e){}`;
}
