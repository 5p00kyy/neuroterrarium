import { createHash } from "node:crypto";
import raw from "../data/circuits/gf-v1/circuit.json";
import { runCircuit, replayCircuit } from "../src/sim/circuitExperiment";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const start = performance.now();
const code = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  dirty:
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
      .length > 0,
};
const run = runCircuit(raw, 42, "DNp70", code);
replayCircuit(JSON.parse(JSON.stringify(run)));
const summary = {
  schema: "neuroterrarium-smoke-summary/1",
  circuit: run.circuit.id,
  seed: run.seed,
  protocol: run.protocol,
  rows: run.rows.map(({ trace, output, spikeRaster, ...r }) => ({
    ...r,
    spikeSha256: createHash("sha256")
      .update(JSON.stringify(spikeRaster))
      .digest("hex"),
    finalTrace: trace.at(-1),
    finalOutput: output.at(-1),
  })),
  readout: run.readout,
  recurrentBefore: run.recurrentBefore,
  recurrentAfter: run.recurrentAfter,
  claim: run.claim,
};
const golden = "data/circuits/gf-v1/smoke-golden.json";
if (process.argv.includes("--record"))
  await writeFile(golden, JSON.stringify(summary, null, 2) + "\n");
else if (
  JSON.stringify(JSON.parse(await readFile(golden, "utf8"))) !==
  JSON.stringify(summary)
)
  throw Error("Circuit smoke golden mismatch");
await mkdir("artifacts/phase3", { recursive: true });
await writeFile(
  "artifacts/phase3/circuit-run.json",
  JSON.stringify(run, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    { ...summary, elapsedMs: performance.now() - start, code },
    null,
    2,
  ),
);
