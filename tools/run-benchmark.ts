import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { runBenchmark, benchmarkMarkdown } from "../src/sim/benchmark";
const result = runBenchmark(),
  json = JSON.stringify(result, null, 2) + "\n";
if (process.argv.includes("--verify")) {
  const again = JSON.stringify(runBenchmark(), null, 2) + "\n";
  if (json !== again) throw new Error("Benchmark determinism failed");
}
mkdirSync("artifacts/phase2", { recursive: true });
const code = {
  commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
  dirty: !!execFileSync("git", ["status", "--porcelain"]).toString().trim(),
};
writeFileSync(
  "artifacts/phase2/benchmark.json",
  JSON.stringify(
    { code, sha256: createHash("sha256").update(json).digest("hex"), result },
    null,
    2,
  ) + "\n",
);
writeFileSync("artifacts/phase2/benchmark.md", benchmarkMarkdown(result));
console.log(benchmarkMarkdown(result));
console.log(
  JSON.stringify({
    determinismVerified: process.argv.includes("--verify"),
    seeds: result.results.length,
    sha256: createHash("sha256").update(json).digest("hex"),
    code,
  }),
);
