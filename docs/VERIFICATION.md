# Milestone 1 verification record

Date: 2026-09-11, Australia/Brisbane.

## Status

**Milestone 1 passed implementation, automated, browser, and direct visual review gates.**

The main-seat review staged temporary private copies of the retained screenshots into an authorised image surface, directly inspected the desktop, provenance, and compact layouts, then removed the staged copies. The terrarium rendered correctly, the visual hierarchy and contrast were coherent, scientific caveats were conspicuous, the provenance modal was legible, and the 390 px layout remained usable without obvious clipping or overflow.

## Verified implementation revision

- 22f490bbccf315301f8c52d635f9b421ce495e10: deterministic sparse fixture, controls, readout calibration, import boundary and scientific docs.
- c8c8d22b63ed7b44ebd06a3830b206be9aa064cc: procedural R3F terrarium, scientific instrument UI, README and browser workflow.
- 3bbfb87332cc586349e8981dbafe664b12e6dbd7: replay integrity, long-stream PRNG and removal of a misleading static scale bar.

The clean implementation revision **3bbfb87332cc586349e8981dbafe664b12e6dbd7** is embedded in the retained production-run manifest with **dirty: false**. This verification document is a subsequent documentation-only commit. The production bundle and recorded experiment intentionally retain the exact code revision tested rather than being relabelled after the fact.

## Fresh verification

Environment: Node v22.23.1, npm 10.9.8, Chromium 150.0.7871.114 on Debian 13, headless ANGLE/SwiftShader.

Executed sequentially from a clean Git tree:

```sh
npm ci --cache .cache/npm --no-audit --no-fund
npm run typecheck
npm test
npm run format:check
npm run build
npm run test:browser
```

| Gate                                             | Observed result                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| Fresh locked install                             | 175 packages installed in 4 seconds; exit 0                        |
| Strict TypeScript, including unused symbols      | Pass; exit 0                                                       |
| Unit tests                                       | 18 passed across 2 files; 745 ms total runner duration             |
| Formatting                                       | All matched files passed                                           |
| Production build                                 | Pass; 608 modules; 6.87 seconds                                    |
| Critical desktop browser workflow                | Pass, 30.583 seconds, 1440 × 1100 viewport                         |
| Compact viewport and keyboard stimulus placement | Pass, 3.103 seconds, 390 × 844 viewport, no page overflow          |
| Browser aggregate                                | 2 passed, 0 skipped, 0 flaky, 0 unexpected; 35.925 seconds         |
| Browser console                                  | 0 errors, 0 warnings                                               |
| External runtime requests                        | 0; network disabled after initial load                             |
| Deterministic recording                          | 1,106 ticks, 11.06 simulated seconds, seed 42                      |
| Replay and imported replay                       | All recorded neural/body outputs, final state and training matched |
| Tampered output import                           | Rejected; current run retained                                     |
| Direct visual inspection                         | Pass: desktop, provenance modal, and 390 px compact captures       |

The browser pass exercises actual soil raycasting, all five sensory tools, pause, single-step, speed, population silence, readout training, independent mode selection, overlay, provenance, JSON download, replay, reset, JSON import, tamper rejection and seed validation. The unit suite additionally checks exact matched-graph statistics across four seeds, LIF threshold/reset/refractory/silence, silent baseline, complete stimulus-to-movement propagation, Control separation, temporal pulse expiry, obstacle rejection, readout-only learning, deterministic replay with same-tick events, manifest validation and adapter aggregation/ID validation.

One non-fatal build warning remains: the main R3F/Three bundle is 1,121.57 kB minified (314.69 kB gzip), above Vite’s default 500 kB chunk warning. No warning threshold was hidden or raised. Worker bundle: 14.31 kB. No full-scale inference or browser performance benchmark is claimed.

## Calibration evidence, seed 42

- Held-out MSE before: 0.6400000000000002
- Held-out MSE after: 0.0022296099592345486
- Matched Control, separately trained diagnostic: 0.006098583148732997
- Zero-feature ablation: 0.64
- Held-out sign accuracy: 1.0 (12/12)
- Recurrent fingerprint before/after: cd40346d / cd40346d
- Tests also compared the actual recurrent weights before and after training.

This is supervised light-direction calibration using 49 declared readout parameters. Both topologies improve. It is not a navigation-learning result, biological-fidelity score or proof of a connectome topology advantage.

## Retained ignored evidence

All paths are relative to /root/projects/neuroterrarium:

- artifacts/desktop-initial.png
- artifacts/desktop-verified.png
- artifacts/provenance.png
- artifacts/mobile.png
- artifacts/deterministic-run.json
- artifacts/browser-console.json
- artifacts/browser-results.json
- artifacts/verification.log
- artifacts/SHA256SUMS

SHA-256 of desktop-verified.png: 6cb1a6a11884dc2994f1be8427ee96ed0ebdbe2f63dc5910da7c13edaf0ae461.

SHA-256 of deterministic-run.json: 280dc76b2377120ed1ca4a9a9d704dc94090c4f7ad5671849b5589d51bcc1abc.

No remote was created. No dataset was downloaded. No deployment or external message was sent. Temporary loopback preview/dev servers were stopped, and ports 4173/4174 had no listeners at final inspection.

## Next scientific gate

Use the bounded [MaleCNS subset ingestion gate](INGESTION.md): verify licence/attribution and release schema, checksum a small authorised subset, resolve signs explicitly, independently validate CSR totals and reference circuit outputs, and benchmark that subset with replay and matched controls before scaling.
