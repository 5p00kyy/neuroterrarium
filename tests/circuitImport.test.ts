import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
it("offline recompile verifies exact authoritative response bytes and selected query contracts", () => {
  const result = execFileSync(
    process.execPath,
    ["--import", "tsx", "tools/compile-circuit.ts", "--verify"],
    { encoding: "utf8" },
  );
  expect(result).toContain("clean recompile verified");
  const m = JSON.parse(
    readFileSync("data/circuits/gf-v1/circuit.json", "utf8"),
  );
  expect(m.sourceQueries.edges).not.toContain("e.weight >=");
  expect(m.sourceQueries.inputs).toContain("e.weight >= 100");
});
