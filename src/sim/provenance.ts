export type EvidenceClass = "measured" | "published" | "inferred" | "demo-only";
export interface Provenance {
  id: string;
  label: string;
  class: EvidenceClass;
  detail: string;
  citation?: string;
}
export const PROVENANCE: Provenance[] = [
  {
    id: "fixture",
    label: "Anatomy & transmitter signs",
    class: "demo-only",
    detail:
      "nt-mini v1: 48 invented neurons, 192 signed edges, six named demo populations. 36 excitatory and 12 inhibitory neurons. Not MaleCNS, FlyWire or measured anatomy.",
  },
  {
    id: "lif",
    label: "Spiking dynamics",
    class: "demo-only",
    detail:
      "Discrete current-based leaky integrate-and-fire, 10 ms ticks. Dimensionless currents and threshold. Parameters are chosen for this fixture, not fitted to Drosophila.",
  },
  {
    id: "lif-reference",
    label: "Published LIF reference",
    class: "published",
    detail:
      "Shiu et al. motivate a future validated model adapter. No reference code or fitted constants were copied. Their reported 91% concerns selected circuit predictions, not behavioural fidelity.",
    citation: "https://doi.org/10.1038/s41586-024-07763-9",
  },
  {
    id: "light",
    label: "Light sensor",
    class: "demo-only",
    detail:
      "Distance-attenuated left/right current from source bearing relative to Biological reference body. Input is yoked across all three modes.",
  },
  {
    id: "loom",
    label: "Loom sensor",
    class: "demo-only",
    detail:
      "A 100-tick expanding visual threat injects threat and bilateral visual current. No optic-flow model.",
  },
  {
    id: "odor",
    label: "Odour / food sensor",
    class: "demo-only",
    detail:
      "Radial distance field injects olfactory and directional visual current as an explicit toy orienting shortcut; no plume physics.",
  },
  {
    id: "touch",
    label: "Touch sensor",
    class: "demo-only",
    detail:
      "A 20-tick global threat-current pulse, not a mechanosensory contact model.",
  },
  {
    id: "obstacle",
    label: "Obstacle sensor & collision",
    class: "demo-only",
    detail:
      "One circular barrier with proximity threat current and collision rejection. Terrain plants are decorative.",
  },
  {
    id: "motor",
    label: "Motor & embodiment",
    class: "demo-only",
    detail:
      "Premotor spike traces map to forward velocity and differential yaw. Adaptive adds a declared linear readout from 48 neural traces plus bias. All modes have identical kinematics; no biomechanics.",
  },
  {
    id: "learning",
    label: "Adaptive readout",
    class: "demo-only",
    detail:
      "49 regularized linear parameters only. 24 balanced calibration episodes and 12 held-out episodes. Decode light side, not fitness or navigation. Recurrent weights are never trained.",
  },
  {
    id: "control",
    label: "Matched Control",
    class: "demo-only",
    detail:
      "Seeded directed edge swaps preserve per-neuron in/out degree, signed degree and weight multisets. Independent LIF state and body; not a claim of uniform sampling of all matched graphs.",
  },
  {
    id: "dataset-target",
    label: "Future MaleCNS adapter",
    class: "published",
    detail:
      "MaleCNS v1.0 reports 166,700 neurons and approximately 125 million synapses. CC-BY 4.0 attribution is required on ingestion. No MaleCNS data are bundled or running.",
    citation: "https://male-cns.janelia.org/release/",
  },
];
