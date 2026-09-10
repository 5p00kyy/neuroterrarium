import { it, expect } from "vitest";
import {
  convertTables,
  type DatasetProvenance,
  type NeuronRow,
} from "../src/sim/adapter";
const p: DatasetProvenance = {
  id: "import-test",
  version: "1",
  sourceUrl: "local fixture",
  license: "MIT",
  attribution: "NeuroTerrarium contributors",
  sha256: "0".repeat(64),
  anatomy: "synthetic",
  signPolicy: "explicit synthetic signs",
  weightPolicy: "signed count times gain",
};
const n: NeuronRow[] = [
  { id: "9007199254740993", sign: 1, population: 0 },
  { id: "9007199254740994", sign: -1, population: 1 },
];
it("preserves 64-bit source IDs as strings and aggregates edges deterministically", () => {
  const a = convertTables(
    n,
    [
      { pre: n[0].id, post: n[1].id, synapses: 2 },
      { pre: n[0].id, post: n[1].id, synapses: 3 },
    ],
    p,
    0.1,
  );
  expect(a.ids).toEqual(n.map((x) => x.id));
  expect([...a.graph.offsets]).toEqual([0, 1, 1]);
  expect([...a.graph.weights]).toEqual([0.5]);
});
it("rejects duplicate IDs, missing attribution and dangling edges", () => {
  expect(() => convertTables([n[0], n[0]], [], p, 1)).toThrow("Duplicate");
  expect(() => convertTables(n, [], { ...p, attribution: "" }, 1)).toThrow(
    "provenance",
  );
  expect(() =>
    convertTables(n, [{ pre: "missing", post: n[0].id, synapses: 1 }], p, 1),
  ).toThrow("Dangling");
});
