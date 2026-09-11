# Phase 2 visual/product pass

**Implemented and locally verified, pending direct art-direction review.** Clean implementation: `760e18e954984ed7bdf2e93d227db1a1b1fccde2`, on `feat/phase-2-rigor`. No push or merge. The subsequent report/hero commit changes documentation and the presentation asset only.

## Delivered

An original segmented Drosophila-inspired avatar replaces the token-like model: faceted red eyes, head/thorax/abdomen, veined wings, halteres, aristae, bristles and six articulated legs. Gait uses body distance/speed; restrained cosmetic motion uses simulation tick and freezes when paused. Geometry and scale are identical across comparison modes. No biomechanics or measured morphology claim.

The arena adds instanced soil granules, procedural material depth, macro framing and bounded shadows. On-demand rendering avoids continuously redrawing a paused experiment. Light bearing, odour field, looming age, touch duration and obstacle radii follow the existing model policies. Visible descriptions distinguish global toy threat currents, schematic source markers and static-field illustration from physical sensory simulation.

Onboarding is now an actionable stimulate → trace → compare path. Each mode explains its actual training/wiring boundary. The neural-flow instrument groups the selected graph’s signed edges and lights routes only for sampled source spikes. A fingerprint mismatch hides the routes. Compact screens use readable six-population tiles rather than microscopic graph text. This is display sampling, not every spike or inferred axonal travel.

[Full-scale architecture](FULL_SCALE_DESIGN.md) specifies offline MaleCNS compilation, exact counts and provenance, aggregated-edge runtime, scalable backends, bounded activity streams and multiscale/on-demand morphology views. It explicitly keeps the 48-neuron fixture as scaffolding and explains when pair aggregation is valid. Those future components are not claimed as implemented.

## Completed verification

Fresh `npm ci` installed 179 packages in 4 seconds. Format, strict types, **39 Vitest tests**, **6 Python tests**, Ruff and production build passed. Both Chromium paths ran all **3 browser workflows**: system 51.1 seconds, managed 47.8 seconds, all passed without retries or skipped tests.

New tests verify signed-edge accounting and sampled activity, exact touch/loom display lifetimes against evaluated model inputs, the odour distance envelope, finite/mirrored/distance-driven leg poses, guided startup, selected graph identity, non-fabricated spiking capture, pixel-identical paused canvas snapshots, macro framing, compact population tiles, no camera/tool overlap and no page overflow. Existing exact replay, import and tamper-rejection workflows still pass.

The desktop recordings contain 1,986 system-browser ticks and 1,366 managed-browser ticks, each with clean implementation provenance. Interactive timings differ; each run verifies its own event schedule. Desktop and visual-audit logs record no console errors/warnings or external requests.

**Scientific code, importer tooling and dependencies are unchanged from the previous Phase 2 checkpoint.** The complete 20-seed study was evaluated twice again. Its scientific-result SHA-256 remains `71ecfe1fca0f74bb8c7998b89813bba69c4b97f521cfb2ff3585ced7718144fd`. No topology-advantage claim was introduced.

## Rendering evidence and limits

The clean macro capture reported **182 draw calls** and **20,256 triangles** in managed Chromium (20,322 in the separately positioned system run). CI guards the observed single-view budget below 600 calls / 250,000 triangles. These are renderer counters, not an active three-specimen throughput benchmark.

An earlier continuous-rendering development pass showed slow headless software rendering. The final implementation uses demand rendering and a 1024² shadow map. A 45-interval paused-page rAF sample measured median/p95 **16.7/16.7 ms** in managed Chromium, **16.7/16.8 ms** with system Chromium. **This is idle page cadence, not rendered FPS or a physical-GPU speedup claim.** Active device performance and visual shadow quality still need direct testing.

Production build: 612 modules, 7.13 seconds, main JS 1,133.28 kB minified / 318.58 kB gzip; worker 14.31 kB. The existing Vite bundle warning remains unmodified. No post-processing stack or new dependency was added.

## Review artifacts

Relative to `/root/projects/neuroterrarium`:

- `docs/assets/terrarium.webp`: committed lossless macro hero candidate, captured from an actual paused spiking run.
- `artifacts/visual/hero.png`, `desktop.png`, `compact.png`: fresh managed-browser evidence.
- `artifacts/visual/system-browser/`: separately preserved system-browser macro, desktop, compact, original workflow screenshots, recording and logs.
- `artifacts/provenance.png`, `desktop-verified.png`, `mobile.png`, `deterministic-run.json`, `browser-console.json`, `browser-results.json`: latest managed-browser workflow.
- `artifacts/visual/browser-audit.json`, `final-verification.log`, `SHA256SUMS`: bounded rendering measurements, completed gate trace and artifact identities.

## Remaining visual acceptance gate

The image tool rejected `artifacts/visual/hero.png` because the repository lies outside its allowed media directories. The file reader returned image metadata, not viewable pixels. No files were staged outside the authorized repository, and no direct visual inspection is claimed. Hosted CI also remains unrun because these commits were not pushed.

**Next visual pass:** main-seat review on an authorized image surface should inspect the macro fly’s proportions/wing and leg silhouette, shadow contact, arena/tool composition, signed-flow legibility and 390 px population tiles. Correct observed problems before calling the presentation portfolio-ready; test active motion on a real GPU before claiming smooth performance. The committed hero is a review candidate, not an assertion that this art-direction gate passed.
