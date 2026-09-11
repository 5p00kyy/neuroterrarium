import { loadCircuit, type Circuit } from "./circuit";
import {
  LIF,
  fingerprint,
  shuffle,
  random,
  MODEL,
  type CSRGraph,
} from "./network";
export const SMOKE = {
  version: "circuit-pulse-1",
  ticks: 120,
  pulseTicks: 20,
  current: 0.65,
  controlSeeds: [17, 43, 89, 131, 211],
  readout:
    "mean trace, adaptive scalar gain fitted on first 40 ticks to imposed pulse; not behavior",
} as const;
export interface SmokeRow {
  name: string;
  fingerprint: string;
  changedTargets: number;
  spikes: number;
  anchorSpikes: number;
  trace: number[];
  output: number[];
  spikeRaster: number[][];
}
export interface SmokeManifest {
  schema: "neuroterrarium-circuit-run/1";
  circuit: Circuit;
  seed: number;
  stimulatedType: string;
  protocol: typeof SMOKE;
  model: typeof MODEL;
  code: { commit: string; dirty: boolean };
  rows: SmokeRow[];
  recurrentBefore: string;
  recurrentAfter: string;
  readout: { before: number; after: number; trainTicks: number };
  claim: "Smoke only. No topology advantage or behavior established.";
}
export function cloneGraph(g: CSRGraph): CSRGraph {
  return {
    count: g.count,
    offsets: g.offsets.slice(),
    targets: g.targets.slice(),
    weights: g.weights.slice(),
    signs: g.signs.slice(),
    population: g.population.slice(),
  };
}
export function runCircuit(
  circuit: unknown,
  seed = 42,
  stimulatedType = "DNp70",
  code = { commit: "test", dirty: true },
): SmokeManifest {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw Error("Invalid circuit seed");
  const { manifest: c, graph } = loadCircuit(circuit),
    types = [...new Set(c.neurons.map((n) => n.type))].sort(),
    p = types.indexOf(stimulatedType);
  if (p < 0) throw Error("Unknown stimulated population");
  const before = fingerprint(graph),
    anchor = c.neurons
      .map((n, i) => (n.type === "DNp01" ? i : -1))
      .filter((i) => i >= 0);
  const specifications: { name: string; g: CSRGraph; silence?: number }[] = [
    { name: "Biological", g: cloneGraph(graph) },
    { name: "Adaptive", g: cloneGraph(graph) },
  ];
  SMOKE.controlSeeds.forEach((s) =>
    specifications.push({
      name: "Control " + s,
      g: shuffle(graph, (seed ^ s) >>> 0),
    }),
  );
  const noRecurrence = cloneGraph(graph);
  noRecurrence.weights.fill(0);
  const noSign = cloneGraph(graph);
  noSign.weights = noSign.weights.map(Math.abs);
  noSign.signs.fill(1);
  const unitWeight = cloneGraph(graph);
  unitWeight.weights = unitWeight.weights.map(
    (w) => Math.sign(w) * c.model.gain,
  );
  const population = cloneGraph(graph),
    rng = random(seed ^ 0x91a);
  for (let i = population.population.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [population.population[i], population.population[j]] = [
      population.population[j],
      population.population[i],
    ];
  }
  specifications.push(
    { name: "No recurrence", g: noRecurrence },
    { name: "Population permuted", g: population },
    { name: "All excitatory", g: noSign },
    { name: "Unit contact weights", g: unitWeight },
    {
      name: "Stimulated population silenced",
      g: cloneGraph(graph),
      silence: p,
    },
  );
  let gain = 1;
  const rows = specifications.map(({ name, g, silence }) => {
    const net = new LIF(g),
      trace: number[] = [],
      output: number[] = [],
      spikeRaster: number[][] = [];
    let spikes = 0,
      anchorSpikes = 0;
    for (let tick = 0; tick < SMOKE.ticks; tick++) {
      const input = Array(types.length).fill(0) as number[];
      input[p] = tick < SMOKE.pulseTicks ? SMOKE.current : 0;
      net.step(input, {
        population: silence ?? 0,
        kind: silence === undefined ? "none" : "silence",
      });
      spikeRaster.push(Array.from(net.spikes));
      spikes += net.spikes.reduce((a, b) => a + b, 0);
      anchorSpikes += anchor.reduce((s, i) => s + net.spikes[i], 0);
      const mean = net.trace.reduce((a, b) => a + b, 0) / g.count;
      trace.push(mean);
      if (name === "Adaptive" && tick < 40)
        gain -=
          0.05 *
          ((gain * mean - (tick < SMOKE.pulseTicks ? 1 : 0)) * mean +
            0.002 * gain);
      output.push(mean * (name === "Adaptive" ? gain : 1));
    }
    return {
      name,
      fingerprint: fingerprint(g),
      changedTargets: g.targets.reduce(
        (s, v, i) => s + Number(v !== graph.targets[i]),
        0,
      ),
      spikes,
      anchorSpikes,
      trace,
      output,
      spikeRaster,
    };
  });
  if (
    fingerprint(graph) !== before ||
    specifications.slice(0, 2).some((s) => fingerprint(s.g) !== before)
  )
    throw Error("Anatomical recurrence changed");
  return {
    schema: "neuroterrarium-circuit-run/1",
    circuit: c,
    seed,
    stimulatedType,
    protocol: SMOKE,
    model: MODEL,
    code,
    rows,
    recurrentBefore: before,
    recurrentAfter: fingerprint(graph),
    readout: { before: 1, after: gain, trainTicks: 40 },
    claim: "Smoke only. No topology advantage or behavior established.",
  };
}
export function replayCircuit(value: unknown): SmokeManifest {
  const m = value as SmokeManifest;
  if (
    !m ||
    m.schema !== "neuroterrarium-circuit-run/1" ||
    !m.code ||
    JSON.stringify(m).length > 2_000_000
  )
    throw Error("Invalid circuit replay manifest");
  const result = runCircuit(m.circuit, m.seed, m.stimulatedType, m.code);
  if (JSON.stringify(result) !== JSON.stringify(m))
    throw Error("Circuit replay mismatch");
  return result;
}
