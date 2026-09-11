import { useEffect, useMemo, useRef, useState } from "react";
import raw from "../data/circuits/gf-v1/circuit.json";
import { loadCircuit } from "./sim/circuit";
import {
  summarizeCircuit,
  neuronNeighborhood,
  VIEW_BUDGET,
} from "./sim/circuitView";
import type { SmokeManifest } from "./sim/circuitExperiment";
const c = loadCircuit(raw).manifest,
  summary = summarizeCircuit(c),
  types = [...new Set(c.neurons.map((n) => n.type))].sort();
export function CircuitLab() {
  const [scale, setScale] = useState("Regions"),
    [selected, setSelected] = useState("10001"),
    [population, setPopulation] = useState("DNp70"),
    [region, setRegion] = useState("All"),
    [run, setRun] = useState<SmokeManifest | null>(null),
    [message, setMessage] = useState(
      "Measured graph validated. Dynamics remain demo-only.",
    ),
    [busy, setBusy] = useState(false);
  const worker = useRef<Worker | null>(null);
  useEffect(() => {
    const w = new Worker(new URL("./sim/circuitWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = (e) => {
      setBusy(false);
      if (e.data.error) setMessage(e.data.error);
      else {
        setRun(e.data.run);
        setMessage(
          e.data.replay
            ? "Circuit replay verified."
            : "120 ticks complete. No behavior or topology advantage established.",
        );
      }
    };
    w.onerror = (e) => {
      setBusy(false);
      setMessage(e.message);
    };
    return () => w.terminate();
  }, []);
  const neuron = c.neurons.find((n) => n.id === selected)!,
    neighborhood = useMemo(() => neuronNeighborhood(c, selected), [selected]);
  const nodes = c.neurons
    .filter((n) => region === "All" || n.regions.includes(region))
    .slice(0, VIEW_BUDGET.nodes);
  const positions = new Map(
    nodes.map((n, i) => [
      n.id,
      {
        x: 300 + Math.cos((i / nodes.length) * Math.PI * 2) * 230,
        y: 220 + Math.sin((i / nodes.length) * Math.PI * 2) * 170,
      },
    ]),
  );
  function exportRun() {
    if (!run) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(run, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "gf-circuit-smoke.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="circuit-lab" aria-label="Measured circuit instrument">
      <div className="circuit-heading">
        <div>
          <div className="eyebrow">MALECNS v1.0 / ANATOMICAL MICROCIRCUIT</div>
          <h1>Trace the giant-fiber neighborhood.</h1>
          <p>
            From regions to routes to individual bodies. Measured wiring,
            explicit assumptions.
          </p>
        </div>
        <span className="measured-chip">
          MEASURED TOPOLOGY
          <br />
          <strong>51 bodies · 1,240 pairs</strong>
        </span>
      </div>
      <div className="circuit-contract">
        <strong>Simulation-ready topology ≠ validated physiology.</strong>{" "}
        28,373 measured contacts. Consensus transmitter signs are inferred. LIF
        constants, gain, delay and imposed currents are demo-only. No body or
        reward mapping.
      </div>
      <div className="circuit-toolbar">
        <div className="scale-buttons" aria-label="Anatomical scale">
          {["Regions", "Population routes", "Neuron detail", "Provenance"].map(
            (s) => (
              <button
                key={s}
                aria-pressed={scale === s}
                onClick={() => setScale(s)}
              >
                {s}
              </button>
            ),
          )}
        </div>
        <label>
          Region filter
          <select
            aria-label="Circuit region"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setScale("Neuron detail");
            }}
          >
            {["All", "CentralBrain", "VNC", "CV"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>
      {scale === "Regions" && (
        <div className="region-overview">
          <div className="region-diagram">
            <svg
              viewBox="0 0 540 320"
              role="img"
              aria-label="Schematic brain and ventral nerve cord, not measured morphology"
            >
              <path d="M266 115 C130 25 25 90 80 175 C130 230 225 185 270 156 C315 185 410 230 460 175 C515 90 410 25 274 115" />
              <path d="M264 159 L245 235 Q230 280 270 292 Q310 280 295 235 L277 159" />
              <text x="270" y="85">
                BRAIN
              </text>
              <text x="270" y="258">
                VNC
              </text>
              <circle cx="253" cy="136" r="7" />
              <circle cx="287" cy="136" r="7" />
              <path
                className="descending-route"
                d="M253 136 Q230 170 258 244 M287 136 Q310 170 282 244"
              />
            </svg>
            <small>
              Schematic layout, not measured morphology. Region membership can
              overlap.
            </small>
          </div>
          <div className="region-cards">
            {summary.regions.map((r) => (
              <button
                key={r.name}
                onClick={() => {
                  setRegion(r.name);
                  setScale("Neuron detail");
                }}
              >
                <span>
                  {r.name === "CentralBrain"
                    ? "Central brain"
                    : r.name === "CV"
                      ? "Cervical connective"
                      : r.name}
                </span>
                <strong>
                  {r.neurons}
                  <small> selected bodies</small>
                </strong>
                <span>
                  {r.posts.toLocaleString()} annotated postsynaptic sites, whole
                  bodies
                </span>
              </button>
            ))}
            <p>
              Counts describe only this selected slice. Regional sites are not
              internal circuit contacts. The full CNS is never instantiated.
            </p>
          </div>
        </div>
      )}
      {scale === "Population routes" && (
        <div className="route-view">
          <div>
            <h2>Directed cell-type routes</h2>
            <p>
              Top {Math.min(summary.routes.length, VIEW_BUDGET.routes)} of{" "}
              {summary.routes.length} routes, ranked by raw contacts. Click a
              route to inspect its source population.
            </p>
          </div>
          <div className="route-list">
            {summary.routes.slice(0, VIEW_BUDGET.routes).map((r) => (
              <button
                key={r.pre + ":" + r.post}
                onClick={() => {
                  setPopulation(r.pre);
                  setSelected(c.neurons.find((n) => n.type === r.pre)!.id);
                  setScale("Neuron detail");
                }}
              >
                <span>
                  {r.pre} <i>→</i> {r.post}
                </span>
                <span
                  className="route-bar"
                  style={{
                    width:
                      Math.max(
                        2,
                        (Number(r.contacts) * 100) /
                          Number(summary.routes[0].contacts),
                      ) + "%",
                  }}
                />
                <strong>
                  {String(r.contacts)} <small>contacts / {r.pairs} pairs</small>
                </strong>
              </button>
            ))}
          </div>
        </div>
      )}
      {scale === "Neuron detail" && (
        <div className="neuron-view">
          <div>
            <div className="neuron-map">
              <svg
                viewBox="0 0 600 440"
                role="img"
                aria-label="Selected neuron's directed neighborhood, schematic coordinates"
              >
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="4"
                    markerHeight="4"
                    orient="auto-start-reverse"
                  >
                    <path d="M0 0L10 5L0 10z" fill="#c0d99b" />
                  </marker>
                </defs>
                {neighborhood.edges.map((e) => {
                  const a = positions.get(e.pre),
                    b = positions.get(e.post);
                  return a && b ? (
                    <line
                      key={e.pre + ":" + e.post}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={
                        c.neurons.find((n) => n.id === e.pre)!.nt === "gaba"
                          ? "#c197b0"
                          : "#c0d99b"
                      }
                      strokeOpacity={0.3}
                      strokeWidth={Math.min(3, 1 + Number(e.contacts) / 150)}
                      markerEnd="url(#arrow)"
                    />
                  ) : null;
                })}
                {nodes.map((n) => {
                  const p = positions.get(n.id)!;
                  return (
                    <g
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      aria-label={"Inspect " + n.instance + " body " + n.id}
                      onClick={() => setSelected(n.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(n.id);
                        }
                      }}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={n.id === selected ? 9 : 5}
                        fill={n.nt === "gaba" ? "#c197b0" : "#c0d99b"}
                      />
                      {n.id === selected && (
                        <text x={300} y={220} textAnchor="middle">
                          {n.instance}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
            <small>
              Schematic ring. {nodes.length} / {c.neurons.length} bodies
              visible. Up to 120 incident edges; {neighborhood.omitted} omitted
              by render cap. Arrow = pre → post.
            </small>
          </div>
          <article className="neuron-inspector">
            <label>
              Selected body
              <select
                aria-label="Selected circuit neuron"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {c.neurons.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.instance} / {n.id}
                  </option>
                ))}
              </select>
            </label>
            <h2>{neuron.instance}</h2>
            <dl>
              <dt>Body ID</dt>
              <dd>{neuron.id} (string)</dd>
              <dt>Annotation</dt>
              <dd>{neuron.superclass}</dd>
              <dt>Consensus transmitter</dt>
              <dd>{neuron.nt}</dd>
              <dt>Predicted NT confidence</dt>
              <dd>
                {(neuron.confidence * 100).toFixed(1)}%, not sign confidence
              </dd>
              <dt>Model sign</dt>
              <dd>{neuron.nt === "gaba" ? "−1" : "+1"} · inferred policy</dd>
            </dl>
            <h3>Strongest incident contacts</h3>
            <ul>
              {neighborhood.edges.slice(0, 8).map((e) => (
                <li key={e.pre + ":" + e.post}>
                  {e.pre} → {e.post}
                  <b>{e.contacts}</b>
                </li>
              ))}
            </ul>
          </article>
        </div>
      )}
      {scale === "Provenance" && (
        <article className="circuit-provenance">
          <h2>A bounded circuit, not a complete escape pathway.</h2>
          <p>{c.selection}</p>
          <dl>
            <dt>Measured</dt>
            <dd>
              Directed topology and raw contact counts, original IDs and source
              annotations.
            </dd>
            <dt>Published</dt>
            <dd>
              MaleCNS v1.0 release and CC-BY licence. No published physiological
              constants instantiated.
            </dd>
            <dt>Inferred</dt>
            <dd>
              Consensus ACh → +1, GABA → −1. Receptors and electrical synapses
              unresolved. No confidence threshold is implied by consensus.
            </dd>
            <dt>Demo-only</dt>
            <dd>
              Dimensionless LIF, 10 ms nominal ticks, one-tick recurrence, gain
              0.002, population pulse and scalar readout.
            </dd>
            <dt>Omissions</dt>
            <dd>
              {c.contract.excludedIds.length} glutamatergic bodies excluded.{" "}
              {Number(c.contract.omittedOutgoingContacts).toLocaleString()}{" "}
              outgoing contacts cut; external incoming contacts not quantified.
              External current = zero.
            </dd>
          </dl>
          <p>{c.attribution}</p>
          <p>
            CC-BY-4.0 · compiler {c.compiler} · source checksums and exact
            queries included in experiment export and repository.
          </p>
          <code>{c.sourceChecksums.edges}</code>
        </article>
      )}
      <section className="circuit-experiment">
        <div>
          <div className="eyebrow">EXPERIMENT 002 / DYNAMICS SMOKE TEST</div>
          <h2>Pulse. Perturb. Compare.</h2>
          <p>
            A 20-tick imposed current, 120 ticks total. Five independently
            shuffled controls and five mandatory ablations. No behavioral score.
          </p>
        </div>
        <div className="circuit-actions">
          <label>
            Imposed-current population
            <select
              aria-label="Circuit stimulus population"
              value={population}
              onChange={(e) => setPopulation(e.target.value)}
            >
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              worker.current?.postMessage({ type: "run", population });
            }}
          >
            Run circuit smoke
          </button>
          <button
            disabled={!run || busy}
            onClick={() => {
              setBusy(true);
              worker.current?.postMessage({ type: "replay", manifest: run });
            }}
          >
            Verify circuit replay
          </button>
          <button disabled={!run} onClick={exportRun}>
            Export circuit run
          </button>
        </div>
        <p className="circuit-status" aria-live="polite">
          {message}
        </p>
        {run && (
          <>
            <div className="smoke-results">
              <table>
                <thead>
                  <tr>
                    <th>Independent condition</th>
                    <th>Spikes</th>
                    <th>GF spikes</th>
                    <th>Rewired targets</th>
                  </tr>
                </thead>
                <tbody>
                  {run.rows.map((r) => (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td>{r.spikes}</td>
                      <td>{r.anchorSpikes}</td>
                      <td>{r.changedTargets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <svg
                viewBox="0 0 480 180"
                role="img"
                aria-label="Mean neural trace across 120 ticks, measured topology with demo dynamics"
              >
                {run.rows.slice(0, 7).map((r, i) => (
                  <polyline
                    key={r.name}
                    points={r.trace
                      .map((v, t) => t * 4 + "," + (170 - Math.min(1, v) * 150))
                      .join(" ")}
                    fill="none"
                    stroke={
                      i === 0 ? "#c0d99b" : i === 1 ? "#e8c79b" : "#8ca7c4"
                    }
                    strokeOpacity={i < 2 ? 1 : 0.5}
                  />
                ))}
                <text x="10" y="18">
                  Mean trace [0,1] · 120 nominal ticks
                </text>
              </svg>
            </div>
            <p>
              Recurrent fingerprint {run.recurrentBefore} → {run.recurrentAfter}
              . Adaptive changes one scalar readout only. Matched swaps preserve
              per-neuron signed degrees and weight multisets, not uniform
              mixing. Different graphs can produce identical responses.
            </p>
          </>
        )}
      </section>
    </section>
  );
}
