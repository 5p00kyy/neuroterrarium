# Scientific contract, Milestone 1

## What is actually running

**nt-mini v1 is synthetic.** Its 48 neurons, six populations, 192 directed edges, signs and strengths are original demo fixtures. Neither Biological mode nor its UI name means measured anatomy is present. The app explicitly labels Biological as fixed demo topology. No MaleCNS or FlyWire rows are bundled.

The LIF family is motivated by published work, but this implementation is original and its constants are invented. Current and voltage are dimensionless, a tick is nominally 10 ms, and body distance is in arbitrary arena units. These units cannot be interpreted as experimental fly physiology.

Provenance is accessible on anatomy, each of five sensors, the dynamics, readout, control and motor/body mapping. The running choices are all **demo-only**. Published references are visibly separate. There are no measured or inferred biological mappings in this milestone.

## Three specimens, not three skins

Each mode owns separate LIF voltage, refractory, spike and trace arrays and its own body. Biological and untrained Adaptive have identical topology and dynamics and should match. Adaptive alone receives the declared learned steering readout after calibration. Control runs a seeded shuffled graph, not copied Biological outputs. Switching tabs changes inspection, not which networks execute.

Inputs are **yoked to the Biological reference body's pose** at each tick. All three networks receive the exact same six currents, including perturbations, and use identical body dynamics. This is an open-loop comparison for Adaptive/Control, not three independent closed-loop navigation trials. All motor commands nevertheless arise from their own neural activity and move their respective bodies.

The control performs directed double-edge swaps between equal-sign, equal-weight source edges. This preserves each neuron's in/out degree, signed degrees, and incoming/outgoing weight multisets, rejects self-loops and duplicate edges, and is repeatable for the seed. It does not preserve spatial wiring, motifs or all population-to-population counts, and is not a proven uniform random sampler. A single shuffle is an engineering control, not a statistical benchmark.

## Narrow adaptive task

Readout calibration decodes the side of an imposed light current into a signed steering target. It uses 24 balanced episodes and 12 separate held-out episodes, each with a fresh LIF state. Only training episodes contribute gradient updates. The fixed 600-step optimizer is not early-stopped or tuned on the displayed test curve. Seed-derived train/test streams vary stimulus intensity. Features are mean neural traces after warmup, plus a bias. Regularized linear regression changes exactly 49 declared readout coefficients. Initial weights, final weights and recurrent fingerprints are exported.

The same protocol is fitted to the matched Control for a diagnostic score. Those diagnostic weights are **not** applied to the Control specimen, which remains the fixed shuffled baseline. The zero-feature ablation predicts zero on the exactly balanced ±0.8 targets, giving MSE 0.64. This analytic ablation removes all reservoir information, not individual circuits. Population silence is also available as an interactive circuit ablation.

Training improves a supervised calibration task, not food collection, reward maximization, evolutionary fitness or general intelligence. World steering uses instantaneous traces rather than the training episode average, so navigation transfer is not established. The recurrent edge arrays do not train, and silence/stimulation changes activity rather than anatomy. No claim of real-connectome advantage follows from these scores.

## Replay and provenance

Worker ticks do not depend on rendering time. Speed controls wall-clock pacing only. All applied stimuli, clear actions, perturbations and training actions are recorded with integer ticks and within-tick order. Reset creates a new run. Replay starts fresh and rebuilds every output, then verifies all inputs, per-neuron spikes, body outputs and final traces/paths/training against the export. Imported mismatches retain the previous run and produce an explicit error.

Manifests include fixture/model versions, fixed constants, experiment seed, graph fingerprints, readout settings, event log, full tick outputs, final metrics, citations and code commit plus dirty-build marker. Graph fingerprints use FNV-1a for accidental-change detection, **not cryptographic authenticity**. Cross-browser/libm bitwise equality is not promised; exact replay is verified on the tested Chromium runtime. A different code commit is flagged even if output equality holds. Imported files are bounded to 30,000 ticks and 2,000 events. UI recordings stop at 300 simulated seconds. Full recording is fixture-scale only.

## What the body and world omit

The fly is original procedural geometry. Legs articulate as a visualization of distance travelled, not physics. Only a horizontal kinematic body, arena boundary and one circular obstacle collision are simulated. Food is a radial scalar field, not a fluid plume. The odour tool also injects directional visual current as an explicit toy shortcut. Loom and touch are timed current pulses. Plants and stones are decorative. There is no biomechanics, NeuroMechFly, energy budget, sensory adaptation, synaptic delay distribution, transmitter uncertainty or physiological validation.

The raster is labelled as display-sampled spikes (normally 20 Hz), not an exhaustive spike recording. Exports retain every 100 Hz simulation tick. Plots use recent snapshots; full replay does not reconstruct an animation history in the UI, it verifies outputs and restores the final body/path/state.

## Claims not made

This is not an uploaded mind, a conscious system, a digital twin, a 166,700-neuron live simulation or a behavioural fidelity result. Shiu et al.'s 91% figure concerns selected experimentally validated circuit predictions, not general behavioural fidelity. The project is a laboratory foundation with falsifiable controls, not evidence that its synthetic topology is biologically useful.
