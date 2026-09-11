# Attribution and references

All application, fixture, simulation and procedural fly code in this repository was authored for NeuroTerrarium. No code was copied from the reference repositories below. No external meshes, textures, fonts or audio are included. Phase 3 bundles a small CC-BY MaleCNS circuit and its original bounded API responses under data/circuits/gf-v1, separately licensed from the MIT application code. Dependency licences are retained by npm packages in node_modules; see package-lock.json for exact resolved versions.

## Scientific sources (context, not bundled data)

- **MaleCNS v1.0:** https://male-cns.janelia.org/ . Brain plus ventral nerve cord, reported 166,700 neurons and approximately 125 million synapses. Downloads: https://male-cns.janelia.org/download/ . Release/licence: https://male-cns.janelia.org/release/ . Data licensed **CC-BY 4.0**. Phase 2 verified a separately stored, ignored local subset. Attribution: FlyEM (HHMI Janelia), University of Cambridge Department of Zoology, MRC Laboratory of Molecular Biology, and Google Research, Male CNS connectome collaboration. MaleCNS v1.0, released June 8, 2026. Changes: selected 128 pairs, normalized CSV columns, inferred ACh/GABA signs, and derived demo-only signed weights; exact raw counts are retained. See [ingestion evidence and source checksums](INGESTION.md). Phase 3 now bundles and independently executes a different, coherent 51-body GF input microcircuit with 1,240 pairs and 28,373 raw contacts. Changes: selection, normalization, inferred consensus signs and demo-only model gain. Original source responses and SHA-256 are retained. See [Phase 3 attribution and scientific boundary](PHASE3.md).
- **FlyWire / Codex, FAFB v783:** https://codex.flywire.ai/ . Whole-brain wiring paper: https://doi.org/10.1038/s41586-024-07558-y . No FlyWire data are used.
- **Shiu et al., whole-brain LIF modelling:** https://doi.org/10.1038/s41586-024-07763-9 . Reference implementation: https://github.com/philshiu/Drosophila_brain_model (MIT, as identified in the project brief). Motivates future validation, not the fixture's constants. No code copied.
- **Multi-backend fly-brain reference:** https://github.com/eonsystemspbc/fly-brain (GPL reference identified in the project brief). No code copied or linked into this MIT implementation.
- **Embodied fly reference:** https://doi.org/10.1038/s41592-024-02497-y . Scientific context for future biomechanical embodiment, not a dependency or a description of the toy body.

Source links originated in the project brief. MaleCNS release, licence, official object schemas and bounded source rows were verified for Phase 2 as recorded in INGESTION.md. Other references remain context, not newly validated integrations. External reference links open only on explicit user action; they are not runtime dependencies.

## Software

React and React DOM (MIT), Three.js (MIT), React Three Fiber (MIT), Drei (MIT), Vite (MIT), TypeScript (Apache-2.0), Vitest (MIT), Playwright (Apache-2.0). System and Playwright-managed Chromium are used for browser verification. Import/profile tooling also uses csv-parse (MIT), tsx (MIT), PyArrow (Apache-2.0), and Ruff (MIT). No reference-project licence is treated as permission to omit attribution when future code or data are imported.
