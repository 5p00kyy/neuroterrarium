# Attribution and references

All application, fixture, simulation and procedural fly code in this repository was authored for NeuroTerrarium. No code was copied from the reference repositories below. No external meshes, textures, fonts, audio or connectome datasets are included. Dependency licences are retained by npm packages in node_modules; see package-lock.json for exact resolved versions.

## Scientific sources (context, not bundled data)

- **MaleCNS v1.0:** https://male-cns.janelia.org/ . Brain plus ventral nerve cord, reported 166,700 neurons and approximately 125 million synapses. Downloads: https://male-cns.janelia.org/download/ . Release/licence: https://male-cns.janelia.org/release/ . Data licensed **CC-BY 4.0**. Any later ingestion must retain full dataset-author attribution, release/version, source URL, licence link and change notice. No MaleCNS data are used in this milestone.
- **FlyWire / Codex, FAFB v783:** https://codex.flywire.ai/ . Whole-brain wiring paper: https://doi.org/10.1038/s41586-024-07558-y . No FlyWire data are used.
- **Shiu et al., whole-brain LIF modelling:** https://doi.org/10.1038/s41586-024-07763-9 . Reference implementation: https://github.com/philshiu/Drosophila_brain_model (MIT, as identified in the project brief). Motivates future validation, not the fixture's constants. No code copied.
- **Multi-backend fly-brain reference:** https://github.com/eonsystemspbc/fly-brain (GPL reference identified in the project brief). No code copied or linked into this MIT implementation.
- **Embodied fly reference:** https://doi.org/10.1038/s41592-024-02497-y . Scientific context for future biomechanical embodiment, not a dependency or a description of the toy body.

These source links came from the project brief. Release schemas, current upstream licences and exact attribution strings must be re-verified before downloading or adapting any source. External reference links open only on explicit user action; they are not runtime dependencies.

## Software

React and React DOM (MIT), Three.js (MIT), React Three Fiber (MIT), Drei (MIT), Vite (MIT), TypeScript (Apache-2.0), Vitest (MIT), Playwright (Apache-2.0). System Chromium is used for browser verification. No reference-project licence is treated as permission to omit attribution when future code or data are imported.
