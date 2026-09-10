# Phase 2: Rigor, Scale, and Public Portfolio Quality

## Objective

Turn the strong Milestone 1 vertical slice into a credible public research-engineering project. Improve the repository without crossing the line from a validated framework into unsupported biological claims.

## Workstreams

### 1. Public-repository quality

- Add GitHub Actions CI for locked install, strict typecheck, unit tests, formatting, production build, and Chromium browser tests.
- Make Playwright work both with a system Chromium locally and its managed Chromium in CI.
- Commit an optimized, reviewed project screenshot under docs/assets and use it in the README.
- Add useful badges and concise contributor/development guidance without turning the README into marketing paste.
- Keep package publication disabled. Do not deploy or create a release in this phase.

### 2. Better AI evidence

Replace the single-score demonstration as the primary evidence with a deterministic benchmark harness that:

- evaluates the fixed Biological fixture and many independently shuffled matched controls;
- uses disjoint train, validation, and test streams;
- records per-seed metrics and summary statistics;
- includes zero-feature, no-recurrence, and population-ablation controls;
- verifies that recurrent weights never change;
- exports machine-readable JSON and a concise Markdown report;
- states plainly that fixture results validate methodology, not Drosophila topology.

Prefer a small closed-loop or cross-context sensorimotor task over another trivially separable static decoding task. If a closed-loop benchmark cannot be made scientifically coherent in this pass, retain the current calibration and add a clearly motivated multi-seed generalisation benchmark instead of faking sophistication.

### 3. MaleCNS ingestion gate

Investigate the official MaleCNS v1.0 download surfaces and exact schemas. Use only authoritative Janelia/neuPrint/Cell release sources.

- If a small official subset can be fetched anonymously and its licence/attribution verified, ingest that bounded subset, record source URL and SHA-256, and add independently checked totals and a provenance manifest. Do not commit upstream raw data unless its licence and practical size clearly support that.
- If access requires an account or token, do not request, expose, or invent credentials. Implement and test the importer against a synthetic schema-equivalent fixture, document the exact host-owned credential/download step, and report the authentication gate honestly.
- Treat body IDs as strings, reject unresolved transmitter signs, aggregate duplicate directed pairs explicitly, and preserve source synapse counts separately from model weights.
- Never relabel a schema fixture as real anatomy.

### 4. Scale and performance evidence

Add a reproducible benchmark that exercises the production-shaped CSR/LIF boundary at materially larger synthetic sizes without claiming a full MaleCNS run. Record generation time, memory estimate, simulation throughput, active-neuron count, and edge traversals. Keep CI bounded and provide an opt-in heavier local profile.

Profile before optimizing. Improve clone/snapshot or rendering data paths only where measurements identify a real bottleneck. Do not add WebGPU merely for a badge.

### 5. Experience refinement

Retain the restrained scientific-instrument direction. Improve any visual hierarchy, labelling, responsive behavior, keyboard path, and explanatory copy found weak during direct browser review. The fixture warning, provenance, mode distinction, and experimental limitations must remain conspicuous.

## Acceptance gate

- CI workflow is valid and passes on the public repository after review and merge.
- Fresh local install, format check, strict typecheck, unit tests, production build, and browser tests pass.
- Benchmark results are deterministic and machine-readable, with at least 20 matched control seeds and appropriate ablations.
- The benchmark report makes no unsupported topology claim.
- Ingestion code validates provenance, identifiers, schema, sign policy, duplicate aggregation, totals, and checksums.
- Real MaleCNS use is either verified with an authoritative bounded subset or explicitly blocked on authenticated download. No ambiguous middle state.
- A larger synthetic CSR profile runs successfully and reports what it does and does not establish.
- Desktop and compact screenshots are directly inspected after the changes.
- No secrets, raw large datasets, telemetry, deployment, release, or unrelated files enter the repository.
- Work is committed on feat/phase-2-rigor for main-seat review before merge.
