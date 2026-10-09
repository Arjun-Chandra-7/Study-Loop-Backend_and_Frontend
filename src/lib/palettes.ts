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

export type PaletteId = keyof typeof PALETTES;
export type Palette = (typeof PALETTES)[PaletteId];

export const PREFS_KEY = "sl-prefs";

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

export function prePaintScript() {
  const vars = Object.fromEntries(Object.entries(PALETTES).map(([id, p]) => [id, paletteVars(p)]));
  return `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_KEY)})||"{}").palette,v=${JSON.stringify(vars)}[p];if(v){var r=document.documentElement;for(var k in v)r.style.setProperty(k,v[k]);r.dataset.palette=p}}catch(e){}`;
}
