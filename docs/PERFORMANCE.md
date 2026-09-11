# Synthetic CPU scaling evidence

Measured on Node v22.23.1, Intel Xeon E5-2680 v4 @ 2.40 GHz, in the project container. These are observations, not a hardware-independent capacity guarantee. No real connectome was simulated.

## Workloads and retained measurements

| Workload                | Neurons | Aggregated edges | Measured ticks | Simulation ms |  Ticks/s | Typed-array bytes | Process RSS bytes |
| ----------------------- | ------: | ---------------: | -------------: | ------------: | -------: | ----------------: | ----------------: |
| Bounded initial profile |  10,000 |          160,000 |            100 |        29.340 | 3,408.36 |         1,500,004 |        90,501,120 |
| Heavy baseline          | 166,700 |        5,334,400 |            200 |     3,238.627 |    61.75 |        46,342,604 |       135,106,560 |
| Heavy with CPU sampling | 166,700 |        5,334,400 |            200 |     3,621.151 |    55.23 |        46,342,604 |       142,946,304 |

The heavy baseline advances 0.618 simulated seconds per wall second at the nominal 100 Hz, so **it does not reach real time**. It is not a 166,700-neuron browser benchmark or a MaleCNS run. These initial observations came from uncommitted Phase 2 code based on `473d4d5`; that earlier profile wrapper recorded only the parent commit. The final profiler records both commit and dirty state. The final verification report identifies clean reruns separately.

## Clean final rerun

Clean implementation `732d252bcc75a0e4741f1364d46e906a8750751f` produced 3,437.19 ticks/s for the bounded workload (29.094 ms / 100 ticks) and **56.31 ticks/s** for the heavy workload (3,552.039 ms / 200 ticks). Heavy generation took 122.119 ms, typed-array bytes remained 46,342,604, RSS was 137,912,320 bytes, and all deterministic activity/traversal counts matched the baseline. This observed run is below 100 Hz as well. Initial runs above remain preserved rather than replaced with the best timing.

## Reproduction and scope

`npm run profile` runs the CI-bounded workload. `npm run profile:heavy` explicitly opts into the larger synthetic graph. Both use seed 4102, degree 16 or 32, a deterministic loop-free CSR generator and the same CPU LIF implementation as the miniature. Each performs five warmup ticks and then measures a new neural state. Graph generation is measured separately. Timing includes LIF stepping and extra scans to count active neurons/traversed edges; it excludes browser rendering, worker transfer, import, event recording and graph shuffling.

Heavy baseline graph generation: 130.536 ms. Both heavy runs produced exactly 7,622,837 spikes, 166,533 ever-active neurons, maximum 56,282 simultaneous active neurons, and 242,680,480 traversed edges. Agreement concerns deterministic workload counts, not wall time. Two timings are not a distribution or a speedup study.

CSR arrays: 43,842,104 bytes. LIF state: 2,333,800 bytes. Measurement state: 166,700 bytes. The typed-array sum excludes JS metadata, allocator/runtime overhead and warmup allocations. RSS covers the entire Node process and is not equivalent to graph memory.

## CPU sample and engineering consequence

`artifacts/phase2/lif-heavy.cpuprofile` contains 3,795 hit samples: LIF `step` 3,118 (82.2%), `profileTicks` 250 (6.6%), graph generation 69 (1.8%). These are sampled self hits, including startup, not precise exclusive wall-time fractions. The lower measured sampled-run throughput is consistent with instrumentation/load variation, not evidence of a code regression.

The bottleneck is CPU stepping, not a dense adjacency allocation. A next backend experiment should preserve deterministic tick semantics while measuring an active-spike traversal strategy or a GPU/native implementation against golden traces. No such optimization is claimed here. Full-scale matched shuffling, real-data loading, multi-specimen simulation, bounded recording, snapshot transfer and browser frame pacing need their own measurements. Do not extrapolate the synthetic degree-32 workload to the full source synapse count.

Initial evidence: `profile-heavy-baseline.json`, `profile-heavy-sampled.json`, `profile-ci-initial.json` and `lif-heavy.cpuprofile` under `artifacts/phase2/`. Latest clean reruns use `profile-ci.json` and `profile-heavy.json`.

## Browser build cost

The production browser is still the 48-neuron fixture. The Phase 2 main bundle is approximately 1,122 kB minified / 315 kB gzip; Vite emits its unmodified 500 kB chunk warning. The worker is approximately 14.31 kB. Browser interaction tests establish workflow correctness, not FPS, frame-time percentiles or end-to-end large-network throughput.
