import { describe, it, expect } from "vitest";
import raw from "../data/circuits/gf-v1/circuit.json";
import { loadCircuit } from "../src/sim/circuit";
import { runCircuit, replayCircuit, SMOKE } from "../src/sim/circuitExperiment";
import { fingerprint, shuffle, type CSRGraph, LIF } from "../src/sim/network";
import { summarizeCircuit, neuronNeighborhood } from "../src/sim/circuitView";
function distributions(g: CSRGraph) {
  const incoming = Array.from({ length: g.count }, () => [] as number[]),
    outgoing = Array.from({ length: g.count }, () => [] as number[]);
  for (let i = 0; i < g.count; i++)
    for (let e = g.offsets[i]; e < g.offsets[i + 1]; e++) {
      incoming[g.targets[e]].push(g.weights[e]);
      outgoing[i].push(g.weights[e]);
    }
  return {
    incoming: incoming.map((a) => a.sort((a, b) => a - b)),
    outgoing: outgoing.map((a) => a.sort((a, b) => a - b)),
  };
}
describe("attributable GF microcircuit", () => {
  it("retains measured counts, string IDs and explicit cut boundary", () => {
    const a = loadCircuit(raw);
    expect(a.graph.count).toBe(51);
    expect(a.graph.targets.length).toBe(1240);
    expect(a.rawCounts.reduce((s, n) => s + n, 0n)).toBe(28373n);
    expect(a.manifest.contract.omittedOutgoingContacts).toBe("417398");
    expect(a.manifest.neurons.every((n) => typeof n.id === "string")).toBe(
      true,
    );
    expect(a.manifest.model.dynamics).toBe("demo-only");
  });
  it.each([
    "nt",
    "id",
    "endpoint",
    "totals",
    "truncation",
    "closure",
    "gain",
    "authority",
    "dynamics",
    "excluded",
    "checksum",
  ])("rejects malformed %s", (field) => {
    const c = structuredClone(raw);
    if (field === "nt") c.neurons[0].nt = "glutamate";
    if (field === "id") c.neurons[0].id = c.neurons[1].id;
    if (field === "endpoint") c.edges[0].pre = "999999";
    if (field === "totals") c.totals.rawContacts = "1";
    if (field === "truncation") c.contract.truncated = true;
    if (field === "closure") c.contract.induced = false;
    if (field === "gain") c.model.gain = NaN;
    if (field === "authority") c.release = "unknown";
    if (field === "dynamics") c.model.dynamics = "published";
    if (field === "excluded") c.contract.excludedIds.push(c.neurons[0].id);
    if (field === "checksum") c.sourceChecksums.edges = "bad";
    expect(() => loadCircuit(c)).toThrow();
  });
  it("aggregates duplicate pairs without losing raw totals", () => {
    const c = structuredClone(raw),
      e = c.edges.find((e) => Number(e.contacts) > 1)!;
    e.contacts = String(BigInt(e.contacts) - 1n);
    c.edges.push({ ...e, contacts: "1" });
    c.totals.rows++;
    const a = loadCircuit(c),
      b = loadCircuit(raw);
    expect(a.rawCounts).toEqual(b.rawCounts);
    expect(fingerprint(a.graph)).toBe(fingerprint(b.graph));
  });
  it("rejects uint64 overflow and numeric body IDs", () => {
    const c = structuredClone(raw);
    c.edges[0].contacts = "18446744073709551616";
    expect(() => loadCircuit(c)).toThrow();
    const d = structuredClone(raw) as unknown as { neurons: { id: unknown }[] };
    d.neurons[0].id = 10001;
    expect(() => loadCircuit(d)).toThrow();
  });
  it.each(SMOKE.controlSeeds)(
    "control %i preserves exact declared node distributions independently",
    (seed) => {
      const g = loadCircuit(raw).graph,
        before = fingerprint(g),
        h = shuffle(g, 42 ^ seed);
      expect(distributions(h)).toEqual(distributions(g));
      expect(fingerprint(h)).not.toBe(before);
      expect(h.targets.buffer).not.toBe(g.targets.buffer);
      expect(fingerprint(g)).toBe(before);
      const a = new LIF(g),
        b = new LIF(h);
      a.step([1]);
      expect(b.spikes.every((x) => x === 0)).toBe(true);
      expect(a.spikes.buffer).not.toBe(b.spikes.buffer);
    },
  );
  it("deterministically replays all independent conditions and scalar-only adaptation", () => {
    const run = runCircuit(raw);
    expect(replayCircuit(JSON.parse(JSON.stringify(run)))).toEqual(run);
    expect(run.rows).toHaveLength(12);
    expect(run.rows[0].trace).toEqual(run.rows[1].trace);
    expect(run.rows[0].output).not.toEqual(run.rows[1].output);
    expect(run.recurrentAfter).toBe(run.recurrentBefore);
    expect(run.rows[1].fingerprint).toBe(run.rows[0].fingerprint);
    expect(run.rows.slice(2, 7).every((r) => r.changedTargets > 0)).toBe(true);
    expect(run.readout.after).not.toBe(1);
  });
  it("rejects tampered replay and unknown sensory mapping", () => {
    const r = runCircuit(raw);
    r.rows[0].spikes++;
    expect(() => replayCircuit(r)).toThrow(/mismatch/);
    expect(() => runCircuit(raw, 42, "Visual L")).toThrow(/Unknown/);
    expect(() => runCircuit(raw, -1)).toThrow();
  });
  it("preserves anatomical arrays byte-for-byte through execution", () => {
    const g = loadCircuit(raw).graph,
      arrays = [g.offsets, g.targets, g.weights, g.signs, g.population],
      bytes = arrays.map((a) => new Uint8Array(a.buffer).slice());
    const lif = new LIF(g);
    for (let i = 0; i < 1000; i++) lif.step([0.7]);
    arrays.forEach((a, i) =>
      expect(new Uint8Array(a.buffer)).toEqual(bytes[i]),
    );
  });
  it("aggregated route contacts equal raw circuit totals and rendering is bounded", () => {
    const c = loadCircuit(raw).manifest,
      s = summarizeCircuit(c);
    expect(s.routes.reduce((n, r) => n + r.contacts, 0n)).toBe(28373n);
    for (const n of c.neurons)
      expect(neuronNeighborhood(c, n.id).edges.length).toBeLessThanOrEqual(120);
    expect(s.regions.find((r) => r.name === "VNC")!.neurons).toBeGreaterThan(0);
  });
});
