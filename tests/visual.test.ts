import { it, expect } from "vitest";
import { Experiment } from "../src/sim/experiment";
import { fixture, shuffle, fingerprint } from "../src/sim/network";
import {
  aggregateFlow,
  distanceEnvelope,
  stimulusEnvelope,
} from "../src/visualSignals";
import { legPose } from "../src/FlyAvatar";
it("group projection accounts for every signed edge and only actual source spikes", () => {
  for (const g of [fixture(), shuffle(fixture(), 42)]) {
    const before = fingerprint(g),
      spikes = Array(48).fill(0);
    const silent = aggregateFlow(g, spikes);
    expect(silent.reduce((n, r) => n + r.edges, 0)).toBe(192);
    expect(silent.every((r) => r.sampledActiveEdges === 0)).toBe(true);
    spikes[0] = 1;
    spikes[7] = 1;
    const lit = aggregateFlow(g, spikes);
    expect(lit.reduce((n, r) => n + r.sampledActiveEdges, 0)).toBe(8);
    expect(
      lit
        .filter((r) => r.sign < 0)
        .reduce((n, r) => n + r.sampledActiveEdges, 0),
    ).toBe(4);
    expect(fingerprint(g)).toBe(before);
  }
});
it.each(["touch", "loom"] as const)(
  "%s visual duration matches the inputs actually evaluated in a frame",
  (tool) => {
    const run = new Experiment(42);
    run.apply({ type: "stimulus", tool, x: 1, z: 1 });
    const duration = tool === "touch" ? 20 : 100;
    for (let tick = 1; tick <= duration + 1; tick++) {
      run.step();
      const f = run.frame();
      const envelope = stimulusEnvelope({ tool, x: 1, z: 1, start: 0 }, tick);
      expect(envelope.active).toBe(f.stimuli.some((s) => s.tool === tool));
      if (envelope.active) expect(f.input[3]).toBeCloseTo(envelope.threat, 12);
    }
  },
);
it("distance field matches isolated odour current without mutating the model", () => {
  const run = new Experiment(42);
  run.apply({ type: "stimulus", tool: "odor", x: 2, z: 1 });
  run.step();
  expect(run.input[2]).toBeCloseTo(distanceEnvelope(Math.sqrt(5)) * 0.9, 12);
  expect(distanceEnvelope(0)).toBe(1);
  expect(distanceEnvelope(2)).toBeGreaterThan(distanceEnvelope(4));
});
it("six leg poses are finite, mirrored at rest and distance-driven without body mutation", () => {
  for (let i = 0; i < 3; i++) {
    const left = legPose(-1, i, 0, 0),
      right = legPose(1, i, 0, 0);
    expect(left.map((p) => [-p[0], p[1], p[2]])).toEqual(right);
    expect(legPose(1, i, 2, 0)).toEqual(right);
    expect(legPose(1, i, 2, 0.5)).not.toEqual(right);
    expect(right.flat().every(Number.isFinite)).toBe(true);
  }
});
