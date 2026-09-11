# Phase 3 verification, 2026-09-11

Implementation: **9cc053731d81790be36256570b821899b597c8a6**, branch **feat/phase-3-real-circuit**, based on clean main e22df14. Nothing was pushed, merged, deployed or released. No infrastructure, credentials, other repositories or OpenClaw files were changed.

## Clean-tree gate

All commands below ran successfully from the clean implementation commit. The final evidence commit only retains this report, compact screenshots and the clean compiler identity; scientific circuit content is unchanged. Build and experiment exports recorded dirty=false. Logs are local under .cache/phase3-clean-\*.

| Command                                                                                              | Result                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| npm ci --cache .cache/npm --no-audit --no-fund                                                       | 179 packages, 4 seconds                                                                     |
| npm run format:check                                                                                 | pass                                                                                        |
| npm run typecheck                                                                                    | strict TypeScript pass                                                                      |
| npm test                                                                                             | **63 tests, 8 files**, pass                                                                 |
| .cache/arrow/bin/python -m unittest discover -s tests/python -v                                      | **11 tests**, pass                                                                          |
| .cache/arrow/bin/ruff check tools/\*.py tests/python                                                 | pass                                                                                        |
| .cache/arrow/bin/ruff format --check tools/\*.py tests/python                                        | 7 files formatted, pass                                                                     |
| npm run benchmark                                                                                    | 20-seed synthetic benchmark, exact deterministic verification                               |
| npm run circuit:verify                                                                               | source SHA-256, exact queries, selection, totals, clean recompile pass                      |
| npm run circuit:smoke                                                                                | 12 independent conditions, full per-neuron spike replay and golden hashes pass              |
| npm run circuit:compile -- .cache/phase3-clean-reimport.json                                         | clean measured circuit re-import, 51 / 1240 / 28373                                         |
| npm run import:connectome -- data/schema-fixture/source.json data/processed/phase3-committed-fixture | existing CSV importer clean re-import pass                                                  |
| .cache/arrow/bin/python tools/verify_malecns_subset.py data/raw/malecns-bounded-v1                   | historical Arrow ranges and 159 / 128 / 105268 source totals independently verified offline |
| npm run profile                                                                                      | bounded synthetic CPU profile pass                                                          |
| npm run profile:heavy                                                                                | heavy synthetic CPU profile pass                                                            |
| npx tsx tools/profile-circuit.ts                                                                     | real selected topology CPU profile pass                                                     |
| npm run build                                                                                        | production build pass, 7.42 seconds                                                         |
| npm run test:browser                                                                                 | **5/5 system Chromium workflows**, 59.4 seconds                                             |
| PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright PLAYWRIGHT_CHROMIUM=managed npm run test:browser       | **5/5 managed Chromium workflows**, 58.5 seconds                                            |
| git diff --check; git status --short                                                                 | no whitespace defects; clean at gate start/end                                              |

The browser workflows cover dataset isolation, regions, ranked routes, selected body details, provenance, all 12 smoke conditions, circuit export and replay, 390px overflow, plus all prior raycast/terrarium/training/replay/macro workflows. Circuit console logs report **zero errors, zero warnings, zero external requests** at both widths. Existing browser-console.json also retains the terrarium trace. The build emits the known >500 kB chunk warning: main JS 1,344.66 kB minified / 355.42 kB gzip; circuit worker 203.86 kB. This is a bundle-size limitation, not a browser console error.

## Measured data

Source licence inspected before retained acquisition. Six bounded official API responses total **171,534 bytes**. The four compilation inputs total 163,938 bytes. No full-table download was performed in Phase 3. Exact queries, original bytes, checksums and row counts are committed under data/circuits/gf-v1/evidence. Edge response SHA-256: e124b394319863eee242cbf2bed58d2b9d022edc288397426ff337fa40ca1d39.

51 annotated bodies, 1,240 unique directed pairs, 28,373 measured raw contacts. Six glutamatergic exclusions; 417,398 outgoing contacts cut, external incoming boundary not quantified. See [scientific authority and limitations](PHASE3.md). Annotation consensus is not physiological sign validation.

## Scientific outcomes

Default DNp70 pulse: Biological, Adaptive and all five controls each produce **20 total / 10 GF spikes**. Control target changes: 533, 553, 502, 520, 561. Their mean neural traces are identical. No recurrence, population permutation and unit-contact weights each yield 10 / 0; all-excitatory 20 / 10; stimulated-population silence 0 / 0. **No topology advantage.** Scalar readout 1 → 1.006273385501229, recurrent CSR fingerprint **5bfbe263 → 5bfbe263**. Raw count arrays and per-node control distributions are independently tested.

The earlier synthetic benchmark is unchanged: full fixture MSE 0.382233 versus control 0.383745, no recurrence 0.371280 for both. It remains synthetic and does not support a biological claim.

## Performance, observational not a fidelity claim

Host: Node 22.23.1, Intel Xeon E5-2680 v4 @ 2.40 GHz.

- Real 51-body / 1,240-pair topology, 100,000 CPU LIF ticks with continuous invented DNp70 current: **197.18 ms, 507,141 ticks/s**, 100,000 spikes. CSR 10,281 bytes plus 9,920 raw-count bytes. Excludes UI, worker transfer and compiler.
- Bounded synthetic 10,000 / 160,000: **3,363.55 instrumented ticks/s**.
- Heavy synthetic 166,700 / 5,334,400: **61.36 instrumented ticks/s**, 46,342,604 typed-array bytes, 7,622,837 spikes and 242,680,480 traversed edges over 200 ticks. This is not full MaleCNS execution.

## Visual evidence and review boundary

Retention contract: keep the polished terrarium, procedural fly, onboarding, stimulus tools and existing responsive scientific palette. Add a separate restrained anatomical instrument rather than reskinning the toy body as a real fly simulation. Desktop and mobile workflow checks passed with no horizontal overflow.

Committed compact captures, derived from the fresh clean-browser run:

- [1440px region instrument](assets/circuit-regions.webp)
- [390px neuron detail](assets/circuit-mobile.webp)
- [Desktop provenance](assets/circuit-provenance.webp)

Full fresh PNGs: artifacts/phase3/circuit-{regions,routes,neuron,provenance,smoke}-{1440,390}.png. Fresh terrarium views remain artifacts/desktop-initial.png, desktop-verified.png, mobile.png and artifacts/visual/. Experiment exports: artifacts/phase3/circuit-run.json and browser-circuit-{1440,390}.json. Console evidence: artifacts/phase3/console-{1440,390}.json.

Direct model image inspection was blocked by the local-media path allowlist. The read tool returned image metadata without a visible rendering. No out-of-repository copy or policy bypass was used. Therefore **visual taste/acceptance remains a main-seat review gate**, despite fresh screenshots and passing browser behavior.

## Remaining limits

Cell paper full text returned 403, so no supplementary or experimentally validated behavior was invented. Receptor signs, electrical coupling, physiological constants, real sensory mappings, body mechanics and rewards remain unresolved or absent. The topology is induced within a deliberately cut set, not physiologically complete. Five matched smoke controls are limited-mixing engineering controls, not statistical evidence of topology benefit. Source hashes establish retained-byte integrity, not external authenticity by themselves. Circuit replay is a separate bounded API and export workflow; arbitrary circuit upload is intentionally not exposed.
