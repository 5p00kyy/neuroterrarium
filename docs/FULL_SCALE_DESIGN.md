# From scaffolding to a multiscale connectome instrument

**Design, not a running full-brain claim.** The browser runs the 48-neuron synthetic fixture. Phase 2 separately verified a 159-body MaleCNS import and a 166,700-neuron synthetic CPU workload. Neither establishes a full MaleCNS simulation. The fixture is disposable scaffolding for contracts and interaction, not the product destination.

## Data and execution path

```text
Official MaleCNS tables + attribution + checksums
    ↓ explicit offline compiler
Versioned compact graph + exact counts + provenance + hierarchy
    ↓ backend contract, validated circuit/model first
CPU worker / future WebGPU or native simulation
    ↓ tick-stamped bounded activity stream
Region → cell-type → selected circuit visualization
    ↘ on-demand selected neuron/morphology tiles
```

1. **Offline compiler.** Verify release/licence, source bytes and schemas; preserve uint64 body IDs; external-sort and stream edge aggregation. Resolve transmitter/sign/receptor policy explicitly, rejecting unresolved cases. Emit little-endian CSR shards, stable ID dictionaries, integer source counts, model-weight transforms, hierarchy indices and per-artifact checksums. Compile coarse signed region/cell-type route summaries once, not during every browser frame. Current tooling implements bounded normalized CSV ingestion and binary output, not the full compiler or an external sorter.
2. **Compact graph and provenance.** Counts, inferred signs, published dynamics and model gains are separate fields. Selection policy, omissions, total counts, source release, compiler/model versions and checksum chain travel with every experiment. A graph that imports successfully is not automatically simulation-ready.
3. **Scalable simulation backend.** Keep deterministic tick/event semantics behind the existing backend boundary. The current CPU LIF is a reference, not a full-scale real-time guarantee. Future WebGPU must declare numerical tolerances and validate golden traces, reductions and replay before comparison claims. A native/local service is an alternative for workloads beyond browser memory, but is not implemented or deployed. Every backend must respect plasticity masks, matched controls and recording budgets.
4. **Downsampled activity stream.** Simulation owns all ticks. Visualization receives bounded, tick-stamped windows containing population spike counts/rates, signed route aggregates, motor outputs and a small explicitly selected neuron sample. Include window length, sequence, dropped-window counts and normalization, so "quiet" cannot silently mean "not transmitted". Use transferable buffers and a bounded ring; choose the newest complete window under backpressure. Exact experiment recording is a separate sink, not an unbounded React history.
5. **Multiscale visualization.** Start at brain/VNC/region overview. Drill into cell types, then a selected circuit. Each level has a strict node/edge budget, with aggregated arrows preserving counts and sign partitions. Never instantiate 166,700 DOM/SVG/Three nodes by default. Load skeleton/mesh tiles for selected bodies on demand, with cache limits, cancellation and retained attribution. Morphology is observed anatomy; schematic route layouts must never masquerade as anatomical positions.

## Why aggregate source synapses?

Approximately 125 million source synapses are individual anatomical contacts, not necessarily 125 million independent runtime connections. A current-based neuron-pair model can normally sum contacts connecting the same presynaptic/postsynaptic pair into one weighted directed edge. Runtime storage and traversal then depend on the measured number of unique pairs, plausibly millions, **not a hardcoded estimate or a verified full-table count in this project**. Preserve the exact integer contact count alongside the derived weight, and prove that compiled totals reconcile with retained source totals. Do not silently throw away multiplicity.

Pair aggregation is valid only for contacts the chosen dynamics treat identically. If receptor class, delay, sign, compartment or plasticity identity matters, partition by those properties before aggregation, or keep the required contact-level representation. Preserve source references so a detailed view or future model can recover what the coarse graph collapsed. The full compiler must measure the resulting edge count and memory; this note is not permission to download the full source.

## Visual pass implemented now

- Original Drosophila-inspired avatar: segmented abdomen, head/thorax, faceted red eyes, veined wings, halteres, aristae, bristles and six articulated legs. Distance/speed drives a tripod-like presentation gait. Tick-driven antenna/wing/abdomen micro-motion is cosmetic, freezes with simulation time and never creates body displacement or neural activity. This is not validated biomechanics. All modes share the same geometry and body scale.
- Instanced soil granules and a small seeded procedural texture, warm key/shadows, glass rim and explicit arena/macro framing. Demand rendering avoids continuous canvas work while paused, and the shadow map is capped at 1024². No downloaded assets, bloom stack or external texture dependency. Macro framing targets the selected specimen only when requested/mode-changed; it does not continuously hijack orbit control.
- In-world stimulus markers derive only from retained stimuli and simulation tick. Light bearing points to the actual reference body. Odour contours use the model distance envelope; motes illustrate a static field, not simulated diffusion. Touch and looming are global timed currents in this fixture, explicitly labelled as such. Obstacle geometry marks the 0.72-unit blocked-center radius and 1.4-unit threat threshold. These are demo policies, not measured sensory physics.
- Neural-flow DTOs aggregate actual graph edges by source population, target population and sign. The current six-group schematic uses the selected graph, including the seeded Control shuffle, and checks its fingerprint before rendering routes. Bright routes mean a source spike exists in the current display snapshot; they do not assert observed axonal travel or causal inference. Forty-eight cell dots are appropriate only for this fixture; narrow screens switch to readable population tiles instead of shrinking a dense diagram. Future streams supply bounded group DTOs directly, replacing the miniature client-side aggregation.

## Next acceptance gates

Directly inspect fresh desktop/macro/compact captures on an authorized image surface; automated DOM and screenshot checks are not art-direction acceptance. Then validate one coherent attributable real circuit and publish its limitations in the instrument before attempting full-source compilation. Measure compiler peak memory, backend throughput, transfer bandwidth and browser frame-time distributions separately. The existing synthetic CPU score must not stand in for any of those missing measurements.
