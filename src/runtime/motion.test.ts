import { describe, expect, it } from "vitest";
import { DEFAULT_MOTION, frameDiff, initialMotion, stepMotion, toGray } from "./motion";

describe("motion gate", () => {
  it("does not fire while the scene is moving", () => {
    let s = initialMotion;
    for (let t = 0; t < 5; t++) {
      const r = stepMotion(s, 40, t * 100);
      expect(r.fire).toBe(false);
      s = r.state;
    }
    expect(s.phase).toBe("moving");
  });

  it("fires once when the scene settles after a change", () => {
    let s = stepMotion(initialMotion, 40, 0).state;
    const fires: boolean[] = [];
    for (let i = 1; i <= 5; i++) {
      const r = stepMotion(s, 1, i * 100);
      fires.push(r.fire);
      s = r.state;
    }
    expect(fires).toEqual([false, false, true, false, false]);
  });

  it("keeps a heartbeat on a still scene", () => {
    let s = initialMotion;
    let count = 0;
    for (let t = 0; t <= 6000; t += 250) {
      const r = stepMotion(s, 1, t);
      if (r.fire) count++;
      s = r.state;
    }
    // first settle plus heartbeats every 2.5 s
    expect(count).toBe(3);
  });

  it("respects a custom threshold", () => {
    const r = stepMotion(initialMotion, 10, 0, { ...DEFAULT_MOTION, moveThreshold: 20 });
    expect(r.state.phase).toBe("settling");
  });
});

describe("pixel helpers", () => {
  it("measures mean absolute difference", () => {
    expect(frameDiff(new Uint8ClampedArray([0, 10]), new Uint8ClampedArray([10, 0]))).toBe(10);
    expect(frameDiff(new Uint8ClampedArray([1]), new Uint8ClampedArray([1, 2]))).toBe(255);
  });
  it("converts rgba to gray", () => {
    expect(Array.from(toGray(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])))).toEqual([255, 0]);
  });
});
