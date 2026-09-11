import { mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { execFileSync } from "node:child_process";
import {
  syntheticGraph,
  profileTicks,
  memoryEstimate,
} from "../src/sim/profile";
const heavy = process.argv.includes("--heavy"),
  count = heavy ? 166700 : 10000,
  degree = heavy ? 32 : 16,
  ticks = heavy ? 200 : 100,
  seed = 4102;
const start = performance.now(),
  graph = syntheticGraph(count, degree, seed),
  generationMs = performance.now() - start;
profileTicks(graph, 5);
const t = performance.now(),
  metrics = profileTicks(graph, ticks),
  simulationMs = performance.now() - t;
const report = {
  schema: "neuroterrarium-profile/1",
  synthetic: true,
  code: {
    commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
    dirty: !!execFileSync("git", ["status", "--porcelain"]).toString().trim(),
  },
  node: process.version,
  cpu: cpus()[0]?.model,
  count,
  edges: graph.targets.length,
  degree,
  seed,
  generationMs,
  simulationMs,
  ticksPerSecond: (ticks * 1000) / simulationMs,
  simulatedSecondsPerWallSecond: (ticks * 0.01) / (simulationMs / 1000),
  ...memoryEstimate(graph),
  processMemory: process.memoryUsage(),
  ...metrics,
  limitations: [
    "Synthetic CSR, NOT MaleCNS, despite optional matched neuron count.",
    "Instrumented CPU LIF only. Includes separate counting scans; excludes UI, worker transfer, import and event recording.",
    "Warmup: 5 ticks on fresh state; measured run starts from fresh state.",
    "Typed-array estimate excludes JS objects, runtime, allocator and build tooling. RSS includes the process and warmup allocations.",
    "Wall-clock values are observational and not deterministic; seeded graph and spike/traversal counts are deterministic.",
  ],
};
mkdirSync("artifacts/phase2", { recursive: true });
writeFileSync(
  "artifacts/phase2/profile-" + (heavy ? "heavy" : "ci") + ".json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
