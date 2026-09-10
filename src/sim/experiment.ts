import {
  fixture,
  shuffle,
  LIF,
  fingerprint,
  MODEL,
  POPULATIONS,
  type Perturbation,
} from "./network";
import {
  trainReadout,
  predict,
  TRAINING,
  type LearningReport,
} from "./learning";
import { PROVENANCE } from "./provenance";
export const MODES = ["Biological", "Adaptive", "Control"] as const;
export type Mode = (typeof MODES)[number];
export type Tool = "light" | "loom" | "odor" | "touch" | "obstacle";
export interface Stimulus {
  tool: Tool;
  x: number;
  z: number;
  start: number;
}
export type Action =
  | { type: "stimulus"; tool: Tool; x: number; z: number }
  | { type: "clear" }
  | { type: "perturb"; value: Perturbation }
  | { type: "train" };
export interface RunEvent {
  tick: number;
  action: Action;
}
export interface Body {
  x: number;
  z: number;
  heading: number;
  distance: number;
  speed: number;
  turn: number;
  reward: number;
  totalSpikes: number;
}
export interface Specimen extends Body {
  mode: Mode;
  regions: number[];
  spikes: number[];
  motor: [number, number];
  path: [number, number][];
  graph: string;
}
export interface Frame {
  tick: number;
  specimens: Specimen[];
  input: number[];
  stimuli: Stimulus[];
  perturb: Perturbation;
  training: LearningReport | null;
}
export interface Output {
  tick: number;
  input: number[];
  bodies: Body[];
  spikes: number[][];
}
export interface Manifest {
  schema: "neuroterrarium-experiment/1";
  dataset: {
    id: "nt-mini";
    version: "1";
    synthetic: true;
    neurons: 48;
    edges: 192;
  };
  model: typeof MODEL;
  seed: number;
  code: { commit: string; dirty: boolean };
  comparison: string;
  parameters: {
    arenaRadius: number;
    training: typeof TRAINING;
    motorVersion: string;
  };
  provenance: typeof PROVENANCE;
  graphs: Record<Mode, string>;
  events: RunEvent[];
  ticks: number;
  outputs: Output[];
  training: LearningReport | null;
  final: Frame;
}
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export class Experiment {
  tick = 0;
  events: RunEvent[] = [];
  outputs: Output[] = [];
  stimuli: Stimulus[] = [];
  perturb: Perturbation = { population: 0, kind: "none" };
  training: LearningReport | null = null;
  readonly networks: LIF[];
  readonly bodies: Body[];
  readonly paths: [number, number][][] = [[[0, 0]], [[0, 0]], [[0, 0]]];
  input: number[] = Array(6).fill(0);
  constructor(readonly seed: number) {
    const graph = fixture();
    this.networks = [
      new LIF(graph),
      new LIF(fixture()),
      new LIF(shuffle(graph, seed)),
    ];
    this.bodies = MODES.map(() => ({
      x: 0,
      z: 0,
      heading: 0,
      distance: 0,
      speed: 0,
      turn: 0,
      reward: 0,
      totalSpikes: 0,
    }));
  }
  apply(action: Action) {
    this.events.push({ tick: this.tick, action: structuredClone(action) });
    if (action.type === "stimulus") {
      this.stimuli = this.stimuli.filter((s) => s.tool !== action.tool);
      this.stimuli.push({
        tool: action.tool,
        x: action.x,
        z: action.z,
        start: this.tick,
      });
    }
    if (action.type === "clear") this.stimuli = [];
    if (action.type === "perturb") this.perturb = { ...action.value };
    if (action.type === "train") {
      this.training = trainReadout(
        this.networks[1].graph,
        this.networks[2].graph,
        this.seed,
      );
    }
  }
  step(count = 1) {
    for (let k = 0; k < count; k++) {
      this.stimuli = this.stimuli.filter(
        (s) =>
          !(s.tool === "touch" && this.tick - s.start >= 20) &&
          !(s.tool === "loom" && this.tick - s.start >= 100),
      );
      const ref = this.bodies[0],
        input = Array(6).fill(0) as number[];
      for (const s of this.stimuli) {
        const dx = s.x - ref.x,
          dz = s.z - ref.z,
          d = Math.hypot(dx, dz),
          bearing = Math.atan2(dx, dz) - ref.heading,
          side = Math.sin(bearing),
          a = 1 / (1 + 0.12 * d * d);
        if (s.tool === "light" || s.tool === "odor") {
          const intensity = s.tool === "light" ? 0.9 : 0.35;
          input[0] += a * intensity * (0.65 + 0.45 * side);
          input[1] += a * intensity * (0.65 - 0.45 * side);
        }
        if (s.tool === "odor") input[2] += a * 0.9;
        if (s.tool === "loom") {
          input[3] += 0.5 + 0.009 * (this.tick - s.start);
          input[0] += 0.2;
          input[1] += 0.2;
        }
        if (s.tool === "touch") input[3] += 1.2;
        if (s.tool === "obstacle" && d < 1.4) input[3] += (1.4 - d) * 0.8;
      }
      this.input = input.map((n) => Math.min(1.5, n));
      this.networks.forEach((net, i) => {
        net.step(this.input, this.perturb);
        const b = this.bodies[i],
          regions = this.regions(net);
        const left = regions[4],
          right = regions[5];
        b.speed = clamp((left + right) * 5, 0, 1.8);
        b.turn = clamp(
          (left - right) * 7 +
            (i === 1 && this.training
              ? predict(this.training.weightsAfter, net.trace)
              : 0),
          -2,
          2,
        );
        b.heading += b.turn * 0.01;
        const x = b.x + Math.sin(b.heading) * b.speed * 0.01,
          z = b.z + Math.cos(b.heading) * b.speed * 0.01;
        const blocked = this.stimuli.some(
          (s) => s.tool === "obstacle" && Math.hypot(x - s.x, z - s.z) < 0.72,
        );
        if (Math.hypot(x, z) < 4.65 && !blocked) {
          b.distance += Math.hypot(x - b.x, z - b.z);
          b.x = x;
          b.z = z;
        } else b.speed = 0;
        const food = this.stimuli.find((s) => s.tool === "odor");
        b.reward = food ? Math.exp(-Math.hypot(b.x - food.x, b.z - food.z)) : 0;
        b.totalSpikes += net.spikes.reduce((sum, n) => sum + n, 0);
        if ((this.tick + 1) % 10 === 0) {
          this.paths[i].push([b.x, b.z]);
          if (this.paths[i].length > 1200) this.paths[i].shift();
        }
      });
      this.tick++;
      this.outputs.push({
        tick: this.tick,
        input: [...this.input],
        bodies: this.bodies.map((b) => ({ ...b })),
        spikes: this.networks.map((n) => Array.from(n.spikes)),
      });
    }
  }
  private regions(net: LIF) {
    return POPULATIONS.map(
      (_, p) =>
        net.trace.slice(p * 8, p * 8 + 8).reduce((sum, x) => sum + x, 0) / 8,
    );
  }
  frame(): Frame {
    return {
      tick: this.tick,
      input: [...this.input],
      stimuli: structuredClone(this.stimuli),
      perturb: { ...this.perturb },
      training: this.training,
      specimens: this.bodies.map((b, i) => ({
        ...b,
        mode: MODES[i],
        regions: this.regions(this.networks[i]),
        spikes: Array.from(this.networks[i].spikes),
        motor: [
          this.regions(this.networks[i])[4],
          this.regions(this.networks[i])[5],
        ],
        path: this.paths[i].map((p) => [...p]),
        graph: fingerprint(this.networks[i].graph),
      })),
    };
  }
  manifest(code: Manifest["code"]): Manifest {
    return {
      schema: "neuroterrarium-experiment/1",
      dataset: {
        id: "nt-mini",
        version: "1",
        synthetic: true,
        neurons: 48,
        edges: 192,
      },
      model: MODEL,
      seed: this.seed,
      code,
      comparison:
        "Yoked sensory input from Biological reference body; three independent networks, identical kinematics. Control is a single matched shuffle, not a topology benchmark.",
      parameters: {
        arenaRadius: 4.65,
        training: TRAINING,
        motorVersion: "toy-differential-1",
      },
      provenance: PROVENANCE,
      graphs: Object.fromEntries(
        MODES.map((m, i) => [m, fingerprint(this.networks[i].graph)]),
      ) as Record<Mode, string>,
      events: structuredClone(this.events),
      ticks: this.tick,
      outputs: structuredClone(this.outputs),
      training: this.training,
      final: this.frame(),
    };
  }
}
export function replay(manifest: Manifest): Experiment {
  const e = new Experiment(manifest.seed);
  let cursor = 0;
  for (let tick = 0; tick <= manifest.ticks; tick++) {
    while (
      cursor < manifest.events.length &&
      manifest.events[cursor].tick === tick
    )
      e.apply(manifest.events[cursor++].action);
    if (tick < manifest.ticks) e.step();
  }
  return e;
}
/** Strict envelope & bounded replay: imported files are data, never executable. */
export function parseManifest(value: unknown): Manifest {
  if (!value || typeof value !== "object")
    throw new Error("Expected an experiment object");
  const m = value as Manifest;
  if (
    m.schema !== "neuroterrarium-experiment/1" ||
    m.dataset?.id !== "nt-mini" ||
    m.dataset.version !== "1" ||
    m.dataset.synthetic !== true ||
    m.dataset.neurons !== 48 ||
    m.dataset.edges !== 192 ||
    !m.model ||
    Object.entries(MODEL).some(
      ([key, value]) => m.model[key as keyof typeof MODEL] !== value,
    )
  )
    throw new Error("Unsupported fixture or model version");
  if (
    m.parameters?.arenaRadius !== 4.65 ||
    m.parameters.motorVersion !== "toy-differential-1" ||
    !m.parameters.training ||
    Object.entries(TRAINING).some(
      ([key, value]) =>
        m.parameters.training[key as keyof typeof TRAINING] !== value,
    )
  )
    throw new Error("Unsupported experiment parameters");
  if (
    !Number.isInteger(m.seed) ||
    m.seed < 0 ||
    m.seed > 4294967295 ||
    !Number.isInteger(m.ticks) ||
    m.ticks < 0 ||
    m.ticks > 30000 ||
    !Array.isArray(m.events) ||
    m.events.length > 2000
  )
    throw new Error("Invalid seed, tick limit (30,000) or event limit (2,000)");
  let prior = 0,
    trainCount = 0;
  for (const e of m.events) {
    if (
      !Number.isInteger(e.tick) ||
      e.tick < prior ||
      e.tick > m.ticks ||
      !e.action
    )
      throw new Error("Invalid event order");
    prior = e.tick;
    const a = e.action;
    if (a.type === "stimulus") {
      if (
        !["light", "loom", "odor", "touch", "obstacle"].includes(a.tool) ||
        ![a.x, a.z].every(Number.isFinite) ||
        Math.hypot(a.x, a.z) > 5
      )
        throw new Error("Invalid stimulus");
    } else if (a.type === "perturb") {
      if (
        !a.value ||
        !Number.isInteger(a.value.population) ||
        a.value.population < 0 ||
        a.value.population > 5 ||
        !["none", "silence", "stimulate"].includes(a.value.kind)
      )
        throw new Error("Invalid perturbation");
    } else if (a.type === "train") {
      if (++trainCount > 20) throw new Error("Too many calibration events");
    } else if (a.type !== "clear") throw new Error("Unknown action");
  }
  const g = fixture();
  if (
    m.graphs?.Biological !== fingerprint(g) ||
    m.graphs.Adaptive !== fingerprint(g) ||
    m.graphs.Control !== fingerprint(shuffle(g, m.seed))
  )
    throw new Error("Graph fingerprint mismatch");
  if (
    !Array.isArray(m.outputs) ||
    m.outputs.length !== m.ticks ||
    !m.final ||
    !m.code ||
    typeof m.code.commit !== "string" ||
    typeof m.code.dirty !== "boolean"
  )
    throw new Error("Missing outputs or provenance");
  return m;
}
