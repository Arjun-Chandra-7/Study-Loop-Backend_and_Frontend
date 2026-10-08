import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const audio = vi.hoisted(() => {
  const mk = () => {
    const listeners = new Set<() => void>();
    let playing = false;
    return {
      set(v: boolean) {
        playing = v;
        listeners.forEach((l) => l());
      },
      get: () => playing,
      subscribe: (l: () => void) => (listeners.add(l), () => listeners.delete(l)),
    };
  };
  return { loop: mk(), beats: mk() };
});
vi.mock("@/lib/music/vibe/engine", () => ({
  vibeEngine: {
    subscribe: audio.loop.subscribe,
    getSnapshot: () => ({ playing: audio.loop.get() }),
    stop: () => audio.loop.set(false),
  },
}));
const sound = vi.hoisted(() => ({ state: null as string | null, ear: [] as string[] }));
vi.mock("@/lib/audio/loopAudio", () => ({
  loopAudio: {
    subscribe: audio.beats.subscribe,
    getSnapshot: () => ({ playing: audio.beats.get(), state: sound.state }),
    start: async (state: string | null) => {
      sound.state = state;
      audio.beats.set(true);
    },
    stop: () => {
      sound.state = null;
      audio.beats.set(false);
    },
    setState: (state: string) => {
      sound.state = state;
    },
    onLog: () => () => {},
    testEar: async (side: string) => {
      sound.ear.push(side);
    },
  },
}));

const { engine } = await import("@/lib/useStudyLoop");
const { getPrefs, setPref } = await import("@/lib/prefs");
const { SessionPrompts, toggleBeats } = await import("../SessionPrompts");

const startSession = () => act(() => engine.beginSession());

const noDialog = () => waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

beforeEach(() => {
  setPref("askMusicOnStart", true);
  setPref("autoPauseForBeats", false);
  setPref("earTestDone", true);
  sound.state = null;
  sound.ear = [];
  audio.loop.set(false);
  audio.beats.set(false);
  act(() => engine.end());
  act(() => engine.newSession());
  render(<SessionPrompts />);
});
afterEach(() => {
  act(() => engine.end());
  cleanup();
});

describe("music prompt at session start", () => {
  it("offers a Loop when nothing is playing, and Yes opens the Music tab", async () => {
    startSession();
    expect(await screen.findByText(/not listening to any Loop/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Play my playlist" }));
    expect(engine.getSnapshot().tab).toBe("music");
    await noDialog();
  });

  it("Yes starts the StudyLoop Loop", async () => {
    startSession();
    await userEvent.click(await screen.findByRole("button", { name: "Yes, start the Loop" }));
    expect(audio.beats.get()).toBe(true);
    await noDialog();
  });

  it("stays quiet when a Loop is already playing", async () => {
    audio.loop.set(true);
    startSession();
    await noDialog();
  });

  it("Don't ask me again turns the prompt off for next time", async () => {
    startSession();
    await userEvent.click(await screen.findByRole("button", { name: "Don’t ask me again" }));
    expect(getPrefs().askMusicOnStart).toBe(false);
    act(() => engine.end());
    act(() => engine.newSession());
    startSession();
    await noDialog();
  });
});

describe("Loop", () => {
  it("starts straight away when no Loop is playing, and toggles off", () => {
    act(() => toggleBeats());
    expect(audio.beats.get()).toBe(true);
    act(() => toggleBeats());
    expect(audio.beats.get()).toBe(false);
  });

  it("asks before pausing a playing Loop; Cancel leaves the Loop alone", async () => {
    audio.loop.set(true);
    act(() => toggleBeats());
    expect(await screen.findByText(/already got some music flowing/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(audio.loop.get()).toBe(true);
    expect(audio.beats.get()).toBe(false);
  });

  it("Yes, pause swaps the Loop for beats; with Don't ask again it stops asking", async () => {
    audio.loop.set(true);
    act(() => toggleBeats());
    await userEvent.click(await screen.findByRole("checkbox", { name: "Don’t ask me again" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, pause" }));
    expect(audio.loop.get()).toBe(false);
    expect(audio.beats.get()).toBe(true);
    expect(getPrefs().autoPauseForBeats).toBe(true);

    act(() => audio.beats.set(false));
    audio.loop.set(true);
    act(() => toggleBeats());
    await noDialog();
    expect(audio.loop.get()).toBe(false);
    expect(audio.beats.get()).toBe(true);
  });

  it("winds down when an active session ends", () => {
    setPref("askMusicOnStart", false);
    startSession();
    act(() => toggleBeats());
    expect(audio.beats.get()).toBe(true);
    const phase = engine.getSnapshot().session.phase;
    act(() => engine.end());
    if (phase === "baseline") expect(audio.beats.get()).toBe(false);
    else expect(sound.state).toBe("winddown");
  });

  it("asks for the headphone ear test before the first Loop", async () => {
    setPref("earTestDone", false);
    act(() => toggleBeats());
    expect(await screen.findByText("Headphones required")).toBeTruthy();
    expect(audio.beats.get()).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Play left" }));
    await userEvent.click(screen.getByRole("button", { name: "Play right" }));
    expect(sound.ear).toEqual(["left", "right"]);
    await userEvent.click(screen.getByRole("button", { name: "Both sides sound right, start" }));
    expect(audio.beats.get()).toBe(true);
    expect(getPrefs().earTestDone).toBe(true);
    await noDialog();
  });
});
