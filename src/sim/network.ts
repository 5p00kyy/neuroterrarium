/** Synthetic anatomy. No measured Drosophila neurons, signs or parameters. */
export const POPULATIONS = [
  "Visual L",
  "Visual R",
  "Olfactory",
  "Threat / touch",
  "Premotor L",
  "Premotor R",
] as const;
export const N = 48;
export const MODEL = {
  version: "demo-lif-1",
  dtMs: 10,
  leak: 0.82,
  threshold: 1,
  reset: 0,
  refractoryTicks: 2,
  traceDecay: 0.92,
} as const;
export interface CSRGraph {
  count: number;
  offsets: Uint32Array;
  targets: Uint32Array;
  weights: Float32Array;
  signs: Int8Array;
  population: Uint16Array;
}
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function fixture(): CSRGraph {
  const targets: number[] = [],
    weights: number[] = [],
    offsets = [0];
  const signs = Int8Array.from({ length: N }, (_, i) => (i % 8 < 6 ? 1 : -1));
  for (let i = 0; i < N; i++) {
    const p = Math.floor(i / 8),
      k = i % 8;
    const next =
      p === 0 ? 4 : p === 1 ? 5 : p === 2 ? 4 : p === 3 ? 5 : p === 4 ? 5 : 4;
    const dest = new Set([
      p * 8 + ((k + 1) % 8),
      p * 8 + ((k + 3) % 8),
      next * 8 + k,
      next * 8 + ((k + 2) % 8),
    ]);
    for (const j of dest) {
      targets.push(j);
      weights.push(signs[i] > 0 ? 0.55 : -0.45);
    }
    offsets.push(targets.length);
  }
  return {
    count: N,
    offsets: Uint32Array.from(offsets),
    targets: Uint32Array.from(targets),
    weights: Float32Array.from(weights),
    signs,
    population: Uint16Array.from({ length: N }, (_, i) => Math.floor(i / 8)),
  };
}
/** Directed double-edge swaps, matching sign AND weight: preserves per-node in/out,
 * signed in/out degree and incoming/outgoing weight multisets. No self/parallel edges. */
export function shuffle(source: CSRGraph, seed: number): CSRGraph {
  const graph = {
    ...source,
    offsets: source.offsets.slice(),
    targets: source.targets.slice(),
    weights: source.weights.slice(),
    signs: source.signs.slice(),
    population: source.population.slice(),
  };
  const sources: number[] = [];
  const adj = Array.from({ length: graph.count }, () => new Set<number>());
  for (let i = 0; i < graph.count; i++)
    for (let e = graph.offsets[i]; e < graph.offsets[i + 1]; e++) {
      sources[e] = i;
      adj[i].add(graph.targets[e]);
    }
  const rng = random(seed);
  const m = graph.targets.length;
  for (let k = 0; k < m * 60; k++) {
    const a = Math.floor(rng() * m),
      b = Math.floor(rng() * m),
      u = sources[a],
      v = sources[b],
      x = graph.targets[a],
      y = graph.targets[b];
    if (
      u === v ||
      u === y ||
      v === x ||
      x === y ||
      graph.weights[a] !== graph.weights[b] ||
      graph.signs[u] !== graph.signs[v] ||
      adj[u].has(y) ||
      adj[v].has(x)
    )
      continue;
    adj[u].delete(x);
    adj[v].delete(y);
    adj[u].add(y);
    adj[v].add(x);
    graph.targets[a] = y;
    graph.targets[b] = x;
  }
  return graph;
}
export function fingerprint(graph: CSRGraph): string {
  let h = 2166136261;
  for (const array of [
    graph.offsets,
    graph.targets,
    graph.weights,
    graph.signs,
    graph.population,
  ])
    for (const b of new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength,
    ))
      h = Math.imul(h ^ b, 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}
export interface Perturbation {
  population: number;
  kind: "none" | "silence" | "stimulate";
}
export interface SimulationBackend {
  readonly graph: CSRGraph;
  readonly spikes: Uint8Array;
  readonly trace: Float32Array;
  step(input: readonly number[], perturb: Perturbation): void;
}
export class LIF implements SimulationBackend {
  readonly voltage: Float32Array;
  readonly spikes: Uint8Array;
  readonly trace: Float32Array;
  private readonly refractory: Uint8Array;
  private readonly current: Float32Array;
  constructor(readonly graph: CSRGraph) {
    this.voltage = new Float32Array(graph.count);
    this.spikes = new Uint8Array(graph.count);
    this.trace = new Float32Array(graph.count);
    this.refractory = new Uint8Array(graph.count);
    this.current = new Float32Array(graph.count);
  }
  step(
    input: readonly number[],
    perturb: Perturbation = { population: 0, kind: "none" },
  ) {
    this.current.fill(0);
    for (let i = 0; i < this.graph.count; i++)
      if (
        this.spikes[i] &&
        !(
          perturb.kind === "silence" &&
          this.graph.population[i] === perturb.population
        )
      )
        for (let e = this.graph.offsets[i]; e < this.graph.offsets[i + 1]; e++)
          this.current[this.graph.targets[e]] += this.graph.weights[e];
    for (let i = 0; i < this.graph.count; i++) {
      const p = this.graph.population[i],
        selected = p === perturb.population;
      this.spikes[i] = 0;
      if (selected && perturb.kind === "silence") {
        this.voltage[i] = 0;
        this.trace[i] = 0;
        this.refractory[i] = 0;
        continue;
      }
      if (this.refractory[i] > 0) this.refractory[i]--;
      else {
        const drive = (input[p] ?? 0) * (0.94 + (i % 8) * 0.018);
        this.voltage[i] = Math.max(
          -1,
          this.voltage[i] * MODEL.leak +
            drive +
            this.current[i] +
            (selected && perturb.kind === "stimulate" ? 0.9 : 0),
        );
        if (this.voltage[i] >= MODEL.threshold) {
          this.spikes[i] = 1;
          this.voltage[i] = MODEL.reset;
          this.refractory[i] = MODEL.refractoryTicks;
        }
      }
      this.trace[i] =
        this.trace[i] * MODEL.traceDecay +
        this.spikes[i] * (1 - MODEL.traceDecay);
    }
  }
}
