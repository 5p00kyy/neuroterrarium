import {
  fixture,
  shuffle,
  LIF,
  fingerprint,
  random,
  type CSRGraph,
} from "./network";
export const BENCHMARK = {
  version: "delayed-cue-generalisation/1",
  seeds: 20,
  trainEpisodes: 48,
  validationEpisodes: 24,
  testEpisodes: 32,
  cueStart: 8,
  cueEnd: 38,
  readoutWindow: 12,
  lambdas: [0.0001, 0.001, 0.01],
  targetMagnitude: 0.8,
  task: "Delayed light-side decoding under held-out intensity, delay and nuisance-current shifts. Open-loop supervised generalisation, not navigation.",
  feature:
    "48 end-of-trial neural traces plus bias; no stimulus values or labels in features",
  populationAblation:
    "Visual L (population 0), clamped during both fitting and evaluation",
} as const;
export type Ablation =
  | "full"
  | "no-recurrence"
  | "population-ablation"
  | "zero-feature";
interface Episode {
  features: number[];
  target: number;
}
export interface Score {
  mse: number;
  accuracy: number;
  mae: number;
}
export interface ConditionResult {
  condition: Ablation;
  graphBefore: string;
  graphAfter: string;
  lambda: number | null;
  validation: Score;
  test: Score;
  weightL2: number;
}
export interface SeedResult {
  seed: number;
  streams: { train: number; validation: number; test: number };
  fixture: ConditionResult[];
  control: ConditionResult[];
  changedTargets: number;
}
export interface Summary {
  mean: number;
  sd: number;
  median: number;
  min: number;
  max: number;
  n: number;
}
export interface BenchmarkResult {
  schema: "neuroterrarium-benchmark/1";
  synthetic: true;
  protocol: typeof BENCHMARK;
  results: SeedResult[];
  summary: {
    condition: Ablation;
    fixtureMSE: Summary;
    controlMSE: Summary;
    pairedControlMinusFixture: Summary;
  }[];
  limitations: string[];
}
const dot = (w: number[], x: number[]) =>
  w.reduce((s, v, i) => s + v * (i === x.length ? 1 : x[i]), 0);
function corpus(
  graph: CSRGraph,
  seed: number,
  split: "train" | "validation" | "test",
  count: number,
  condition: Ablation,
): Episode[] {
  const rng = random(seed);
  return Array.from({ length: count }, (_, episode) => {
    const net = new LIF(graph),
      left = episode % 2 === 0,
      amplitude = split === "test" ? 0.85 + rng() * 0.25 : 0.45 + rng() * 0.3;
    const delay =
      split === "test"
        ? 32 + Math.floor(rng() * 17)
        : 16 + Math.floor(rng() * 17);
    const nuisance = (split === "test" ? 0.14 : 0.04) * rng(),
      end = BENCHMARK.cueEnd + delay + BENCHMARK.readoutWindow,
      x = Array(graph.count).fill(0) as number[];
    for (let t = 0; t < end; t++) {
      const cue = t >= BENCHMARK.cueStart && t < BENCHMARK.cueEnd;
      const input = [
        cue ? (left ? amplitude : 0.04) : 0,
        cue ? (left ? 0.04 : amplitude) : 0,
        nuisance,
        t > BENCHMARK.cueEnd + 5 && t < BENCHMARK.cueEnd + 15 ? nuisance : 0,
        0,
        0,
      ];
      net.step(input, {
        population: 0,
        kind: condition === "population-ablation" ? "silence" : "none",
      });
      if (t >= end - BENCHMARK.readoutWindow)
        for (let i = 0; i < graph.count; i++)
          x[i] += net.trace[i] / BENCHMARK.readoutWindow;
    }
    return { features: x, target: left ? 0.8 : -0.8 };
  });
}
/** SPD ridge normal equations solved by Cholesky. All parameters incl. bias regularized.
 * Fitting consumes train only; lambda uses validation only; test evaluated once after selection. */
function ridge(samples: Episode[], lambda: number): number[] {
  const size = samples[0].features.length + 1,
    a = Array.from({ length: size }, () => Array(size).fill(0) as number[]),
    b = Array(size).fill(0) as number[];
  for (const s of samples) {
    const x = [...s.features, 1];
    for (let i = 0; i < size; i++) {
      b[i] += (x[i] * s.target) / samples.length;
      for (let j = 0; j <= i; j++) a[i][j] += (x[i] * x[j]) / samples.length;
    }
  }
  for (let i = 0; i < size; i++) {
    a[i][i] += lambda;
    for (let j = 0; j <= i; j++) {
      let v = a[i][j];
      for (let k = 0; k < j; k++) v -= a[i][k] * a[j][k];
      a[i][j] = i === j ? Math.sqrt(v) : v / a[j][j];
    }
  }
  const y = Array(size).fill(0) as number[],
    w = Array(size).fill(0) as number[];
  for (let i = 0; i < size; i++) {
    let v = b[i];
    for (let j = 0; j < i; j++) v -= a[i][j] * y[j];
    y[i] = v / a[i][i];
  }
  for (let i = size - 1; i >= 0; i--) {
    let v = y[i];
    for (let j = i + 1; j < size; j++) v -= a[j][i] * w[j];
    w[i] = v / a[i][i];
  }
  return w;
}
function score(w: number[], data: Episode[]): Score {
  let mse = 0,
    mae = 0,
    correct = 0;
  for (const s of data) {
    const p = dot(w, s.features);
    mse += (p - s.target) ** 2;
    mae += Math.abs(p - s.target);
    correct += Math.sign(p) === Math.sign(s.target) ? 1 : 0;
  }
  return {
    mse: mse / data.length,
    mae: mae / data.length,
    accuracy: correct / data.length,
  };
}
function evaluate(
  graph: CSRGraph,
  streams: SeedResult["streams"],
  condition: Ablation,
): ConditionResult {
  const effective =
    condition === "no-recurrence"
      ? {
          ...graph,
          offsets: new Uint32Array(graph.count + 1),
          targets: new Uint32Array(),
          weights: new Float32Array(),
        }
      : graph;
  const before = fingerprint(effective);
  if (condition === "zero-feature")
    return {
      condition,
      graphBefore: before,
      graphAfter: before,
      lambda: null,
      validation: { mse: 0.64, mae: 0.8, accuracy: 0 },
      test: { mse: 0.64, mae: 0.8, accuracy: 0 },
      weightL2: 0,
    };
  const train = corpus(
      effective,
      streams.train,
      "train",
      BENCHMARK.trainEpisodes,
      condition,
    ),
    validation = corpus(
      effective,
      streams.validation,
      "validation",
      BENCHMARK.validationEpisodes,
      condition,
    );
  const candidates = BENCHMARK.lambdas
    .map((lambda) => {
      const w = ridge(train, lambda);
      return { lambda, w, validation: score(w, validation) };
    })
    .sort((a, b) => a.validation.mse - b.validation.mse || a.lambda - b.lambda);
  const chosen = candidates[0],
    test = corpus(
      effective,
      streams.test,
      "test",
      BENCHMARK.testEpisodes,
      condition,
    ),
    after = fingerprint(effective);
  if (before !== after)
    throw new Error("Recurrent graph mutated during benchmark");
  return {
    condition,
    graphBefore: before,
    graphAfter: after,
    lambda: chosen.lambda,
    validation: chosen.validation,
    test: score(chosen.w, test),
    weightL2: Math.hypot(...chosen.w),
  };
}
export function summarize(values: number[]): Summary {
  const sorted = [...values].sort((a, b) => a - b),
    mean = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    n: values.length,
    mean,
    sd: Math.sqrt(
      values.reduce((s, v) => s + (v - mean) ** 2, 0) /
        Math.max(1, values.length - 1),
    ),
    median:
      (sorted[Math.floor((sorted.length - 1) / 2)] +
        sorted[Math.floor(sorted.length / 2)]) /
      2,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}
export function runBenchmark(seedCount = BENCHMARK.seeds): BenchmarkResult {
  if (!Number.isInteger(seedCount) || seedCount < 1 || seedCount > 100)
    throw new Error("Seed count must be 1..100");
  const conditions: Ablation[] = [
    "full",
    "no-recurrence",
    "population-ablation",
    "zero-feature",
  ];
  const results = Array.from({ length: seedCount }, (_, i) => {
    const seed = 1000 + i,
      streams = {
        train: 100000 + i * 3,
        validation: 100001 + i * 3,
        test: 100002 + i * 3,
      },
      g = fixture(),
      control = shuffle(g, seed),
      before = fingerprint(g),
      cb = fingerprint(control);
    const result = {
      seed,
      streams,
      fixture: conditions.map((c) => evaluate(g, streams, c)),
      control: conditions.map((c) => evaluate(control, streams, c)),
      changedTargets: control.targets.reduce(
        (n, t, e) => n + (t !== g.targets[e] ? 1 : 0),
        0,
      ),
    };
    if (before !== fingerprint(g) || cb !== fingerprint(control))
      throw new Error("Source graph mutation");
    return result;
  });
  return {
    schema: "neuroterrarium-benchmark/1",
    synthetic: true,
    protocol: BENCHMARK,
    results,
    summary: conditions.map((condition) => {
      const f = results.map(
          (r) => r.fixture.find((c) => c.condition === condition)!.test.mse,
        ),
        c = results.map(
          (r) => r.control.find((c) => c.condition === condition)!.test.mse,
        );
      return {
        condition,
        fixtureMSE: summarize(f),
        controlMSE: summarize(c),
        pairedControlMinusFixture: summarize(c.map((v, i) => v - f[i])),
      };
    }),
    limitations: [
      "Synthetic topology only. No Drosophila or biological-topology inference.",
      "Open-loop delayed cue classification, not closed-loop navigation or reward learning.",
      "Test jointly shifts intensity, cue-to-readout delay and nuisance drive; cannot isolate each shift causally.",
      "No-recurrence removes all graph edges, including sensory-to-motor routes; neural traces still provide memory.",
      "Population ablation silences Visual L; readout is retrained under that intervention.",
      "Zero-feature predictor abstains at zero; sign accuracy is 0, not random-chance accuracy.",
      "Summary SD describes these 20 paired graph/task seeds, not biological uncertainty or a confidence interval.",
      "49 learned readout parameters; exact source CSR arrays are unchanged by fitting.",
    ],
  };
}
export function benchmarkMarkdown(result: BenchmarkResult): string {
  return [
    "# Synthetic delayed-cue generalisation benchmark",
    "",
    result.protocol.task,
    "",
    "**Synthetic fixture only. These results do not establish a biological topology advantage.**",
    "",
    result.results.length +
      " independent matched graph seeds; paired task streams; validation-only ridge selection.",
    "",
    "| Condition | Fixture test MSE (mean ± SD) | Control test MSE (mean ± SD) | Paired control − fixture |",
    "| --- | --- | --- | --- |",
    ...result.summary.map(
      (s) =>
        "| " +
        s.condition +
        " | " +
        s.fixtureMSE.mean.toFixed(6) +
        " ± " +
        s.fixtureMSE.sd.toFixed(6) +
        " | " +
        s.controlMSE.mean.toFixed(6) +
        " ± " +
        s.controlMSE.sd.toFixed(6) +
        " | " +
        s.pairedControlMinusFixture.mean.toFixed(6) +
        " |",
    ),
    "",
    "## Interpretation boundary",
    "",
    ...result.limitations.map((s) => "- " + s),
    "",
    "Per-seed validation/test MSE, MAE, sign accuracy, selected regularization, streams and recurrent fingerprints are in the accompanying JSON.",
    "",
  ].join("\n");
}
