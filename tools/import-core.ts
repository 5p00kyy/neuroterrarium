import { createReadStream, existsSync } from "node:fs";
import {
  readFile,
  writeFile,
  mkdir,
  rename,
  rm,
  realpath,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve, relative, isAbsolute, join } from "node:path";
import { parse } from "csv-parse";
export interface ImportManifest {
  schema: "neuroterrarium-import/1";
  anatomy: "synthetic" | "measured";
  dataset: { id: string; version: string };
  license: string;
  attribution: string;
  sourceUrls: string[];
  selection: string;
  signPolicy: "ach-gaba-prediction-v1";
  minimumConfidence: number;
  gain: number;
  files: {
    neurons: { path: string; sha256: string };
    edges: { path: string; sha256: string };
  };
  expected: {
    neurons: number;
    rows: number;
    uniqueEdges: number;
    rawSynapses: string;
  };
  sourceEvidence?: unknown;
}
const integer = /^(0|[1-9][0-9]*)$/;
const max64 = (1n << 64n) - 1n;
function id(value: string) {
  if (!integer.test(value) || BigInt(value) > max64)
    throw new Error("Invalid uint64 identifier");
  return value;
}
function validate(value: unknown): ImportManifest {
  if (!value || typeof value !== "object") throw new Error("Invalid manifest");
  const m = value as ImportManifest;
  if (
    m.schema !== "neuroterrarium-import/1" ||
    !["synthetic", "measured"].includes(m.anatomy) ||
    !m.dataset?.id ||
    !m.dataset.version ||
    !m.license ||
    !m.attribution ||
    !m.selection ||
    !Array.isArray(m.sourceUrls) ||
    m.sourceUrls.length === 0
  )
    throw new Error("Incomplete provenance");
  if (
    m.anatomy === "measured" &&
    (m.dataset.id !== "male-cns" ||
      m.dataset.version !== "1.0" ||
      m.license !== "CC-BY-4.0" ||
      !m.sourceUrls.every(
        (u) =>
          u.startsWith("https://storage.googleapis.com/flyem-male-cns/v1.0/") ||
          u === "https://male-cns.janelia.org/release/",
      ))
  )
    throw new Error(
      "Measured dataset requires official MaleCNS v1.0 provenance and CC-BY attribution",
    );
  if (
    m.signPolicy !== "ach-gaba-prediction-v1" ||
    !Number.isFinite(m.minimumConfidence) ||
    m.minimumConfidence < 0.8 ||
    m.minimumConfidence > 1 ||
    !Number.isFinite(m.gain) ||
    m.gain <= 0
  )
    throw new Error("Invalid declared sign/weight policy");
  for (const key of ["neurons", "edges"] as const) {
    const f = m.files?.[key];
    if (
      !f ||
      !f.path ||
      isAbsolute(f.path) ||
      f.path.split(/[\\/]/).includes("..") ||
      !/^[0-9a-f]{64}$/.test(f.sha256)
    )
      throw new Error("Invalid source path or SHA-256");
  }
  if (
    !m.expected ||
    ![m.expected.neurons, m.expected.rows, m.expected.uniqueEdges].every(
      (n) => Number.isSafeInteger(n) && n > 0,
    ) ||
    m.expected.neurons > 5_000_000 ||
    m.expected.uniqueEdges > 50_000_000 ||
    !integer.test(m.expected.rawSynapses)
  )
    throw new Error("Invalid independent totals or importer allocation cap");
  return m;
}
export async function sha256File(path: string) {
  const hash = createHash("sha256");
  for await (const data of createReadStream(path)) hash.update(data);
  return hash.digest("hex");
}
async function* records(
  path: string,
  expectedSha: string,
  columns: string[],
): AsyncGenerator<Record<string, string>> {
  const input = createReadStream(path),
    hash = createHash("sha256");
  input.on("data", (chunk) => hash.update(chunk));
  const parser = parse({
    columns: (header: string[]) => {
      if (JSON.stringify(header) !== JSON.stringify(columns))
        throw new Error("Unexpected CSV schema");
      return header;
    },
    max_record_size: 65536,
    bom: false,
    skip_empty_lines: false,
  });
  input.on("error", (error) => parser.destroy(error));
  input.pipe(parser);
  try {
    for await (const row of parser) yield row as Record<string, string>;
    if (hash.digest("hex") !== expectedSha)
      throw new Error("Source changed during conversion (SHA-256 mismatch)");
  } finally {
    input.destroy();
    parser.destroy();
  }
}
export async function importConnectome(
  manifestPath: string,
  outputPath: string,
  code: { commit: string; dirty: boolean },
) {
  const m = validate(
      JSON.parse(await readFile(manifestPath, "utf8")) as unknown,
    ),
    root = await realpath(dirname(manifestPath));
  const paths = {} as Record<"neurons" | "edges", string>;
  for (const key of ["neurons", "edges"] as const) {
    const path = await realpath(resolve(root, m.files[key].path)),
      rel = relative(root, path);
    if (rel.startsWith("..") || isAbsolute(rel))
      throw new Error("Source symlink escapes manifest directory");
    paths[key] = path;
    if ((await sha256File(path)) !== m.files[key].sha256)
      throw new Error("SHA-256 mismatch before conversion: " + key);
  }
  const ids: string[] = [],
    types: string[] = [],
    signList: number[] = [],
    confidence: number[] = [],
    nt: string[] = [];
  for await (const row of records(paths.neurons, m.files.neurons.sha256, [
    "body",
    "cell_type",
    "predicted_nt",
    "predicted_nt_confidence",
  ])) {
    const body = id(row.body);
    if (ids.length && BigInt(body) <= BigInt(ids[ids.length - 1]))
      throw new Error("Neuron IDs must be unique and numerically sorted");
    const c = Number(row.predicted_nt_confidence);
    if (
      row.predicted_nt_confidence.trim() === "" ||
      !Number.isFinite(c) ||
      c < m.minimumConfidence ||
      c > 1 ||
      !["acetylcholine", "gaba"].includes(row.predicted_nt)
    )
      throw new Error("Unresolved transmitter sign or low confidence");
    ids.push(body);
    types.push(row.cell_type);
    signList.push(row.predicted_nt === "gaba" ? -1 : 1);
    confidence.push(c);
    nt.push(row.predicted_nt);
    if (ids.length > m.expected.neurons)
      throw new Error("Neuron total exceeds declared bound");
  }
  if (ids.length !== m.expected.neurons)
    throw new Error("Neuron total mismatch");
  const index = new Map(ids.map((value, i) => [value, i]));
  const offsets = new Uint32Array(ids.length + 1);
  let rows = 0,
    uniqueEdges = 0,
    rawSynapses = 0n;
  async function scan(
    onPair: (pre: number, post: number, count: bigint) => void,
  ) {
    let previousPre = -1,
      previousPost = -1,
      count = 0n,
      rowCount = 0,
      total = 0n,
      unique = 0;
    for await (const row of records(paths.edges, m.files.edges.sha256, [
      "body_pre",
      "body_post",
      "weight",
    ])) {
      const pre = index.get(id(row.body_pre)),
        post = index.get(id(row.body_post));
      if (pre === undefined || post === undefined)
        throw new Error("Dangling edge endpoint");
      if (!integer.test(row.weight) || BigInt(row.weight) === 0n)
        throw new Error("Invalid raw synapse count");
      const weight = BigInt(row.weight);
      if (pre < previousPre || (pre === previousPre && post < previousPost))
        throw new Error(
          "Edges must be numerically sorted by (body_pre, body_post); external-sort upstream",
        );
      if (pre !== previousPre || post !== previousPost) {
        if (previousPre >= 0) {
          onPair(previousPre, previousPost, count);
          unique++;
        }
        previousPre = pre;
        previousPost = post;
        count = 0n;
      }
      count += weight;
      if (count > max64)
        throw new Error("Aggregated uint64 synapse count overflow");
      total += weight;
      rowCount++;
      if (rowCount > m.expected.rows)
        throw new Error("Edge row count exceeds bound");
    }
    if (previousPre >= 0) {
      onPair(previousPre, previousPost, count);
      unique++;
    }
    return { rows: rowCount, uniqueEdges: unique, rawSynapses: total };
  }
  ({ rows, uniqueEdges, rawSynapses } = await scan((pre) => {
    offsets[pre + 1]++;
  }));
  if (
    rows !== m.expected.rows ||
    uniqueEdges !== m.expected.uniqueEdges ||
    rawSynapses.toString() !== m.expected.rawSynapses
  )
    throw new Error("Independent edge/synapse totals mismatch");
  for (let i = 0; i < ids.length; i++) offsets[i + 1] += offsets[i];
  const targets = new Uint32Array(uniqueEdges),
    weights = new Float32Array(uniqueEdges),
    rawCounts = new BigUint64Array(uniqueEdges),
    signs = Int8Array.from(signList),
    population = new Uint16Array(ids.length);
  let edge = 0;
  const second = await scan((pre, post, count) => {
    if (edge >= uniqueEdges) throw new Error("Edge count changed");
    targets[edge] = post;
    rawCounts[edge] = count;
    const weight = Math.fround(signs[pre] * Number(count) * m.gain);
    if (!Number.isFinite(weight) || weight === 0)
      throw new Error("Model weight overflow/underflow");
    weights[edge++] = weight;
  });
  if (
    second.rows !== rows ||
    second.uniqueEdges !== uniqueEdges ||
    second.rawSynapses !== rawSynapses
  )
    throw new Error("Source totals changed");
  if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1)
    throw new Error("Only little-endian binary writing supported");
  const output = resolve(outputPath),
    inside = relative(resolve("."), output);
  if (!inside || inside.startsWith("..") || isAbsolute(inside))
    throw new Error("Output must be a new directory inside the project");
  if (existsSync(output)) throw new Error("Output exists; refusing overwrite");
  // Validate the nearest existing ancestor before recursive mkdir can follow a symlink.
  let ancestor = dirname(output);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const ancestorRel = relative(await realpath("."), await realpath(ancestor));
  if (ancestorRel.startsWith("..") || isAbsolute(ancestorRel))
    throw new Error("Output ancestor symlink escapes project");
  await mkdir(dirname(output), { recursive: true });
  const parent = await realpath(dirname(output)),
    parentRel = relative(await realpath("."), parent);
  if (parentRel.startsWith("..") || isAbsolute(parentRel))
    throw new Error("Output parent symlink escapes project");
  const staging = output + ".partial-" + process.pid;
  await mkdir(staging);
  try {
    const buffers = { offsets, targets, weights, rawCounts, signs, population };
    const artifacts: Record<
      string,
      { sha256: string; bytes: number; type: string }
    > = {};
    for (const [name, array] of Object.entries(buffers)) {
      const bytes = Buffer.from(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );
      await writeFile(join(staging, name + ".bin"), bytes);
      artifacts[name] = {
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
        type: array.constructor.name,
      };
    }
    await writeFile(
      join(staging, "neurons.json"),
      JSON.stringify(
        ids.map((body, i) => ({
          body,
          cell_type: types[i],
          predicted_nt: nt[i],
          confidence: confidence[i],
        })),
        null,
        2,
      ) + "\n",
    );
    const result = {
      schema: "neuroterrarium-csr/1",
      code,
      provenance: m,
      endianness: "LE",
      totals: {
        neurons: ids.length,
        sourceRows: rows,
        uniqueEdges,
        rawSynapses: rawSynapses.toString(),
      },
      artifacts,
      metadata: {
        path: "neurons.json",
        sha256: await sha256File(join(staging, "neurons.json")),
      },
      mappings: {
        signs:
          "INFERRED from declared ACh/GABA prediction policy; not measured physiological signs",
        weights:
          "DEMO-ONLY Float32(sign * Number(raw uint64 count) * gain); raw uint64 counts separately retained",
        population: "UNASSIGNED: all zero, not a biological region mapping",
      },
      simulationReady: false,
    };
    await writeFile(
      join(staging, "manifest.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    await rename(staging, output);
    return result;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}
