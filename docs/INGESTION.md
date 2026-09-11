# MaleCNS v1.0: Phase 2 bounded import evidence

Historical Phase 2 contract below. [Phase 3](PHASE3.md) adds a separately validated real circuit through successful anonymous neuPrint queries, while preserving this importer and its stricter prediction-confidence policy.

## Authoritative access finding (2026-09-11)

The [official Janelia download page](https://male-cns.janelia.org/download/) has both authenticated neuPrint instructions and anonymous flat-table links. Its rendered text extraction initially showed only the authenticated API instructions; inspecting the actual official HTML revealed the flat tables. **Authentication is not required for every MaleCNS access route.**

The [official release page](https://male-cns.janelia.org/release/) identifies v1.0 as June 8, 2026 and licenses the dataset under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution: FlyEM (HHMI Janelia), University of Cambridge Department of Zoology, MRC Laboratory of Molecular Biology, and Google Research, Male CNS connectome collaboration. The project page links the [Cell publication](<https://www.cell.com/cell/fulltext/S0092-8674(26)00942-6>). No source implementation code was copied.

Verified official objects under `https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/`:

| Object                                               | HTTP HEAD bytes | Verified relevant Arrow columns                                                                                   |
| ---------------------------------------------------- | --------------: | ----------------------------------------------------------------------------------------------------------------- |
| body-annotations-male-cns-v1.0-minconf-0.5.feather   |      14,483,314 | bodyId: int64; curated type/class/side annotations, not transmitter properties                                    |
| body-neurotransmitters-male-cns-v1.0.feather         |      43,282,834 | body: int64; cell_type: string; predicted_nt: string; predicted_nt_confidence: double; consensus_nt; ground_truth |
| connectome-weights-male-cns-v1.0-minconf-0.5.feather |   1,051,241,946 | body_pre: int64; body_post: int64; weight: int64                                                                  |

The whole connectivity object was **not downloaded**. Footer/schema inspection used 66,614 bytes. The selected extraction read only the first record batch of the NT and edge tables plus needed metadata, using 3,685,468 bytes. Every data response had to be HTTP 206, exact-length, and pinned by the ETag from its HEAD request. One extraction has a hard aggregate 12 MiB limit. Raw fetched ranges are retained locally with SHA-256.

## What was actually ingested

**159 body records, 128 directed pairs, 105,268 raw synapses.**

Selection: first 128 non-self edges in the first official edge batch whose endpoints occur in the first NT batch with predicted acetylcholine or GABA and prediction confidence at least 0.8. This is a heavily selected, high-weight-biased import sample, **not an induced, complete, representative or functionally validated circuit**. Exact source row indices are in the manifest.

Connectivity counts are measured anatomy. ACh → +1 and GABA → −1 is an explicitly **inferred model policy**, not a claim that every physiological effect is known. Other transmitter labels, low confidence and unresolved signs are rejected, not guessed. Float32 signed-count gain 0.01 is **demo-only**; exact unsigned 64-bit synapse counts are stored separately. Population mapping is unassigned. The imported artifact declares `simulationReady: false` and cannot be loaded through the miniature browser replay importer. The web app still runs only nt-mini.

Local ignored evidence:

- `data/raw/malecns-bounded-v1/source.json`, normalized CSVs, and `ranges/`
- `data/processed/malecns-bounded-v1/manifest.json` and typed-array binaries
- `artifacts/phase2/official-schemas.json`
- `artifacts/phase2/source-verification.json`

Normalized neuron CSV SHA-256: `9932ab3a5510876d5bda86d449a70c1a9ef4a9f6ede2ed1c5b4e28a6fb3458f6`.

Normalized edge CSV SHA-256: `9b8eeaf64580a2cc5f5b4e33f4c57d6af08bf9917a05d6ce572108e50ee0979b`.

Source manifest SHA-256: `349463d458e7c2979d4467dafafc30063cf7d8746059cee0f830b261aabb19b9`.

Checksums cover the exact retained ranges and selected normalized CSVs. **No full-object SHA-256 is claimed.** Offline verification reconstructs the Arrow record batches from those ranges, checks each CSV edge and transmitter field against the source rows, checks endpoint membership, and recomputes the synapse total with PyArrow independently of the TypeScript CSR importer. No raw or processed upstream data are committed.

## Production-shaped offline importer

```sh
npm run import:connectome -- data/schema-fixture/source.json data/processed/synthetic-check
# After an explicit authorized extraction:
npm run import:connectome -- data/raw/malecns-bounded-v1/source.json data/processed/malecns-bounded-v1
```

The CLI has no network or credential code. It verifies SHA-256 **before conversion**, validates exact normalized CSV columns and provenance, preserves IDs as strings, rejects unknown signs, duplicate neuron IDs, unsorted pairs, dangling references, integer overflow, incorrect independent totals, changed-source hashes and path escapes. Source rows are streamed twice: count/validate, then fill CSR arrays. Adjacent duplicate pairs are explicitly aggregated, with raw counts retained in BigUint64Array independently of Float32 model weights. Inputs must be numerically sorted upstream; do not feed a giant unsorted table and expect an in-memory sort. The official subset normalizer sorts only its 128 selected rows.

CSV record size and declared allocation totals are bounded. Neuron metadata is held in memory; edges are not kept in a JavaScript object graph. Output is staged in a new directory and renamed only after successful validation. Existing outputs are never overwritten. Artifact checksums and little-endian array types are recorded. This is a production-shaped boundary, not a production-scale ingestion benchmark.

## Reproduce source extraction, explicitly opt-in

Install Python dependencies into a project-local environment using `tools/requirements.txt`. Then:

```sh
.cache/arrow/bin/python tools/inspect_malecns.py --allow-network
.cache/arrow/bin/python tools/fetch_malecns_subset.py --allow-network
.cache/arrow/bin/python tools/verify_malecns_subset.py data/raw/malecns-bounded-v1
```

The extractor refuses to overwrite retained evidence. The verifier is fully offline. CI runs only mocked HTTP-range safety tests and the original synthetic CSV fixture, never source retrieval.

## Exact remaining authentication and science gates

A targeted neuPrint query on `https://neuprint.janelia.org`, dataset `male-cns:v1.0`, requires an account/API authorization according to the official download guidance. If that route is needed later, the owner must authenticate and perform a bounded export in their own protected environment or browser. No token belongs in chat, commands, URLs, logs or repository files; this project neither requests nor stores it. Anonymous range extraction succeeded here, so an authentication blocker is **not** the ingestion outcome of Phase 2.

The next scientific gate is to choose a coherent attributable circuit, resolve transmitter/receptor assumptions, instantiate published dynamics, and compare reference-circuit predictions with matched controls and numerical replay before any embodied biological claim or whole-dataset scale-up.

## Scale path, not a scale claim

The current SimulationBackend consumes CSR with Uint32 offsets/targets, Float32 weights, Int8 signs and Uint16 populations. The LIF step is sparse over outgoing edges of previously active neurons and linear over neuron state. It never allocates a dense adjacency matrix. A WebGPU/native backend can implement the same tick/event semantics, with its own numerical tolerance contract and golden traces.

At 166,700 neurons, neuron arrays are modest. Aggregated edge count, not the approximately 125 million source synapses, determines CSR memory: roughly 8 bytes per aggregated edge plus 4 bytes per neuron offset, before metadata/staging. If all 125 million synapses were represented individually, targets and weights alone would require about 1 GB. That has not been benchmarked or approved here.

The original in-memory adapter remains fixture-scale. Phase 2 adds streamed normalized CSV ingestion, adjacent-pair aggregation, compact binary arrays, byte order and checksums. Full-table Parquet conversion, external sorting and production-scale ingestion measurements remain deferred. The current shuffle also uses Sets and must be replaced or benchmarked at scale. Worker snapshots currently clone all 48 spikes and short paths; full-scale rendering needs transferred/downsampled regional summaries, spike sampling, streaming recording and bounded memory. The UI's six named demo populations and motor mappings must not silently apply to real anatomy.

No WebGPU, CUDA, neuPrint credentials, full dataset downloads or persistent services are part of Phase 2. Final review additionally added exact Content-Range/response-ETag checks and an allowlist. Those new checks are covered by mocked tests; the previously retained extraction is not relabelled as having used them.
