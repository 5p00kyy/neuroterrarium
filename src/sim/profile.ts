import { LIF, random, type CSRGraph } from "./network";
export function syntheticGraph(
  count: number,
  degree: number,
  seed: number,
): CSRGraph {
  if (
    !Number.isInteger(count) ||
    count < 2 ||
    !Number.isInteger(degree) ||
    degree < 1 ||
    degree >= count ||
    count * degree > 0xffffffff
  )
    throw new Error("Invalid synthetic graph dimensions");
  const offsets = new Uint32Array(count + 1),
    targets = new Uint32Array(count * degree),
    weights = new Float32Array(count * degree),
    signs = new Int8Array(count),
    population = new Uint16Array(count),
    rng = random(seed);
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  for (let i = 0; i < count; i++) {
    offsets[i] = i * degree;
    signs[i] = i % 5 ? 1 : -1;
    population[i] = i % 6;
    let stride = 1 + Math.floor(rng() * (count - 1));
    while (gcd(stride, count) !== 1) stride = (stride % (count - 1)) + 1;
    for (let j = 0; j < degree; j++) {
      const e = i * degree + j;
      targets[e] = (i + (j + 1) * stride) % count;
      weights[e] = signs[i] * 0.12;
    }
  }
  offsets[count] = targets.length;
  return { count, offsets, targets, weights, signs, population };
}
export function profileTicks(graph: CSRGraph, ticks: number) {
  const net = new LIF(graph);
  let traversedEdges = 0,
    spikes = 0,
    maxActive = 0;
  const ever = new Uint8Array(graph.count);
  for (let t = 0; t < ticks; t++) {
    for (let i = 0; i < graph.count; i++)
      if (net.spikes[i])
        traversedEdges += graph.offsets[i + 1] - graph.offsets[i];
    net.step([0.45, 0.15, 0.1, 0, 0, 0], { population: 0, kind: "none" });
    let active = 0;
    for (let i = 0; i < graph.count; i++)
      if (net.spikes[i]) {
        active++;
        ever[i] = 1;
      }
    spikes += active;
    maxActive = Math.max(active, maxActive);
  }
  return {
    ticks,
    spikes,
    maxActive,
    activeNeurons: ever.reduce((n, v) => n + v, 0),
    traversedEdges,
  };
}
export function memoryEstimate(graph: CSRGraph) {
  const csrBytes = [
    graph.offsets,
    graph.targets,
    graph.weights,
    graph.signs,
    graph.population,
  ].reduce((n, a) => n + a.byteLength, 0);
  return {
    csrBytes,
    lifStateBytes: graph.count * 14,
    measurementStateBytes: graph.count,
    totalTypedArrayBytes: csrBytes + graph.count * 15,
  };
}
