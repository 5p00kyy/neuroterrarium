# Synthetic delayed-cue generalisation benchmark

Delayed light-side decoding under held-out intensity, delay and nuisance-current shifts. Open-loop supervised generalisation, not navigation.

**Synthetic fixture only. These results do not establish a biological topology advantage.**

20 independent matched graph seeds; paired task streams; validation-only ridge selection.

| Condition           | Fixture test MSE (mean ± SD) | Control test MSE (mean ± SD) | Paired control − fixture |
| ------------------- | ---------------------------- | ---------------------------- | ------------------------ |
| full                | 0.382233 ± 0.019242          | 0.383745 ± 0.020251          | 0.001512                 |
| no-recurrence       | 0.371280 ± 0.019540          | 0.371280 ± 0.019540          | 0.000000                 |
| population-ablation | 0.563159 ± 0.045112          | 0.559340 ± 0.049624          | -0.003820                |
| zero-feature        | 0.640000 ± 0.000000          | 0.640000 ± 0.000000          | 0.000000                 |

## Interpretation boundary

- Synthetic topology only. No Drosophila or biological-topology inference.
- Open-loop delayed cue classification, not closed-loop navigation or reward learning.
- Test jointly shifts intensity, cue-to-readout delay and nuisance drive; cannot isolate each shift causally.
- No-recurrence removes all graph edges, including sensory-to-motor routes; neural traces still provide memory.
- Population ablation silences Visual L; readout is retrained under that intervention.
- Zero-feature predictor abstains at zero; sign accuracy is 0, not random-chance accuracy.
- Summary SD describes these 20 paired graph/task seeds, not biological uncertainty or a confidence interval.
- 49 learned readout parameters; exact source CSR arrays are unchanged by fitting.

Per-seed validation/test MSE, MAE, sign accuracy, selected regularization, streams and recurrent fingerprints are in the accompanying JSON.

## Reproduce and audit

Run `npm run benchmark`. It evaluates the full 20-seed study twice, fails on any JSON difference, and writes `artifacts/phase2/benchmark.json` plus `benchmark.md`. The JSON contains the protocol, per-seed scores and stream IDs, source fingerprints, model-selection settings, summary statistics, a scientific-result SHA-256, and code commit/dirty status. No wall clock enters the scientific result.

The full fixture and shuffled graphs are nearly tied. The no-recurrence model is slightly better on this protocol. Trace memory and the readout are sufficient to explain much of the performance; these results do not support a useful recurrent-topology advantage on this task. The ablation is not a "recurrence only" causal intervention because removing all edges also removes feedforward graph routes. Do not erase that qualification.

## Protocol design

Each of 20 seeds owns one fixture run and one independently matched shuffled graph, with identical task episodes within the pair. Train, validation and test use distinct RNG streams (60 total). Each episode resets neural state, presents a left/right cue, waits, then averages 12 ticks of neural traces for the readout. Targets are balanced ±0.8. No target or raw stimulus feature is passed to the readout.

Train and validation use 0.45–0.75 cue amplitude, 16–32 ticks of delay and nuisance currents up to 0.04. Test uses 0.85–1.10 amplitude, 32–48 ticks of delay and nuisance up to 0.14. Thus this is explicitly a joint cross-context shift, not an IID accuracy estimate or a closed-loop behavioural experiment. Ridge regularization is chosen using validation only from the fixed three-candidate grid. The test stream is materialized only after that choice. No test-based early stopping or hyperparameter revision occurred.

All four conditions are evaluated for both graph families: full, no-recurrence, Visual-L population silence (retrained readout), and a zero-feature abstaining predictor. Source graphs and parameters stay fixed. The old in-app calibration remains a labelled illustration, not the primary AI evidence.
