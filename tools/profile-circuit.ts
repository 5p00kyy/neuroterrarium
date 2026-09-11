import raw from "../data/circuits/gf-v1/circuit.json";
import { loadCircuit } from "../src/sim/circuit";
import { LIF, fingerprint } from "../src/sim/network";
import { cpus } from "node:os";
import { execFileSync } from "node:child_process";
const { graph, rawCounts } = loadCircuit(raw),
  before = fingerprint(graph),
  net = new LIF(graph),
  types = [...new Set(raw.neurons.map((n) => n.type))].sort(),
  input = Array(types.length).fill(0) as number[];
input[types.indexOf("DNp70")] = 0.65;
const ticks = 100000,
  start = performance.now();
let spikes = 0;
for (let i = 0; i < ticks; i++) {
  net.step(input);
  spikes += net.spikes.reduce((s, n) => s + n, 0);
}
const ms = performance.now() - start;
if (fingerprint(graph) !== before)
  throw Error("Recurrence changed during profile");
console.log(
  JSON.stringify(
    {
      dataset: raw.id,
      neurons: graph.count,
      edges: graph.targets.length,
      ticks,
      spikes,
      ms,
      ticksPerSecond: (ticks * 1000) / ms,
      csrBytes: [
        graph.offsets,
        graph.targets,
        graph.weights,
        graph.signs,
        graph.population,
      ].reduce((s, a) => s + a.byteLength, 0),
      rawCountBytes: rawCounts.byteLength,
      cpu: cpus()[0].model,
      code: {
        commit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        dirty:
          execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim().length > 0,
      },
      limitation:
        "CPU LIF and spike counting only; excludes compiler, UI, worker transfers. Continuous demo current, not behavior.",
    },
    null,
    2,
  ),
);
