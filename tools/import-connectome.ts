import { execFileSync } from "node:child_process";
import { importConnectome } from "./import-core";
const [manifest, output] = process.argv.slice(2);
if (!manifest || !output)
  throw new Error(
    "Usage: npm run import:connectome -- source.json data/processed/new-name",
  );
const result = await importConnectome(manifest, output, {
  commit: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
  dirty: !!execFileSync("git", ["status", "--porcelain"]).toString().trim(),
});
console.log(
  JSON.stringify(
    {
      output,
      totals: result.totals,
      anatomy: result.provenance.anatomy,
      simulationReady: result.simulationReady,
    },
    null,
    2,
  ),
);
