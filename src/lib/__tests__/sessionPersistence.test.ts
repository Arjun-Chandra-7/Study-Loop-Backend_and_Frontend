import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudyLoopEngine, dateLabelFor } from "../engine";

function load(uid = "u1") {
  const e = new StudyLoopEngine();
  e.start();
  e.attachUser(uid);
  return e;
}
const real = (e: StudyLoopEngine) => e.getSnapshot().summaries.filter((s) => !s.isSample);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("sessions survive a reload", () => {
  it("keeps finished sessions", () => {
    const a = load();
    a.beginSession();
    vi.advanceTimersByTime(65_000);
    a.end();
    expect(real(a)).toHaveLength(1);

    const b = load();
    expect(real(b)).toHaveLength(1);
    expect(real(b)[0].minutes).toBe(1);
    expect(b.getSnapshot().recovery).toBeNull();
  });

  it("a session running at reload asks to continue, and Continue picks up the timer", () => {
    const a = load();
    a.beginSession();
    a.mark();
    vi.advanceTimersByTime(10_000);

    const b = load();
    const r = b.getSnapshot().recovery;
    expect(r?.phase).toBe("active");
    expect(r!.elapsedMs).toBeGreaterThanOrEqual(6_000);
    expect(b.getSnapshot().session.phase).toBe("idle");

    b.resumeRecovered();
    const s = b.getSnapshot().session;
    expect(b.getSnapshot().recovery).toBeNull();
    expect(s.phase).toBe("active");
    expect(s.elapsedMs).toBe(r!.elapsedMs);
    expect(s.events.filter((x) => x.kind === "mark")).toHaveLength(1);
    expect(b.getSnapshot().tab).toBe("session");
  });

  it("reloading again before answering still offers the session", () => {
    const a = load();
    a.beginSession();
    vi.advanceTimersByTime(8_000);
    load();
    vi.advanceTimersByTime(8_000);
    expect(load().getSnapshot().recovery?.phase).toBe("active");
  });

  it("End & save turns the interrupted session into a finished one", () => {
    const a = load();
    a.beginSession();
    vi.advanceTimersByTime(90_000);
    const b = load();
    b.endRecovered();
    expect(b.getSnapshot().recovery).toBeNull();
    expect(real(b)).toHaveLength(1);
    expect(b.getSnapshot().tab).toBe("insights");
    expect(load().getSnapshot().recovery).toBeNull();
  });

  it("Discard forgets it for good", () => {
    const a = load();
    a.beginSession();
    vi.advanceTimersByTime(8_000);
    const b = load();
    b.discardRecovered();
    expect(load().getSnapshot().recovery).toBeNull();
    expect(real(load())).toHaveLength(0);
  });

  it("is kept per person", () => {
    const a = load("alice");
    a.beginSession();
    vi.advanceTimersByTime(65_000);
    a.end();
    expect(real(load("bob"))).toHaveLength(0);
    expect(real(load("alice"))).toHaveLength(1);
  });
});

describe("old or broken saved data", () => {
  it("skips malformed sessions and summaries instead of crashing", () => {
    localStorage.setItem(
      "sl-sessions:u1",
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        session: { phase: "active", config: { subject: "Physics" } },
        summaries: [{ id: "x" }, null, { id: "ok", minutes: 3, samples: [], events: [], subject: "Maths", topic: "", dateLabel: "", stableShare: 1, elevatedMoments: 0, marks: 0, baseline: null }],
      }),
    );
    const e = load();
    expect(real(e).map((s) => s.id)).toEqual(["ok"]);
    expect(e.getSnapshot().recovery).toBeNull();
  });

  it("recovers a session saved before the Loop existed", () => {
    localStorage.setItem(
      "sl-sessions:u1",
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        session: { phase: "active", config: { subject: "Physics", topic: "", minutes: 45, mode: "Deep work" }, baselineProgress: 1, baseline: null, elapsedMs: 60_000, stableMs: 0, events: [], samples: [] },
        summaries: [],
      }),
    );
    const e = load();
    expect(e.getSnapshot().recovery?.loop.mode).toBe("settling");
  });
});

describe("dateLabelFor", () => {
  it("says Today, Yesterday, then a date", () => {
    const now = new Date(2026, 9, 2, 15).getTime();
    expect(dateLabelFor(new Date(2026, 9, 2, 9).getTime(), now)).toBe("Today");
    expect(dateLabelFor(new Date(2026, 9, 1, 22).getTime(), now)).toBe("Yesterday");
    expect(dateLabelFor(new Date(2026, 8, 20, 22).getTime(), now)).not.toMatch(/Today|Yesterday/);
  });
});
