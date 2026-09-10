import { LIF, random, type CSRGraph, fingerprint } from "./network";
export const TRAINING = {
  version: "ridge-demo-1",
  trainEpisodes: 24,
  testEpisodes: 12,
  ticksPerEpisode: 100,
  warmup: 40,
  iterations: 600,
  learningRate: 0.15,
  lambda: 0.002,
  task: "Decode left/right light into signed steering; supervised calibration, not navigation learning",
} as const;
export interface LearningReport {
  beforeMSE: number;
  afterMSE: number;
  controlMSE: number;
  ablatedMSE: number;
  accuracy: number;
  curve: number[];
  weightsBefore: number[];
  weightsAfter: number[];
  recurrentBefore: string;
  recurrentAfter: string;
  trainSeed: number;
  testSeed: number;
}
interface Sample {
  x: number[];
  y: number;
}
export const predict = (weights: readonly number[], x: ArrayLike<number>) =>
  weights.reduce((sum, w, i) => sum + w * (i === x.length ? 1 : x[i]), 0);
function episodes(graph: CSRGraph, seed: number, count: number): Sample[] {
  const rng = random(seed);
  return Array.from({ length: count }, (_, e) => {
    const net = new LIF(graph),
      left = e % 2 === 0,
      strength = 0.45 + rng() * 0.35,
      x = Array(graph.count).fill(0) as number[];
    const input = [
      left ? strength : 0.08,
      left ? 0.08 : strength,
      0.03 + rng() * 0.03,
      0,
      0,
      0,
    ];
    for (let t = 0; t < TRAINING.ticksPerEpisode; t++) {
      net.step(input);
      if (t >= TRAINING.warmup)
        for (let i = 0; i < graph.count; i++)
          x[i] += net.trace[i] / (TRAINING.ticksPerEpisode - TRAINING.warmup);
    }
    return { x, y: left ? 0.8 : -0.8 };
  });
}
const mse = (w: number[], s: Sample[]) =>
  s.reduce((sum, a) => sum + (predict(w, a.x) - a.y) ** 2, 0) / s.length;
function fit(train: Sample[], test: Sample[]) {
  const weights = Array(train[0].x.length + 1).fill(0) as number[],
    curve = [mse(weights, test)];
  for (let k = 0; k < TRAINING.iterations; k++) {
    const grad = weights.map((w) => TRAINING.lambda * w);
    for (const s of train) {
      const err = predict(weights, s.x) - s.y;
      for (let j = 0; j < weights.length; j++)
        grad[j] += (2 * err * (j === s.x.length ? 1 : s.x[j])) / train.length;
    }
    weights.forEach((_, j) => {
      weights[j] -= TRAINING.learningRate * grad[j];
    });
    if ((k + 1) % 60 === 0) curve.push(mse(weights, test));
  }
  return { weights, curve };
}
export function trainReadout(
  graph: CSRGraph,
  control: CSRGraph,
  seed: number,
): LearningReport {
  const trainSeed = (seed ^ 0x13579) >>> 0,
    testSeed = (seed ^ 0x24680) >>> 0,
    recurrentBefore = fingerprint(graph);
  const train = episodes(graph, trainSeed, TRAINING.trainEpisodes),
    test = episodes(graph, testSeed, TRAINING.testEpisodes);
  const fitted = fit(train, test),
    cTest = episodes(control, testSeed, TRAINING.testEpisodes),
    cFit = fit(episodes(control, trainSeed, TRAINING.trainEpisodes), cTest);
  return {
    beforeMSE: fitted.curve[0],
    afterMSE: mse(fitted.weights, test),
    controlMSE: mse(cFit.weights, cTest),
    ablatedMSE: 0.64,
    accuracy:
      test.filter(
        (s) => Math.sign(predict(fitted.weights, s.x)) === Math.sign(s.y),
      ).length / test.length,
    curve: fitted.curve,
    weightsBefore: Array(graph.count + 1).fill(0),
    weightsAfter: fitted.weights,
    recurrentBefore,
    recurrentAfter: fingerprint(graph),
    trainSeed,
    testSeed,
  };
}
