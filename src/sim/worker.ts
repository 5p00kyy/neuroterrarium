import { Experiment, replay, parseManifest } from "./experiment";
import type { Request, Response } from "./protocol";
let experiment = new Experiment(42),
  running = false,
  speed = 1;
const code = { commit: __CODE_COMMIT__, dirty: __CODE_DIRTY__ };
const send = (message: Response) => self.postMessage(message);
const frame = () =>
  send({
    type: "frame",
    frame: experiment.frame(),
    running,
    seed: experiment.seed,
  });
self.onmessage = (event: MessageEvent<Request>) => {
  try {
    const m = event.data;
    if (m.type === "reset") {
      if (!Number.isInteger(m.seed) || m.seed < 0 || m.seed > 4294967295)
        throw new Error("Seed must be an unsigned 32-bit integer");
      running = false;
      accumulator = 0;
      experiment = new Experiment(m.seed);
    }
    if (m.type === "run") {
      running = m.running;
      speed = Math.max(0.25, Math.min(4, m.speed));
    }
    if (m.type === "step") {
      running = false;
      if (experiment.tick < 30000) experiment.step();
    }
    if (m.type === "action") {
      if (experiment.events.length >= 2000)
        throw new Error("Event limit reached. Export and reset.");
      if (m.action.type === "train" && experiment.training)
        throw new Error(
          "Readout already calibrated. Reset for another calibration.",
        );
      experiment.apply(m.action);
    }
    if (m.type === "export")
      send({ type: "export", manifest: experiment.manifest(code) });
    if (m.type === "replay") {
      running = false;
      const original = m.manifest
        ? parseManifest(m.manifest)
        : experiment.manifest(code);
      const result = replay(original);
      const match =
        JSON.stringify(result.outputs) === JSON.stringify(original.outputs) &&
        JSON.stringify(result.frame()) === JSON.stringify(original.final) &&
        JSON.stringify(result.training) === JSON.stringify(original.training);
      if (!match)
        throw new Error(
          "Replay mismatch: imported outputs or final state do not match the event log. Current run retained.",
        );
      experiment = result;
      send({
        type: "notice",
        text:
          "Replay verified: " +
          experiment.tick +
          " ticks, all neural and body outputs match." +
          (original.code.commit !== code.commit
            ? " Original code commit differs."
            : ""),
      });
    }
    frame();
  } catch (error) {
    send({
      type: "error",
      text: error instanceof Error ? error.message : String(error),
    });
    frame();
  }
};
let accumulator = 0;
setInterval(() => {
  if (!running) return;
  accumulator += 5 * speed;
  const ticks = Math.floor(accumulator);
  accumulator -= ticks;
  experiment.step(Math.min(ticks, 30000 - experiment.tick));
  if (experiment.tick >= 30000) {
    running = false;
    send({
      type: "notice",
      text: "Recording limit reached (300 simulated seconds). Export or reset.",
    });
  }
  frame();
}, 50);
frame();
