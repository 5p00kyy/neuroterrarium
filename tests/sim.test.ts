import { describe, it, expect } from "vitest";
import {
  fixture,
  shuffle,
  fingerprint,
  LIF,
  MODEL,
  type CSRGraph,
} from "../src/sim/network";
import { Experiment, replay, parseManifest } from "../src/sim/experiment";
import { trainReadout } from "../src/sim/learning";
function stats(g: CSRGraph) {
  const incoming = Array.from({ length: g.count }, () => [] as number[]);
  for (let i = 0; i < g.count; i++)
    for (let e = g.offsets[i]; e < g.offsets[i + 1]; e++)
      incoming[g.targets[e]].push(g.weights[e]);
  return {
    out: Array.from(g.offsets)
      .slice(1)
      .map((v, i) => v - g.offsets[i]),
    incoming: incoming.map((a) => a.sort()),
    signs: Array.from(g.signs),
    weights: Array.from(g.weights).sort(),
  };
}
describe("scientific contracts", () => {
  it("fixture is a valid 48-neuron, 192-edge CSR graph", () => {
    const g = fixture();
    expect(g.count).toBe(48);
    expect(g.targets.length).toBe(192);
    expect(g.offsets[48]).toBe(192);
    expect([...g.signs].filter((s) => s === -1)).toHaveLength(12);
  });
  it.each([1, 42, 101, 4294967295])(
    "shuffle %i is reproducible, separate and exactly matched",
    (seed) => {
      const g = fixture(),
        c = shuffle(g, seed);
      expect(stats(c)).toEqual(stats(g));
      expect(fingerprint(c)).toBe(fingerprint(shuffle(g, seed)));
      expect(fingerprint(c)).not.toBe(fingerprint(g));
      for (let i = 0; i < c.count; i++) {
        const t = [...c.targets.slice(c.offsets[i], c.offsets[i + 1])];
        expect(t).not.toContain(i);
        expect(new Set(t).size).toBe(t.length);
      }
      expect(fingerprint(g)).toBe(fingerprint(fixture()));
    },
  );
  it("LIF threshold, reset, refractory and silence are explicit", () => {
    const n = new LIF(fixture());
    n.step([1.5, 0, 0, 0, 0, 0]);
    expect(n.spikes[0]).toBe(1);
    expect(n.voltage[0]).toBe(MODEL.reset);
    n.step([1.5, 0, 0, 0, 0, 0]);
    expect(n.spikes[0]).toBe(0);
    n.step([1.5, 0, 0, 0, 0, 0], { population: 0, kind: "silence" });
    expect([...n.trace.slice(0, 8)]).toEqual(Array(8).fill(0));
  });
  it("zero stimulus remains silent and still", () => {
    const e = new Experiment(42);
    e.step(100);
    for (const b of e.bodies) {
      expect(b.totalSpikes).toBe(0);
      expect(b.distance).toBe(0);
    }
  });
  it("stimulus → spikes → motors → movement, with independent Control", () => {
    const e = new Experiment(42);
    e.apply({ type: "stimulus", tool: "light", x: 2, z: 1 });
    e.step(250);
    expect(e.bodies[0].totalSpikes).toBeGreaterThan(100);
    expect(e.bodies[0].distance).toBeGreaterThan(0.1);
    expect(e.bodies[2]).not.toEqual(e.bodies[0]);
    expect(e.networks[0].spikes).not.toBe(e.networks[2].spikes);
    expect(e.outputs[100].spikes[0]).not.toEqual(e.outputs[100].spikes[2]);
    expect(e.bodies[1]).toEqual(e.bodies[0]);
  });
  it.each(["light", "loom", "odor", "touch"] as const)(
    "%s injects sensory current and spikes",
    (tool) => {
      const e = new Experiment(42);
      e.apply({ type: "stimulus", tool, x: 1, z: 1 });
      e.step(20);
      expect(e.bodies[0].totalSpikes).toBeGreaterThan(0);
    },
  );
  it("touch expires deterministically and obstacle prevents penetration", () => {
    const e = new Experiment(42);
    e.apply({ type: "stimulus", tool: "touch", x: 0, z: 0 });
    e.step(21);
    expect(e.stimuli).toHaveLength(0);
    e.apply({ type: "stimulus", tool: "obstacle", x: 0, z: 1 });
    e.apply({ type: "stimulus", tool: "light", x: 0, z: 3 });
    e.step(300);
    for (const b of e.bodies)
      expect(Math.hypot(b.x, b.z - 1)).toBeGreaterThanOrEqual(0.72);
  });
  it("readout improves held-out calibration without changing recurrent anatomy", () => {
    const g = fixture(),
      before = [...g.weights],
      c = shuffle(g, 42),
      r = trainReadout(g, c, 42);
    expect(r.afterMSE).toBeLessThan(r.beforeMSE * 0.25);
    expect(r.accuracy).toBeGreaterThanOrEqual(0.9);
    expect(r.controlMSE).toBeLessThan(r.ablatedMSE);
    expect(r.weightsAfter).not.toEqual(r.weightsBefore);
    expect(r.recurrentBefore).toBe(r.recurrentAfter);
    expect([...g.weights]).toEqual(before);
    expect(r).toEqual(trainReadout(g, c, 42));
    console.log(
      "Calibration evidence",
      JSON.stringify({
        before: r.beforeMSE,
        after: r.afterMSE,
        control: r.controlMSE,
        ablation: r.ablatedMSE,
        accuracy: r.accuracy,
      }),
    );
  });
  it("replays every tick, perturbation, training and same-tick action exactly", () => {
    const e = new Experiment(73);
    e.apply({ type: "stimulus", tool: "odor", x: 2, z: 2 });
    e.step(80);
    e.apply({ type: "train" });
    e.apply({ type: "perturb", value: { population: 4, kind: "silence" } });
    e.step(30);
    e.apply({ type: "clear" });
    const m = e.manifest({ commit: "test", dirty: false });
    const r = replay(parseManifest(JSON.parse(JSON.stringify(m))));
    expect(r.outputs).toEqual(e.outputs);
    expect(r.frame()).toEqual(e.frame());
    expect(m.provenance.length).toBeGreaterThan(10);
    expect(m.dataset.synthetic).toBe(true);
  });
  it("rejects malformed, incompatible or unbounded imported runs", () => {
    const m = new Experiment(42).manifest({ commit: "test", dirty: false });
    for (const patch of [
      { seed: -1 },
      { ticks: 99999999 },
      { model: { version: "other" } },
      { events: [{ tick: 0, action: { type: "execute" } }] },
      { graphs: {} },
    ])
      expect(() => parseManifest({ ...m, ...patch })).toThrow();
  });
});
