import raw from "../../data/circuits/gf-v1/circuit.json";
import { runCircuit, replayCircuit } from "./circuitExperiment";
self.onmessage = (e: MessageEvent) => {
  try {
    const run =
      e.data.type === "replay"
        ? replayCircuit(e.data.manifest)
        : runCircuit(raw, 42, e.data.population, {
            commit: __CODE_COMMIT__,
            dirty: __CODE_DIRTY__,
          });
    self.postMessage({ run, replay: e.data.type === "replay" });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
