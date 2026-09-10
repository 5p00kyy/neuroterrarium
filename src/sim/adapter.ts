import type { CSRGraph } from "./network";
/** Import boundary only. The Milestone 1 UI intentionally cannot run real datasets. */
export interface DatasetProvenance {
  id: string;
  version: string;
  sourceUrl: string;
  license: string;
  attribution: string;
  sha256: string;
  anatomy: "measured" | "synthetic";
  signPolicy: string;
  weightPolicy: string;
}
export interface NeuronRow {
  id: string;
  sign: -1 | 1;
  population: number;
}
export interface EdgeRow {
  pre: string;
  post: string;
  synapses: number;
}
export interface ConnectomeArtifact {
  provenance: DatasetProvenance;
  ids: string[];
  graph: CSRGraph;
}
/** Small-table reference conversion. Production import must use a streaming external
 * sorter, not this Map-based implementation, before millions of edges are accepted. */
export function convertTables(
  neurons: readonly NeuronRow[],
  edges: readonly EdgeRow[],
  provenance: DatasetProvenance,
  gain: number,
): ConnectomeArtifact {
  if (
    !neurons.length ||
    neurons.length > 0xffffffff ||
    !Number.isFinite(gain) ||
    gain <= 0
  )
    throw new Error("Invalid count or declared gain");
  if (
    !provenance.version ||
    !provenance.license ||
    !provenance.attribution ||
    !provenance.signPolicy ||
    !provenance.weightPolicy ||
    !/^([0-9a-f]{64})$/.test(provenance.sha256)
  )
    throw new Error("Incomplete provenance; require source SHA-256");
  const ids = neurons.map((n) => n.id),
    index = new Map(ids.map((id, i) => [id, i]));
  if (index.size !== ids.length) throw new Error("Duplicate neuron ID");
  if (
    neurons.some(
      (n) =>
        !n.id ||
        ![1, -1].includes(n.sign) ||
        !Number.isInteger(n.population) ||
        n.population < 0 ||
        n.population > 65535,
    )
  )
    throw new Error("Unknown sign or invalid population");
  const rows = neurons.map(() => new Map<number, number>());
  for (const edge of edges) {
    const pre = index.get(edge.pre),
      post = index.get(edge.post);
    if (pre === undefined || post === undefined)
      throw new Error("Dangling edge");
    if (!Number.isSafeInteger(edge.synapses) || edge.synapses <= 0)
      throw new Error("Invalid synapse count");
    const sum = (rows[pre].get(post) ?? 0) + edge.synapses;
    if (!Number.isSafeInteger(sum)) throw new Error("Synapse count overflow");
    rows[pre].set(post, sum);
  }
  const offsets = new Uint32Array(neurons.length + 1),
    targets: number[] = [],
    weights: number[] = [];
  rows.forEach((row, i) => {
    for (const [post, count] of [...row].sort((a, b) => a[0] - b[0])) {
      targets.push(post);
      const w = Math.fround(neurons[i].sign * count * gain);
      if (!Number.isFinite(w)) throw new Error("Float32 weight overflow");
      weights.push(w);
    }
    if (targets.length > 0xffffffff)
      throw new Error("CSR uint32 capacity exceeded");
    offsets[i + 1] = targets.length;
  });
  return {
    provenance: { ...provenance },
    ids,
    graph: {
      count: neurons.length,
      offsets,
      targets: Uint32Array.from(targets),
      weights: Float32Array.from(weights),
      signs: Int8Array.from(neurons.map((n) => n.sign)),
      population: Uint16Array.from(neurons.map((n) => n.population)),
    },
  };
}
