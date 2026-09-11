# Contributing

Use a focused branch and a pull request. There is no automated deployment or package publication. The project remains an experimental framework, not a biological fidelity result.

## Local gate

Use Node 22.23.1 and the committed npm lockfile. Run `npm ci --cache .cache/npm --no-audit --no-fund`, then `npm run format:check`, `npm run typecheck`, `npm test`, `npm run benchmark`, `npm run profile`, `npm run build`, and `npm run test:browser`. `npm run profile:heavy` is opt-in and is not the CI workload.

Browser tests use system Chromium when available. Set `CHROMIUM_PATH` explicitly for another local installation. To mirror CI without touching system packages: set `PLAYWRIGHT_BROWSERS_PATH=$PWD/.cache/ms-playwright`, run `npx --no-install playwright install chromium`, then run tests with `PLAYWRIGHT_CHROMIUM=managed` and the same browser-path setting. CI alone installs its disposable runner libraries using `--with-deps`.

## Scientific changes

- Separate measured edges, inferred signs, published references and invented sensor/motor choices. Never relabel fixtures.
- Never tune a protocol using reported test results. Change its version for a new hypothesis; retain train/validation/test separation and report negative controls.
- New backends must preserve tick/event semantics or declare and test numerical tolerances. Include controls, ablations, replay and recurrent-weight checks.
- Real-data import changes require source URLs, exact licence/attribution, checksums, independent totals, sign policy and a reviewable bounded sample. No large raw datasets or credentials in Git.
- Keep application runtime offline. Official-data retrieval is a separate explicit opt-in tool and never runs in CI.
- Update scientific documentation, focused tests and screenshots when the change warrants it. Automated screenshots do not replace direct visual review.

Artifacts, local caches, raw and processed upstream data are ignored. Commit only original synthetic schema fixtures and small reviewed presentation assets. The CI workflow retains test evidence, not raw anatomy.
