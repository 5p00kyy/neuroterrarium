import type { CSRGraph } from "./sim/network";
import type { Stimulus } from "./sim/experiment";
/** Display envelopes mirror existing demo policies, never feed simulation. */
export function stimulusEnvelope(s: Stimulus, tick: number) {
  // Frames are emitted after stepping: their inputs were evaluated at tick - 1.
  const age = Math.max(0, tick - 1 - s.start);
  return {
    age,
    active:
      s.tool === "touch" ? age < 20 : s.tool === "loom" ? age < 100 : true,
    threat:
      s.tool === "touch" ? 1.2 : s.tool === "loom" ? 0.5 + 0.009 * age : 0,
    phase: (age % 100) / 100,
  };
}
export const distanceEnvelope = (distance: number) =>
  1 / (1 + 0.12 * distance * distance);
export interface FlowRoute {
  from: number;
  to: number;
  sign: number;
  edges: number;
  sampledActiveEdges: number;
}
/** Bounded rendering DTO: grouped topology + sampled activity, no rendering of source synapses. */
export function aggregateFlow(
  graph: CSRGraph,
  spikes: readonly number[],
): FlowRoute[] {
  const groups = new Map<string, FlowRoute>();
  for (let from = 0; from < graph.count; from++)
    for (let e = graph.offsets[from]; e < graph.offsets[from + 1]; e++) {
      const a = graph.population[from],
        b = graph.population[graph.targets[e]],
        sign = Math.sign(graph.weights[e]),
        key = [a, b, sign].join(":");
      let g = groups.get(key);
      if (!g) {
        g = { from: a, to: b, sign, edges: 0, sampledActiveEdges: 0 };
        groups.set(key, g);
      }
      g.edges++;
      if (spikes[from]) g.sampledActiveEdges++;
    }
  return [...groups.values()].sort(
    (a, b) => a.from - b.from || a.to - b.to || a.sign - b.sign,
  );
}
