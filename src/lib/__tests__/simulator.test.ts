import { afterEach, describe, expect, it } from "vitest";
import { engine } from "../engine";

afterEach(() => {
  engine.end();
  engine.newSession();
  engine.setSpeed(1);
});

describe("band simulator controls", () => {
  it("+5 min moves a no-band session from settling into focus", () => {
    engine.beginSession();
    expect(engine.getSnapshot().session.phase).toBe("active");
    expect(engine.getSnapshot().session.loop.mode).toBe("settling");
    engine.skipAhead(5 * 60_000);
    const s = engine.getSnapshot().session;
    expect(s.elapsedMs).toBe(5 * 60_000);
    expect(s.loop.mode).toBe("focus");
  });

  it("never skips past the end of the session", () => {
    engine.configure({ minutes: 5 });
    engine.beginSession();
    engine.skipAhead(60 * 60_000);
    expect(engine.getSnapshot().session.elapsedMs).toBeLessThan(5 * 60_000);
    engine.configure({ minutes: 45 });
  });

  it("clamps the speed and records the chosen scenario", () => {
    engine.setSpeed(50);
    expect(engine.getSnapshot().speed).toBe(20);
    engine.setSpeed(10);
    expect(engine.getSnapshot().speed).toBe(10);
    engine.demoScenario("elevated");
    expect(engine.getSnapshot().scenario).toBe("elevated");
    engine.demoScenario("normal");
  });
});
