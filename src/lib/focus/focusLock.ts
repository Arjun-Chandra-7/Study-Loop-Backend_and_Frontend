"use client";

import { useSyncExternalStore } from "react";
import { ADULT_HOST_PATTERN, ALL_CATEGORIES, blockedDomains, type BlockCategory } from "./blocklist";

export type ExtensionStatus = "checking" | "connected" | "missing";

export interface FocusSnapshot {
  enabled: boolean;
  categories: BlockCategory[];
  extension: ExtensionStatus;
  locked: boolean;
  until: number | null;
}

interface ExtReply {
  id?: string;
  type?: string;
  installed?: boolean;
  active?: boolean;
  until?: number | null;
  error?: string;
}

const KEY = "sl-focus-lock";
const REPLY_MS = 1200;

const SERVER: FocusSnapshot = { enabled: true, categories: ALL_CATEGORIES, extension: "checking", locked: false, until: null };

class FocusLock {
  private snap: FocusSnapshot = SERVER;
  private listeners = new Set<() => void>();
  private pending = new Map<string, (r: ExtReply | null) => void>();
  private started = false;
  private seq = 0;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    this.init();
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSnapshot = () => {
    this.init();
    return this.snap;
  };

  private set(p: Partial<FocusSnapshot>) {
    this.snap = { ...this.snap, ...p };
    this.listeners.forEach((l) => l());
  }

  private init() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<FocusSnapshot>;
      const categories = Array.isArray(raw.categories) ? raw.categories.filter((c) => ALL_CATEGORIES.includes(c)) : ALL_CATEGORIES;
      this.snap = { ...this.snap, enabled: raw.enabled ?? true, categories };
    } catch {}
    window.addEventListener("message", this.onMessage);
    void this.refresh();
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ enabled: this.snap.enabled, categories: this.snap.categories }));
    } catch {}
  }

  private onMessage = (e: MessageEvent) => {
    if (e.source !== window || e.origin !== location.origin) return;
    const d = e.data as (ExtReply & { source?: string }) | null;
    if (!d || d.source !== "studyloop-ext") return;
    if (d.type === "hello") {
      void this.refresh();
      return;
    }
    if (d.id && this.pending.has(d.id)) {
      this.pending.get(d.id)!(d);
      this.pending.delete(d.id);
    }
  };

  private send(type: string, extra: Record<string, unknown> = {}): Promise<ExtReply | null> {
    if (typeof window === "undefined") return Promise.resolve(null);
    const id = `fl-${Date.now()}-${this.seq++}`;
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        this.pending.delete(id);
        resolve(null);
      }, REPLY_MS);
      this.pending.set(id, (r) => {
        clearTimeout(t);
        resolve(r);
      });
      window.postMessage({ source: "studyloop-app", id, type, ...extra }, location.origin);
    });
  }

  private apply(r: ExtReply | null) {
    if (!r || r.error) {
      this.set({ extension: "missing" });
      return;
    }
    this.set({ extension: "connected", locked: Boolean(r.active), until: r.active ? (r.until ?? null) : null });
  }

  refresh = async () => this.apply(await this.send("status"));

  setEnabled = (enabled: boolean) => {
    this.set({ enabled });
    this.save();
  };

  toggleCategory = (c: BlockCategory) => {
    const has = this.snap.categories.includes(c);
    this.set({ categories: has ? this.snap.categories.filter((x) => x !== c) : [...this.snap.categories, c] });
    this.save();
  };

  lock = async (until: number, label: string) => {
    if (!this.snap.enabled || !this.snap.categories.length) return;
    this.set({ locked: true, until });
    const domains = blockedDomains(this.snap.categories);
    const pattern = this.snap.categories.includes("adult") ? ADULT_HOST_PATTERN : null;
    const r = await this.send("start", { until, domains, pattern, label });
    if (!r || r.error) this.set({ extension: "missing" });
    else this.set({ extension: "connected" });
  };

  unlock = async () => {
    this.set({ locked: false, until: null });
    this.apply(await this.send("stop"));
  };
}

export const focusLock = new FocusLock();

export function useFocusLock(): FocusSnapshot {
  return useSyncExternalStore(focusLock.subscribe, focusLock.getSnapshot, () => SERVER);
}
