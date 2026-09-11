import { it, expect } from "vitest";
import { runBenchmark, summarize } from "../src/sim/benchmark";
it("20 matched graphs, disjoint streams, all ablations and exact deterministic results", () => {
  const result = runBenchmark();
  expect(result).toEqual(runBenchmark());
  expect(result.results).toHaveLength(20);
  const streams = result.results.flatMap((r) => Object.values(r.streams));
  expect(new Set(streams).size).toBe(60);
  expect(
    new Set(result.results.map((r) => r.control[0].graphBefore)).size,
  ).toBe(20);
  for (const r of result.results) {
    expect(r.changedTargets).toBeGreaterThan(100);
    for (const c of [...r.fixture, ...r.control]) {
      expect(c.graphBefore).toBe(c.graphAfter);
      expect(Number.isFinite(c.test.mse)).toBe(true);
    }
    expect(r.fixture.map((c) => c.condition)).toEqual([
      "full",
      "no-recurrence",
      "population-ablation",
      "zero-feature",
    ]);
  }
  expect(result.synthetic).toBe(true);
}, 30000);
it("summary is sample SD, including n=1", () => {
  expect(summarize([1, 2, 3]).sd).toBe(1);
  expect(summarize([2]).sd).toBe(0);
});
