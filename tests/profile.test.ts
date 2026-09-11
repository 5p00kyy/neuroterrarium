import { it, expect } from "vitest";
import {
  syntheticGraph,
  profileTicks,
  memoryEstimate,
} from "../src/sim/profile";
import { fingerprint } from "../src/sim/network";
it("larger synthetic CSR is reproducible, finite, loop-free and duplicate-free", () => {
  const g = syntheticGraph(2000, 16, 42);
  expect(fingerprint(g)).toBe(fingerprint(syntheticGraph(2000, 16, 42)));
  for (let i = 0; i < g.count; i++) {
    const t = [...g.targets.slice(g.offsets[i], g.offsets[i + 1])];
    expect(t).not.toContain(i);
    expect(new Set(t).size).toBe(16);
  }
  const m = profileTicks(g, 20);
  expect(m).toEqual(profileTicks(g, 20));
  expect(m.activeNeurons).toBeGreaterThan(0);
  expect(m.traversedEdges).toBeGreaterThan(0);
  expect(memoryEstimate(g).csrBytes).toBe(
    4 * (2000 + 1) + 32000 * 8 + 2000 * 3,
  );
});
