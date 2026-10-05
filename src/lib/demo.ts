"use client";

const KEY = "sl-demo";

let cached: boolean | null = null;

export function isDemo(): boolean {
  if (typeof window === "undefined") return false;
  if (cached !== null) return cached;
  try {
    const url = new URL(location.href);
    if (url.searchParams.has("demo")) {
      sessionStorage.setItem(KEY, "1");
      url.searchParams.delete("demo");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    cached = sessionStorage.getItem(KEY) === "1";
  } catch {
    cached = false;
  }
  return cached;
}

export function startDemo() {
  location.href = "/?demo";
}

export function exitDemo() {
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem("sl-tour-step");
  } catch {}
  location.href = "/login";
}
