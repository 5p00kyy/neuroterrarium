import { type CSRGraph, MODEL } from "./network";
export const COMPILER = "bounded-circuit-1";
export interface CircuitNeuron {
  id: string;
  type: string;
  instance: string;
  superclass: string;
  side: string;
  nt: string;
  predictedNt: string;
  confidence: number;
  regions: string[];
  regionContacts: Record<string, { pre?: number; post?: number }>;
}
export interface Circuit {
  schema: "neuroterrarium-circuit/1";
  id: string;
  title: string;
  anatomy: "measured" | "synthetic";
  release: string;
  license: string;
  attribution: string;
  selection: string;
  sourceUrls: string[];
  sourceChecksums: Record<string, string>;
  sourceQueries: Record<string, string>;
  compiler: string;
  code: { commit: string; dirty: boolean };
  contract: {
    induced: boolean;
    endpointClosed: boolean;
    truncated: boolean;
    signPolicy: "consensus-ach-gaba-inferred-1";
    externalBoundary: "cut-zero-current";
    excludedIds: string[];
    omittedOutgoingContacts: string;
    incomingBoundary: "not-quantified";
  };
  model: {
    version: string;
    gain: number;
    dynamics: "demo-only";
    sensory: "demo-only";
    delays: "demo-only";
    mechanics: "not-used";
    reward: "not-used";
  };
  neurons: CircuitNeuron[];
  edges: { pre: string; post: string; contacts: string }[];
  totals: {
    neurons: number;
    rows: number;
    uniquePairs: number;
    rawContacts: string;
  };
}
const uint = (v: unknown) =>
  typeof v === "string" &&
  /^(0|[1-9][0-9]*)$/.test(v) &&
  BigInt(v) <= (1n << 64n) - 1n;
export function loadCircuit(value: unknown): {
  manifest: Circuit;
  graph: CSRGraph;
  rawCounts: BigUint64Array;
  simulationReady: true;
} {
  const c = value as Circuit;
  if (
    !c ||
    c.schema !== "neuroterrarium-circuit/1" ||
    c.compiler !== COMPILER ||
    !c.id ||
    !c.title ||
    !["measured", "synthetic"].includes(c.anatomy) ||
    !c.license ||
    !c.attribution ||
    !c.selection ||
    !c.code?.commit ||
    !c.sourceUrls?.length ||
    !c.sourceChecksums ||
    !c.sourceQueries ||
    !Object.values(c.sourceQueries).length ||
    !Object.values(c.sourceChecksums).length ||
    !Object.values(c.sourceChecksums).every((x) => /^[a-f0-9]{64}$/.test(x))
  )
    throw Error("Incomplete circuit provenance");
  if (
    c.anatomy === "measured" &&
    (c.release !== "male-cns:v1.0" ||
      c.license !== "CC-BY-4.0" ||
      !c.sourceUrls.every((u) =>
        [
          "https://neuprint.janelia.org/api/custom/custom",
          "https://male-cns.janelia.org/release/",
          "https://male-cns.janelia.org/download/",
        ].includes(u),
      ))
  )
    throw Error("Unsupported measured authority");
  if (
    !c.contract?.induced ||
    !c.contract.endpointClosed ||
    c.contract.truncated ||
    c.contract.signPolicy !== "consensus-ach-gaba-inferred-1" ||
    c.contract.externalBoundary !== "cut-zero-current" ||
    c.contract.incomingBoundary !== "not-quantified" ||
    !uint(c.contract.omittedOutgoingContacts) ||
    !Array.isArray(c.contract.excludedIds) ||
    !c.contract.excludedIds.every(uint)
  )
    throw Error("Incomplete topology/sign/boundary contract");
  if (
    c.model?.version !== MODEL.version ||
    c.model.dynamics !== "demo-only" ||
    c.model.sensory !== "demo-only" ||
    c.model.delays !== "demo-only" ||
    c.model.mechanics !== "not-used" ||
    c.model.reward !== "not-used" ||
    !Number.isFinite(c.model.gain) ||
    c.model.gain <= 0 ||
    c.model.gain > 1
  )
    throw Error("Undeclared dynamics or gain");
  if (
    !Array.isArray(c.neurons) ||
    !c.neurons.length ||
    c.neurons.length > 256 ||
    !Array.isArray(c.edges) ||
    c.edges.length > 16384
  )
    throw Error("Circuit allocation cap");
  const ids = new Map<string, number>();
  const populations = [...new Set(c.neurons.map((n) => n.type))].sort();
  for (const [i, n] of c.neurons.entries()) {
    if (
      !uint(n.id) ||
      ids.has(n.id) ||
      c.contract.excludedIds.includes(n.id) ||
      !n.type ||
      !n.instance ||
      !n.superclass ||
      !["acetylcholine", "gaba"].includes(n.nt) ||
      !Number.isFinite(n.confidence) ||
      n.confidence < 0 ||
      n.confidence > 1 ||
      !Array.isArray(n.regions) ||
      !n.regions.every((r) => typeof r === "string") ||
      !n.regionContacts
    )
      throw Error("Invalid neuron or unresolved transmitter sign");
    ids.set(n.id, i);
  }
  const rows = c.neurons.map(() => new Map<number, bigint>());
  let total = 0n;
  for (const e of c.edges) {
    const a = ids.get(e.pre),
      b = ids.get(e.post);
    if (a === undefined || b === undefined)
      throw Error("Dangling circuit endpoint");
    if (!uint(e.contacts) || e.contacts === "0")
      throw Error("Invalid raw contacts");
    const sum = (rows[a].get(b) ?? 0n) + BigInt(e.contacts);
    if (sum > (1n << 64n) - 1n) throw Error("Contact overflow");
    rows[a].set(b, sum);
    total += BigInt(e.contacts);
  }
  const offsets = new Uint32Array(c.neurons.length + 1),
    targets: number[] = [],
    weights: number[] = [],
    counts: bigint[] = [];
  rows.forEach((row, i) => {
    for (const [j, count] of [...row].sort((a, b) => a[0] - b[0])) {
      targets.push(j);
      counts.push(count);
      const weight = Math.fround(
        Number(count) * c.model.gain * (c.neurons[i].nt === "gaba" ? -1 : 1),
      );
      if (!Number.isFinite(weight)) throw Error("Weight overflow");
      weights.push(weight);
    }
    offsets[i + 1] = targets.length;
  });
  if (
    c.totals?.neurons !== ids.size ||
    c.totals.rows !== c.edges.length ||
    c.totals.uniquePairs !== targets.length ||
    c.totals.rawContacts !== String(total)
  )
    throw Error("Independent circuit totals mismatch");
  return {
    manifest: structuredClone(c),
    simulationReady: true,
    rawCounts: BigUint64Array.from(counts),
    graph: {
      count: ids.size,
      offsets,
      targets: Uint32Array.from(targets),
      weights: Float32Array.from(weights),
      signs: Int8Array.from(c.neurons.map((n) => (n.nt === "gaba" ? -1 : 1))),
      population: Uint16Array.from(
        c.neurons.map((n) => populations.indexOf(n.type)),
      ),
    },
  };
}
