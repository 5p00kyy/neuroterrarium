# Phase 3: an attributable giant-fiber input microcircuit

## Result and authority chain

**51 real MaleCNS bodies, 1,240 directed pairs, 28,373 raw contacts.** This is a GF-centered input microcircuit, not a complete escape circuit, sensory-to-motor pathway, digital twin or full CNS. The synthetic 48-neuron terrarium remains separate and is still the default.

On 2026-09-11 the official [download page](https://male-cns.janelia.org/download/) and [release/licence page](https://male-cns.janelia.org/release/) were inspected before retaining data. They identify MaleCNS v1.0, released June 8, 2026, CC-BY 4.0, and the official neuPrint dataset male-cns:v1.0. Although the guidance describes account-based access, **bounded anonymous custom queries actually succeeded**. No credentials were supplied, requested or stored. The Cell full-text URL linked by Janelia returned HTTP 403; no supplementary evidence or behavioral validation is claimed from it.

Official neuPrint annotations identify body IDs **10001** and **10010** as DNp01(GF)\_R and DNp01(GF)\_L, descending neurons, with hemibrainType Giant Fiber. Selection is based on these annotations and observed directed connectivity, not file order or a guessed correspondence to a different fly.

Selection rule, fixed before induced-edge retrieval:

1. Anchor both DNp01 bodies.
2. Query every direct incoming pair with at least 100 contacts to either anchor, using LIMIT 257 as an overflow sentinel. Returned 63 rows, below the cap.
3. Retain every upstream body whose source consensusNt is acetylcholine or gaba, plus both anchors. Exclude six glutamatergic bodies explicitly, rather than guessing their effect.
4. Retrieve every directed connection among the resulting 51 bodies with **no internal weight threshold**, LIMIT 16385. Returned 1,240 rows and unique pairs, no duplicates in this release response.
5. Retrieve matching annotations and a per-body outgoing-to-Segment census. Endpoint closure and independent counts must pass before CSR execution.

The 100-contact selection threshold is a bounded analytical choice, not a published functional boundary. Some selected inputs are descending or ascending neurons themselves, not sensory receptors. This is an interpretable anatomical neighborhood suitable for tracing input routes to a named descending pair; it does not justify artificial light-to-escape behavior.

## Source bytes and reproducibility

Small original response bytes, exact requests, SHA-256 evidence, selection and compiled circuit are committed under data/circuits/gf-v1. They retain CC-BY attribution. No Feather table, full dataset, source implementation or morphology is bundled. Each query response is capped at 2 MiB. The largest retained response is the selected-neuron regional annotation table. Raw JSON responses must not be reformatted because checksums bind their exact bytes.

The anonymous discovery query using a broad OR predicate timed out after 45 seconds. Separate indexed body-ID queries succeeded. The metadata dataset-list request was stopped by a 50 KB cap and is not evidence of complete metadata. A first manually quoted query had a syntax error and supplied no data. Neither failure was treated as proof of an authentication barrier.

Offline reproduction:

The default compiler output records current commit and dirty state. Verification compares all scientific content while retaining the stored build identity:

```sh
npm run circuit:verify
npm run circuit:compile -- .cache/gf-clean-reimport.json
npm run circuit:smoke
.cache/arrow/bin/python -m unittest discover -s tests/python -v
```

Network acquisition is explicitly opt-in. Run tools/query_malecns.py with --allow-network, a retained request.json and a **new** output directory. Existing evidence is never overwritten. tools/select_gf.py deterministically reconstructs the selected IDs and induced/annotation/boundary queries from the retained incoming census. No authentication plumbing exists. If anonymous access changes, stop and use an owner-produced bounded export from a protected environment; never put credentials in chat or repository files.

Compiler checks include original SHA-256, exact schemas, release, query predicates, overflow sentinels, unique selected IDs, matching annotations, closed endpoints, explicit sign policy, raw uint64 counts, duplicate aggregation, raw totals, outgoing-boundary census and allocation caps. The browser loader checks the compiled contract and reconstructs CSR; it does not cryptographically authenticate arbitrary user-authored claims against Janelia. The application uses only the bundled compiler-verified artifact, not arbitrary circuit uploads.

## Provenance and completeness

| Component                             | Classification     | Contract                                                                          |
| ------------------------------------- | ------------------ | --------------------------------------------------------------------------------- |
| Topology and raw contacts             | Measured           | Directed anatomical contact counts, original string body IDs                      |
| Cell type, region, transmitter fields | Source annotations | Predicted/consensus fields retained, not physiological measurements               |
| Release, licence                      | Published          | Janelia MaleCNS v1.0, CC-BY 4.0                                                   |
| Effective sign                        | Inferred           | consensus ACh +1, GABA -1; glutamate excluded                                     |
| Dynamics, threshold, gain, delays     | Demo-only          | Original dimensionless demo-lif-1, nominal 10 ms, one-tick recurrence, gain 0.002 |
| Sensory current                       | Demo-only          | 0.65 imposed current to a chosen cell-type population for 20 ticks                |
| Adaptive readout                      | Demo-only          | One scalar gain, fitted during first 40 ticks; no behavioral learning claim       |
| Body, mechanics, reward               | Not used           | Real circuit cannot drive the terrarium body                                      |
| Render coordinates                    | Schematic          | No measured morphology implied                                                    |

**417,398 outgoing contacts cross the selected boundary and are omitted.** External incoming contacts are not quantified. All external current is explicitly zero. Induced completeness means every returned internal pair for this retained set, not physiological closure or complete upstream/downstream anatomy. The six exclusions are 10074, 531985, 532569, 17144, 555227, 527704. Their direct-to-GF edges are excluded with them.

The consensus sign policy is new and distinct from Phase 2's high-confidence prediction policy. It does **not** silently lower that importer's 0.8 threshold. GF body-level prediction confidences are about 0.5005 and 0.5571. Consensus is used explicitly, without portraying these values as sign confidence. Receptors, cotransmission, electrical coupling and physiological effects remain unresolved. Those limitations are especially important for giant fibers. No published LIF constants or validated GF response are claimed.

## Instrument and experimental result

The dataset selector isolates the measured circuit instrument from the retained terrarium. Regions show source membership and whole-body regional postsynaptic sites, not internal circuit edges. Population routes aggregate exact raw contacts. Neuron detail shows source IDs, transmitter confidence and a capped directed neighborhood. Layout is schematic throughout. Caps: 64 rendered nodes, 120 incident edges, 32 ranked routes, 256 compiled neurons and 16,384 input rows. Neither mode instantiates the whole CNS.

The 120-tick DNp70 pulse smoke test compares independently executed Biological and Adaptive graphs, five matched shuffles, no recurrence, population permutation, all-excitatory sign ablation, unit-contact weights and stimulated-population silence. The adaptive scalar readout cannot modify any recurrent CSR array. Exact per-node in/out signed-degree and weight multisets are tested for controls. Swaps are not a uniform sampler and preserve strong unique-weight connections; mixing is limited.

**Negative result:** Biological and all five shuffled controls each emit 20 total spikes, including 10 GF spikes, with identical mean-trace responses despite 502 to 561 changed target slots. No recurrence, population permutation and unit-contact weights yield 10 total spikes and zero GF spikes. All-excitatory yields 20/10; silencing the stimulated population yields zero. This establishes execution and perturbation semantics only. It provides **no topology advantage** and no behavior. Adaptive gain changes from 1 to 1.006273385501229 while recurrent fingerprint stays 5bfbe263. No held-out adaptation advantage is claimed.

Exact deterministic summary: data/circuits/gf-v1/smoke-golden.json. Runtime export includes source queries/checksums, circuit, model, protocol, seed, code identity, each independently computed condition, output traces and recurrent fingerprints. A separate circuit replay verifies all exported fields. The existing miniature replay contract is unchanged.

## Remaining science and review gates

- Source annotations establish circuit identity, not functional or behavioral validation. Cell supplements were not accessible in this environment.
- Consensus transmitter interpretation, cut inputs, omitted electrical coupling and invented dynamics prevent physiological claims.
- Controls leave some strong connections unchanged; no uniform-mixing or topology inference follows from five smoke controls.
- Full-region morphology, real sensory transforms, physiology, body mechanics and reward mappings remain absent.
- The circuit worker is bounded and independent; exports are bounded smoke recordings, not full-scale streaming.
- Fresh screenshots and workflow checks are evidence, not owner visual acceptance. Direct model image viewing was blocked by the media-path tool allowlist; no out-of-repository copy was made to bypass it.

Verification commands/results and fresh evidence paths are recorded in PHASE3_VERIFICATION.md.
