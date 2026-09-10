# Smallest next gate: verified MaleCNS subset

Do not start with a full download or claim that changing a neuron count is scale validation.

1. Verify MaleCNS v1.0's current release files, schema, licence and attribution directly at the source. Retain source URLs, release date, authors, CC-BY 4.0 licence and a SHA-256 of each input. Download only a deliberately small, authorised subset. No upstream data should enter Git.
2. Inspect neuron/body IDs as strings (never JavaScript numbers), transmitter probabilities, missing/unknown signs, synapse-count semantics, directed edge aggregation, self-loops and region metadata. Decide and document the sign policy. Reject unresolved signs rather than inventing excitatory defaults.
3. Map those verified fields into src/sim/adapter.ts. Its small-table converter preserves IDs, validates references and counts, aggregates duplicate pre/post rows, sorts targets, and produces CSR arrays. Source hashes are supplied metadata, not automatically verified by that converter. Compute and verify SHA-256 in the eventual import CLI before invoking it. Do not relabel fixture metadata as measured data.
4. Add a tiny attributable source sample or synthetic schema-equivalent test, with independently checked neuron/edge/synapse totals, sign coverage and reference circuit outputs. Keep source anatomy, chosen dynamics and sensor/motor mappings separate. Published LIF constants need their own versioned adapter and validation against the reference model.
5. Run the subset in a new experiment/backend version, with matched controls, stimulus traces, readout-only weight diff, deterministic replay and measured time/memory. This is the smallest credible real-data gate. It requires review before the UI can load measured artifacts.

## Scale path, not a scale claim

The current SimulationBackend consumes CSR with Uint32 offsets/targets, Float32 weights, Int8 signs and Uint16 populations. The LIF step is sparse over outgoing edges of previously active neurons and linear over neuron state. It never allocates a dense adjacency matrix. A WebGPU/native backend can implement the same tick/event semantics, with its own numerical tolerance contract and golden traces.

At 166,700 neurons, neuron arrays are modest. Aggregated edge count, not the approximately 125 million source synapses, determines CSR memory: roughly 8 bytes per aggregated edge plus 4 bytes per neuron offset, before metadata/staging. If all 125 million synapses were represented individually, targets and weights alone would require about 1 GB. That has not been benchmarked or approved here.

The reference converter uses Maps and arrays and is explicitly **not** the production-scale importer. Next implement chunked CSV/Parquet input, external sorting/aggregation, compact binary array artifacts, byte-order/version metadata and checksums. The current shuffle also uses Sets and must be replaced or benchmarked at scale. Worker snapshots currently clone all 48 spikes and short paths; full-scale rendering needs transferred/downsampled regional summaries, spike sampling, streaming recording and bounded memory. The UI's six named demo populations and motor mappings must not silently apply to real anatomy.

No WebGPU, CUDA, neuPrint credentials, full dataset downloads or persistent services are part of Milestone 1.
