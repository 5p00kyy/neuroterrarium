import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  loadCircuit,
  COMPILER,
  type Circuit,
  type CircuitNeuron,
} from "../src/sim/circuit";
const root = "data/circuits/gf-v1";
const sha = (b: string | Buffer) =>
  createHash("sha256").update(b).digest("hex");
const checksums: Record<string, string> = {};
const queries: Record<string, string> = {};
async function source(
  name: string,
  columns: string[],
  cap: number,
): Promise<unknown[][]> {
  const base = root + "/evidence/" + name;
  const raw = await readFile(base + "/response.json"),
    request = await readFile(base + "/request.json");
  const evidence = JSON.parse(await readFile(base + "/evidence.json", "utf8"));
  const q = JSON.parse(request.toString()),
    r = JSON.parse(raw.toString());
  if (
    raw.length > 2 * 1024 * 1024 ||
    sha(raw) !== evidence.responseSha256 ||
    sha(request) !== evidence.requestSha256 ||
    q.dataset !== "male-cns:v1.0" ||
    q.cypher !== evidence.query ||
    evidence.url !== "https://neuprint.janelia.org/api/custom/custom" ||
    JSON.stringify(r.columns) !== JSON.stringify(columns) ||
    !Array.isArray(r.data) ||
    r.data.length >= cap ||
    r.data.length !== evidence.rows
  )
    throw Error("Source checksum/schema/truncation failure: " + name);
  queries[name] = q.cypher;
  checksums[name] = sha(raw);
  checksums[name + "Query"] = sha(request);
  return r.data;
}
const selectionRaw = await readFile(root + "/selection.json", "utf8"),
  selection = JSON.parse(selectionRaw);
checksums.selection = sha(selectionRaw);
const input = await source(
  "inputs",
  ["pre", "preType", "preInstance", "preNt", "post", "postType", "weight"],
  257,
);
const expected = [
  ...new Set([
    "10001",
    "10010",
    ...input
      .filter((r) => ["acetylcholine", "gaba"].includes(String(r[3])))
      .map((r) => String(r[0])),
  ]),
].sort((a, b) => Number(BigInt(a) - BigInt(b)));
if (JSON.stringify(expected) !== JSON.stringify(selection.ids))
  throw Error("Selection differs from authoritative partner census");
const nr = await source(
  "neurons",
  [
    "bodyId",
    "type",
    "instance",
    "superclass",
    "side",
    "nt",
    "predictedNt",
    "confidence",
    "roiInfo",
    "status",
  ],
  257,
);
const neurons: CircuitNeuron[] = nr.map((r) => {
  const roi = JSON.parse(String(r[8])) as CircuitNeuron["regionContacts"];
  return {
    id: String(r[0]),
    type: String(r[1]),
    instance: String(r[2]),
    superclass: String(r[3]),
    side: String(r[4]),
    nt: String(r[5]),
    predictedNt: String(r[6]),
    confidence: Number(r[7]),
    regions: Object.keys(roi).sort(),
    regionContacts: roi,
  };
});
if (JSON.stringify(neurons.map((n) => n.id)) !== JSON.stringify(expected))
  throw Error("Annotation endpoint closure failed");
const er = await source("edges", ["pre", "post", "weight"], 16385);
const edges = er.map((r) => ({
  pre: String(r[0]),
  post: String(r[1]),
  contacts: String(r[2]),
}));
const boundary = await source(
  "boundary",
  ["bodyId", "outgoingContacts", "outgoingPairs"],
  257,
);
const literal = "[" + expected.join(",") + "]";
if (
  !queries.edges.includes(
    "a.bodyId IN " + literal + " AND b.bodyId IN " + literal + " RETURN",
  ) ||
  !queries.edges.endsWith("LIMIT 16385") ||
  !queries.neurons.includes("n.bodyId IN " + literal + " RETURN") ||
  !queries.inputs.includes(
    "b.bodyId IN [10001,10010] AND e.weight >= 100 RETURN",
  ) ||
  !queries.boundary.includes("a.bodyId IN " + literal + " RETURN")
)
  throw Error("Selection query contract mismatch");
if (
  boundary.length !== neurons.length ||
  new Set(boundary.map((r) => r[0])).size !== neurons.length ||
  boundary.some((r) => !expected.includes(String(r[0])))
)
  throw Error("Boundary census incomplete");
const raw = edges.reduce((s, e) => s + BigInt(e.contacts), 0n),
  outgoing = boundary.reduce((s, r) => s + BigInt(String(r[1])), 0n);
if (outgoing < raw) throw Error("Invalid boundary total");
const manifest: Circuit = {
  schema: "neuroterrarium-circuit/1",
  id: "malecns-gf-input-v1",
  title: "Giant-fiber input microcircuit",
  anatomy: "measured",
  release: "male-cns:v1.0",
  license: "CC-BY-4.0",
  attribution:
    "Male CNS connectome collaboration: FlyEM (HHMI Janelia), University of Cambridge Department of Zoology, MRC Laboratory of Molecular Biology, Google Research. MaleCNS v1.0, June 8, 2026. Selected and normalized by NeuroTerrarium.",
  selection: selection.rationale,
  sourceUrls: [
    "https://neuprint.janelia.org/api/custom/custom",
    "https://male-cns.janelia.org/release/",
    "https://male-cns.janelia.org/download/",
  ],
  sourceChecksums: checksums,
  sourceQueries: queries,
  compiler: COMPILER,
  code: {
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    dirty:
      execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
      }).trim().length > 0,
  },
  contract: {
    induced: true,
    endpointClosed: true,
    truncated: false,
    signPolicy: "consensus-ach-gaba-inferred-1",
    externalBoundary: "cut-zero-current",
    excludedIds: [
      ...new Set<string>(
        selection.excluded.map((r: { bodyId: string }) => r.bodyId),
      ),
    ],
    omittedOutgoingContacts: String(outgoing - raw),
    incomingBoundary: "not-quantified",
  },
  model: {
    version: "demo-lif-1",
    gain: 0.002,
    dynamics: "demo-only",
    sensory: "demo-only",
    delays: "demo-only",
    mechanics: "not-used",
    reward: "not-used",
  },
  neurons,
  edges,
  totals: {
    neurons: neurons.length,
    rows: edges.length,
    uniquePairs: new Set(edges.map((e) => e.pre + ":" + e.post)).size,
    rawContacts: String(raw),
  },
};
loadCircuit(manifest);
const path = process.argv[2] ?? root + "/circuit.json";
if (process.argv.includes("--verify")) {
  const stored = JSON.parse(await readFile(root + "/circuit.json", "utf8"));
  manifest.code = stored.code;
  if (JSON.stringify(stored) !== JSON.stringify(manifest))
    throw Error("Clean recompile mismatch");
  console.log(
    "Source checksums, selection, totals and clean recompile verified",
    manifest.totals,
  );
} else {
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
  console.log(path, manifest.totals, manifest.contract);
}
