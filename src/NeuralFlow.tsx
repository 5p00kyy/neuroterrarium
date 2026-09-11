import { useMemo } from "react";
import { fixture, shuffle, POPULATIONS, fingerprint } from "./sim/network";
import { aggregateFlow } from "./visualSignals";
import type { Frame, Mode } from "./sim/experiment";
const anchors = [
  [28, 48],
  [28, 101],
  [28, 154],
  [28, 207],
  [492, 86],
  [492, 178],
];
export function NeuralFlow({
  frame,
  mode,
  seed,
}: {
  frame: Frame;
  mode: Mode;
  seed: number;
}) {
  const graph = useMemo(
    () => (mode === "Control" ? shuffle(fixture(), seed) : fixture()),
    [mode, seed],
  );
  const selected = frame.specimens.find((s) => s.mode === mode)!;
  const valid = fingerprint(graph) === selected.graph;
  const routes = useMemo(
    () => aggregateFlow(graph, selected.spikes),
    [graph, selected.spikes],
  );
  const sampled = selected.spikes.reduce((n, s) => n + s, 0);
  return (
    <section className="neural-flow" aria-label="Sampled neural flow">
      <div className="flow-heading">
        <div>
          <span className="eyebrow">02 / CIRCUIT PROJECTION</span>
          <h2>Sensory drive becomes motor output.</h2>
        </div>
        <span className="flow-count" data-testid="flow-count">
          {sampled} / 48 sampled spikes
        </span>
      </div>
      <svg
        viewBox="0 0 660 290"
        role="img"
        aria-label={
          mode +
          " synthetic graph, grouped signed edges and current sampled spikes"
        }
        data-testid="neural-flow"
        data-graph={valid ? selected.graph : "mismatch"}
      >
        <text x="28" y="22" className="flow-column">
          SENSORY POPULATIONS
        </text>
        <text x="267" y="22" className="flow-column">
          RECURRENT ROUTES
        </text>
        <text x="492" y="22" className="flow-column">
          MOTOR POPULATIONS
        </text>
        {valid &&
          routes.map((r) => {
            const [ax, ay] = anchors[r.from],
              [bx, by] = anchors[r.to],
              x1 = ax + 126,
              y1 = ay + 16,
              x2 = bx,
              y2 = by + 16;
            const self = r.from === r.to;
            const d = self
              ? "M" +
                (ax + 105) +
                " " +
                ay +
                " C" +
                (ax + 100) +
                " " +
                (ay - 28) +
                " " +
                (ax + 25) +
                " " +
                (ay - 28) +
                " " +
                (ax + 20) +
                " " +
                ay
              : "M" +
                x1 +
                " " +
                y1 +
                " C" +
                (x1 + 80) +
                " " +
                y1 +
                " " +
                (x2 - 80) +
                " " +
                y2 +
                " " +
                x2 +
                " " +
                y2;
            const active = r.sampledActiveEdges > 0;
            return (
              <path
                key={[r.from, r.to, r.sign].join(":")}
                d={d}
                fill="none"
                stroke={r.sign > 0 ? "#a9c981" : "#d0a179"}
                strokeWidth={
                  active
                    ? 1.5 + (r.sampledActiveEdges / r.edges) * 2
                    : 0.65 + Math.sqrt(r.edges) * 0.2
                }
                opacity={active ? 0.82 : 0.17}
                strokeDasharray={r.sign < 0 ? "3 4" : undefined}
                data-active={active}
              >
                <title>
                  {POPULATIONS[r.from] +
                    " → " +
                    POPULATIONS[r.to] +
                    ": " +
                    r.edges +
                    " " +
                    (r.sign > 0 ? "positive" : "negative") +
                    " edges; " +
                    r.sampledActiveEdges +
                    " with a sampled source spike"}
                </title>
              </path>
            );
          })}
        {anchors.map(([x, y], p) => (
          <g key={p} transform={"translate(" + x + "," + y + ")"}>
            <rect
              width="126"
              height="37"
              rx="5"
              fill="#17221c"
              stroke="#526047"
            />
            <text x="9" y="14" className="flow-node-label">
              {POPULATIONS[p]}
            </text>
            {Array.from({ length: 8 }, (_, k) => (
              <circle
                key={k}
                cx={12 + k * 14}
                cy="27"
                r={selected.spikes[p * 8 + k] ? 3.8 : 2.5}
                fill={selected.spikes[p * 8 + k] ? "#e0edaf" : "#435040"}
                stroke={k > 5 ? "#d0a179" : "none"}
              >
                <title>
                  {"Cell " +
                    (p * 8 + k) +
                    ": " +
                    (selected.spikes[p * 8 + k] ? "spike" : "silent")}
                </title>
              </circle>
            ))}
          </g>
        ))}
        <text x="310" y="271" textAnchor="middle" className="flow-column">
          {valid
            ? "192 signed edges · topology projection, not anatomical positions"
            : "Topology mismatch: routes hidden"}
        </text>
      </svg>
      <div className="flow-compact" aria-label="Compact population activity">
        {POPULATIONS.map((name, p) => {
          const spikes = selected.spikes
            .slice(p * 8, p * 8 + 8)
            .reduce((n, s) => n + s, 0);
          return (
            <div key={name}>
              <span>{name}</span>
              <strong>{spikes}/8</strong>
              <div className="population-dots">
                {selected.spikes.slice(p * 8, p * 8 + 8).map((s, i) => (
                  <i key={i} className={s ? "firing" : ""} />
                ))}
              </div>
            </div>
          );
        })}
        <p>
          Six-population overview. Detailed signed routes appear on wider
          screens.
        </p>
      </div>
      <div className="flow-foot">
        <span>
          <i /> Excitatory <i className="inhibitory" /> Inhibitory
        </span>
        <span>
          20 Hz snapshots, not every spike. Bright routes = sampled source
          spikes.
        </span>
      </div>
    </section>
  );
}
