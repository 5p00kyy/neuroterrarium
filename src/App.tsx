import { useEffect, useRef, useState } from "react";
import { CircuitLab } from "./CircuitLab";
import "./circuit.css";
import { Scene, COLORS } from "./Scene";
import { NeuralFlow } from "./NeuralFlow";
import {
  Experiment,
  MODES,
  type Frame,
  type Mode,
  type Tool,
  type Action,
} from "./sim/experiment";
import { POPULATIONS } from "./sim/network";
import { PROVENANCE } from "./sim/provenance";
import type { Request, Response } from "./sim/protocol";
const TOOLS: { id: Tool; label: string; icon: string; hint: string }[] = [
  {
    id: "light",
    label: "Light",
    icon: "☼",
    hint: "A directional visual current",
  },
  {
    id: "loom",
    label: "Loom",
    icon: "◉",
    hint: "An expanding threat, 1 second",
  },
  { id: "odor", label: "Odour", icon: "♧", hint: "A food-distance field" },
  { id: "touch", label: "Touch", icon: "↯", hint: "A 200 ms threat pulse" },
  { id: "obstacle", label: "Obstacle", icon: "⬡", hint: "A collision barrier" },
];
const INITIAL = new Experiment(42).frame();
function Plot({
  values,
  color = "#b9d891",
  max = 1,
}: {
  values: number[];
  color?: string;
  max?: number;
}) {
  const points = values
    .map((n, i) =>
      [
        (i * 300) / Math.max(1, values.length - 1),
        56 - Math.min(1, Math.max(0, n / max)) * 50,
      ].join(","),
    )
    .join(" ");
  return (
    <svg
      className="plot"
      viewBox="0 0 300 60"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0 6H300 M0 31H300 M0 56H300" stroke="#ffffff0e" fill="none" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
function Raster({ frames, mode }: { frames: Frame[]; mode: Mode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 600, 100);
    ctx.fillStyle = COLORS[mode];
    const index = MODES.indexOf(mode);
    frames.forEach((f, x) =>
      f.specimens[index].spikes.forEach((s, y) => {
        if (s) ctx.fillRect((x * 600) / 160, y * 2, 2, 1.4);
      }),
    );
  }, [frames, mode]);
  return (
    <canvas
      ref={ref}
      width={600}
      height={100}
      className="raster"
      aria-label="Spike raster: 48 neurons, sampled at display snapshots"
      role="img"
    />
  );
}
export function App() {
  const worker = useRef<Worker | null>(null),
    file = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const [dataset, setDataset] = useState("mini");
  const [frame, setFrame] = useState(INITIAL),
    [history, setHistory] = useState<Frame[]>([]),
    [mode, setMode] = useState<Mode>("Biological"),
    [tool, setTool] = useState<Tool>("light"),
    [running, setRunning] = useState(false),
    [speed, setSpeed] = useState(1),
    [seed, setSeed] = useState("42"),
    [activeSeed, setActiveSeed] = useState(42),
    [compare, setCompare] = useState(false),
    [notice, setNotice] = useState(
      "Ready. Place a stimulus in the arena, then run.",
    ),
    [error, setError] = useState(false),
    [ready, setReady] = useState(false),
    [inspector, setInspector] = useState("fixture"),
    [trainingBusy, setTrainingBusy] = useState(false),
    [closeView, setCloseView] = useState(false);
  const send = (m: Request) => worker.current?.postMessage(m);
  useEffect(() => {
    const w = new Worker(new URL("./sim/worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = (event: MessageEvent<Response>) => {
      const m = event.data;
      if (m.type === "frame") {
        setFrame(m.frame);
        setRunning(m.running);
        setActiveSeed(m.seed);
        setReady(true);
        setTrainingBusy(false);
        setHistory((h) =>
          m.frame.tick === 0
            ? []
            : h.length && m.frame.tick < h[h.length - 1].tick
              ? [m.frame]
              : h.length && m.frame.tick === h[h.length - 1].tick
                ? [...h.slice(0, -1), m.frame]
                : [...h, m.frame].slice(-160),
        );
      }
      if (m.type === "notice" || m.type === "error") {
        setNotice(m.text);
        setError(m.type === "error");
        setTrainingBusy(false);
      }
      if (m.type === "export") {
        const blob = new Blob([JSON.stringify(m.manifest, null, 2)], {
            type: "application/json",
          }),
          url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download =
          "neuroterrarium-seed-" +
          m.manifest.seed +
          "-tick-" +
          m.manifest.ticks +
          ".json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        setNotice(
          "Experiment JSON exported locally. No data left this browser.",
        );
        setError(false);
      }
    };
    w.onerror = (e) => {
      setNotice("Simulation worker failed: " + e.message);
      setError(true);
      setReady(false);
    };
    return () => {
      w.terminate();
      worker.current = null;
    };
  }, []);
  const selected = frame.specimens[MODES.indexOf(mode)],
    color = COLORS[mode],
    training = frame.training;
  function action(a: Action) {
    send({ type: "action", action: a });
    setError(false);
  }
  function inspect(id: string) {
    setInspector(id);
    dialog.current?.showModal();
  }
  function place(x: number, z: number) {
    action({ type: "stimulus", tool, x, z });
    setNotice(
      TOOLS.find((t) => t.id === tool)!.label +
        " placed. " +
        (running
          ? "Observing shared sensory drive."
          : "Press Run or Single step to observe the response."),
    );
  }
  async function importRun(f: File | undefined) {
    if (!f) return;
    try {
      if (f.size > 80_000_000)
        throw new Error("File exceeds 80 MB import limit");
      const data: unknown = JSON.parse(await f.text());
      setHistory([]);
      send({ type: "replay", manifest: data });
      setNotice("Verifying imported event log…");
      setError(false);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
      setError(true);
    }
    if (file.current) file.current.value = "";
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="NeuroTerrarium home">
          <span className="brand-mark">✳</span>
          <span>
            Neuro<span className="brand-light">Terrarium</span>
            <small>EMBODIED CONNECTOME LABORATORY</small>
          </span>
        </a>
        <div className="top-meta">
          <span className="local-dot" /> LOCAL / OFFLINE READY
          <span className="divider" />
          <span>RESEARCH PREVIEW</span>
        </div>
        <button
          className="quiet"
          hidden={dataset !== "mini"}
          onClick={() => inspect("fixture")}
        >
          Provenance <span>↗</span>
        </button>
        <button
          className="export"
          hidden={dataset !== "mini"}
          disabled={!ready}
          onClick={() => send({ type: "export" })}
        >
          Export experiment ↓
        </button>
      </header>
      <main>
        <div className="dataset-selector">
          <label>
            Dataset / circuit
            <select
              aria-label="Dataset / circuit"
              value={dataset}
              onChange={(e) => {
                send({ type: "run", running: false, speed });
                setDataset(e.target.value);
              }}
            >
              <option value="mini">nt-mini · synthetic terrarium</option>
              <option value="gf">MaleCNS v1.0 · GF input microcircuit</option>
            </select>
          </label>
          <span>
            {dataset === "mini"
              ? "Embodied demo · no measured anatomy"
              : "Measured anatomy · isolated dynamics instrument · no body mapping"}
          </span>
        </div>
        {dataset === "gf" && <CircuitLab />}
        <div hidden={dataset !== "mini"}>
          <section className="intro">
            <div>
              <div className="eyebrow">
                EXPERIMENT 001 / SENSORIMOTOR SANDBOX
              </div>
              <h1>From stimulus to movement.</h1>
              <p>
                A fly-inspired body. An inspectable circuit. Every claim in
                view.
              </p>
            </div>
            <button
              className="fixture-badge"
              onClick={() => inspect("fixture")}
            >
              <span className="tiny-grid">⠿</span>
              <span>
                SYNTHETIC MINIATURE FIXTURE
                <strong>
                  48 neurons <i>·</i> 192 edges
                </strong>
                <small>Not MaleCNS. No measured anatomy.</small>
              </span>
              <span>ⓘ</span>
            </button>
          </section>
          <section
            className="first-experiment"
            aria-label="Start your first experiment"
          >
            <div>
              <b>01</b>
              <span>
                <strong>Stimulate</strong>Place light, then run.
              </span>
            </div>
            <div>
              <b>02</b>
              <span>
                <strong>Trace</strong>Watch spikes become motion.
              </span>
            </div>
            <div>
              <b>03</b>
              <span>
                <strong>Compare</strong>Fixed / trained / shuffled.
              </span>
            </div>
            <button
              disabled={!ready}
              onClick={() => {
                setTool("light");
                action({ type: "stimulus", tool: "light", x: 2, z: 1 });
                send({ type: "run", running: true, speed: 1 });
                setSpeed(1);
                setNotice(
                  "Light placed. Follow the circuit projection below the arena; compare modes without resetting.",
                );
              }}
            >
              Start with light ↗
            </button>
          </section>
          <div className="lab-layout">
            <section className="instrument" aria-label="Terrarium instrument">
              <div className="modebar">
                <div
                  className="tabs"
                  role="tablist"
                  aria-label="Specimen mode"
                  onKeyDown={(event) => {
                    let next = MODES.indexOf(mode);
                    if (event.key === "ArrowRight")
                      next = (next + 1) % MODES.length;
                    else if (event.key === "ArrowLeft")
                      next = (next + MODES.length - 1) % MODES.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = MODES.length - 1;
                    else return;
                    event.preventDefault();
                    setMode(MODES[next]);
                    event.currentTarget
                      .querySelector<HTMLButtonElement>(
                        '[data-mode="' + MODES[next] + '"]',
                      )
                      ?.focus();
                  }}
                >
                  {MODES.map((m, i) => (
                    <button
                      key={m}
                      role="tab"
                      id={"tab-" + m}
                      data-mode={m}
                      tabIndex={mode === m ? 0 : -1}
                      aria-controls="specimen-panel"
                      aria-selected={mode === m}
                      className={mode === m ? "active" : ""}
                      style={
                        { "--mode-color": COLORS[m] } as React.CSSProperties
                      }
                      onClick={() => setMode(m)}
                    >
                      <span className="mode-dot" />
                      {m}
                      <small>0{i + 1}</small>
                    </button>
                  ))}
                </div>
                <label className="compare-toggle">
                  <input
                    type="checkbox"
                    checked={compare}
                    onChange={(e) => setCompare(e.target.checked)}
                  />{" "}
                  Overlay all
                </label>
              </div>
              <div
                className="stage"
                id="specimen-panel"
                role="tabpanel"
                aria-labelledby={"tab-" + mode}
              >
                <Scene
                  frame={frame}
                  mode={mode}
                  compare={compare}
                  close={closeView}
                  tool={tool}
                  onPlace={place}
                />
                <div className="camera-controls" aria-label="Camera framing">
                  <button
                    aria-pressed={!closeView}
                    onClick={() => setCloseView(false)}
                  >
                    Arena
                  </button>
                  <button
                    aria-pressed={closeView}
                    onClick={() => setCloseView(true)}
                  >
                    Inspect fly
                  </button>
                </div>
                <div className="stage-top">
                  <span>
                    <span
                      className={running ? "status-dot live" : "status-dot"}
                    />
                    {running ? "SIMULATION RUNNING" : "SIMULATION PAUSED"}
                  </span>
                  <span>
                    {closeView
                      ? "SPECIMEN / MACRO VIEW"
                      : "ARENA A / TOP-OBLIQUE"}
                  </span>
                </div>
                <div className="toolbox" aria-label="Sensory tools">
                  {TOOLS.map((t) => (
                    <button
                      key={t.id}
                      title={t.hint}
                      aria-label={t.label}
                      aria-pressed={tool === t.id}
                      className={tool === t.id ? "selected" : ""}
                      onClick={() => setTool(t.id)}
                    >
                      <span>{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                  <button
                    className="preset"
                    title="Place selected stimulus at arena coordinates +2, +1"
                    onClick={() => place(2, 1)}
                  >
                    Place preset ↗
                  </button>
                </div>
                <div className="stage-caption">
                  <span className="specimen-label" style={{ color }}>
                    {mode.toUpperCase()}{" "}
                    <small>
                      {mode === "Biological"
                        ? "FIXED DEMO TOPOLOGY"
                        : mode === "Adaptive"
                          ? "FIXED RESERVOIR + READOUT"
                          : "MATCHED EDGE SHUFFLE"}
                    </small>
                  </span>
                  <span className="scale-bar">Arena Ø 10 u · demo units</span>
                </div>
                <div className="stage-help">
                  Click soil to place{" "}
                  {TOOLS.find((t) => t.id === tool)?.label.toLowerCase()}{" "}
                  <span>·</span> Drag to orbit <span>·</span> Scroll to zoom
                </div>
              </div>
              <div className="transport">
                <button
                  className="run-button"
                  disabled={!ready}
                  onClick={() =>
                    send({ type: "run", running: !running, speed })
                  }
                >
                  {running ? "Ⅱ Pause" : "▶ Run"}
                </button>
                <button
                  title="Advance exactly 10 ms"
                  disabled={!ready}
                  onClick={() => send({ type: "step" })}
                >
                  Single step
                </button>
                <label className="speed">
                  Speed
                  <select
                    aria-label="Simulation speed"
                    value={speed}
                    onChange={(e) => {
                      setSpeed(+e.target.value);
                      send({ type: "run", running, speed: +e.target.value });
                    }}
                  >
                    {[0.25, 1, 2, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}×
                      </option>
                    ))}
                  </select>
                </label>
                <span className="time" data-testid="tick">
                  {(frame.tick / 100).toFixed(2)}
                  <small>s / {frame.tick} ticks</small>
                </span>
                <button
                  className="quiet"
                  onClick={() => {
                    send({ type: "reset", seed: activeSeed });
                    setNotice(
                      "Reset to seed " +
                        activeSeed +
                        ". No stimulus, no spontaneous motion.",
                    );
                  }}
                >
                  ↺ Reset
                </button>
              </div>
              <div
                className="stimulus-contract"
                data-testid="stimulus-contract"
              >
                <strong>{TOOLS.find((t) => t.id === tool)?.label} /</strong>{" "}
                {tool === "light"
                  ? "Dashed bearing to the reference body; distance and left/right angle drive current. Cone is a source marker, not ray-traced sensing."
                  : tool === "odor"
                    ? "Contours sample the model's distance envelope. Moving motes illustrate the static field, not simulated diffusion."
                    : tool === "loom"
                      ? "Global rising threat current for 1 s. Sphere size follows stimulus age; placement does not change its drive."
                      : tool === "touch"
                        ? "Global 200 ms threat pulse. The ring marks the event, not a localized contact simulation."
                        : "Solid radius 0.72 u blocks body centers. Outer ring is the 1.4 u reference-body threat threshold."}
              </div>
              <div className="comparison-note">
                <strong>{mode}</strong>
                <span>
                  {mode === "Biological"
                    ? "Fixed synthetic wiring. No training."
                    : mode === "Adaptive"
                      ? "Same recurrent wiring. Only 49 readout coefficients can change."
                      : "A seeded degree-, sign- and weight-matched edge shuffle."}{" "}
                  All three receive the Biological body's sensory stream.
                </span>
              </div>
              <NeuralFlow frame={frame} mode={mode} seed={activeSeed} />
              <div className="signals">
                <section>
                  <h3>
                    SPIKE RASTER <span>48 cells</span>
                  </h3>
                  <Raster frames={history} mode={mode} />
                  <div className="axis">
                    <span>20 Hz display snapshots</span>
                    <span>now</span>
                  </div>
                </section>
                <section>
                  <h3>
                    MOTOR DRIVE <span>L / R</span>
                  </h3>
                  <div className="motor-plots">
                    <Plot
                      values={history.map(
                        (f) => f.specimens[MODES.indexOf(mode)].motor[0],
                      )}
                      max={0.4}
                      color={color}
                    />
                    <Plot
                      values={history.map(
                        (f) => f.specimens[MODES.indexOf(mode)].motor[1],
                      )}
                      max={0.4}
                      color="#d3bb86"
                    />
                  </div>
                  <div className="axis">
                    <span>0 → 0.4 trace</span>
                    <span>Left / right</span>
                  </div>
                </section>
                <section>
                  <h3>
                    FOOD PROXIMITY <span>toy reward</span>
                  </h3>
                  <Plot
                    values={history.map(
                      (f) => f.specimens[MODES.indexOf(mode)].reward,
                    )}
                    color="#d3bb86"
                  />
                  <div className="axis">
                    <span>0 → 1</span>
                    <span>{selected.reward.toFixed(3)}</span>
                  </div>
                </section>
              </div>
            </section>
            <aside className="sidebar">
              <section className="readout">
                <div className="panel-heading">
                  <h2>Live readout</h2>
                  <span style={{ color }}>● {mode}</span>
                </div>
                <div className="metrics">
                  <div>
                    <strong data-testid="spike-count">
                      {selected.totalSpikes.toLocaleString()}
                    </strong>
                    <small>cumulative spikes</small>
                  </div>
                  <div>
                    <strong data-testid="distance">
                      {selected.distance.toFixed(2)}
                      <em>u</em>
                    </strong>
                    <small>distance travelled</small>
                  </div>
                  <div>
                    <strong>
                      {selected.speed.toFixed(2)}
                      <em>u/s</em>
                    </strong>
                    <small>forward velocity</small>
                  </div>
                  <div>
                    <strong>
                      {selected.turn.toFixed(2)}
                      <em>rad/s</em>
                    </strong>
                    <small>yaw command</small>
                  </div>
                </div>
              </section>
              <section>
                <div className="panel-heading">
                  <h2>Neural populations</h2>
                  <button
                    className="info"
                    aria-label="Inspect neural dynamics"
                    onClick={() => inspect("lif")}
                  >
                    ⓘ
                  </button>
                </div>
                <div className="regions">
                  {POPULATIONS.map((p, i) => (
                    <div className="region" key={p}>
                      <span>{p}</span>
                      <div>
                        <b
                          style={{
                            width:
                              Math.min(100, selected.regions[i] * 300) + "%",
                            background: color,
                          }}
                        />
                      </div>
                      <small>{(selected.regions[i] * 100).toFixed(1)}</small>
                    </div>
                  ))}
                </div>
                <p className="micro">
                  Mean spike trace (%) · 8 demo cells / population
                </p>
              </section>
              <section>
                <div className="panel-heading">
                  <h2>Perturb circuit</h2>
                  <span className="tag">ALL MODES</span>
                </div>
                <select
                  className="full"
                  aria-label="Perturbation population"
                  value={frame.perturb.population}
                  onChange={(e) =>
                    action({
                      type: "perturb",
                      value: { ...frame.perturb, population: +e.target.value },
                    })
                  }
                >
                  {POPULATIONS.map((p, i) => (
                    <option key={p} value={i}>
                      {p}
                    </option>
                  ))}
                </select>
                <div className="segmented">
                  {(["none", "stimulate", "silence"] as const).map((kind) => (
                    <button
                      key={kind}
                      aria-pressed={frame.perturb.kind === kind}
                      className={frame.perturb.kind === kind ? "chosen" : ""}
                      onClick={() =>
                        action({
                          type: "perturb",
                          value: { ...frame.perturb, kind },
                        })
                      }
                    >
                      {kind === "none"
                        ? "Unperturbed"
                        : kind === "stimulate"
                          ? "Stimulate"
                          : "Silence"}
                    </button>
                  ))}
                </div>
                <p className="micro">
                  {frame.perturb.kind === "none"
                    ? "Recurrent edges are fixed in every mode."
                    : frame.perturb.kind === "silence"
                      ? "Selected cells clamped to zero voltage and activity."
                      : "Adds 0.9 demo current to the selected cells."}
                </p>
              </section>
              <section className="learning">
                <div className="panel-heading">
                  <h2>Illustrative calibration</h2>
                  <button
                    className="info"
                    aria-label="Inspect learning"
                    onClick={() => inspect("learning")}
                  >
                    ⓘ
                  </button>
                </div>
                <p>Single-run illustration: decode light direction.</p>
                <p className="micro">
                  Primary evidence: the 20-seed delayed-cue study in the README.
                  Neither result establishes biological fidelity.
                </p>
                <button
                  className="train-button"
                  disabled={!!training || trainingBusy || !ready}
                  onClick={() => {
                    setTrainingBusy(true);
                    action({ type: "train" });
                    setMode("Adaptive");
                    setNotice(
                      "Training 49 readout parameters on 24 deterministic episodes…",
                    );
                  }}
                >
                  {training
                    ? "✓ Readout calibrated"
                    : trainingBusy
                      ? "Calibrating…"
                      : "Train readout"}{" "}
                  <span>{training ? "49 weights" : "24 episodes →"}</span>
                </button>
                {training ? (
                  <div
                    className="training-results"
                    data-testid="training-results"
                  >
                    <div className="learning-score">
                      <span>Held-out MSE</span>
                      <strong>
                        {training.beforeMSE.toFixed(3)} →{" "}
                        {training.afterMSE.toFixed(3)}
                      </strong>
                    </div>
                    <Plot
                      values={training.curve}
                      max={0.65}
                      color={COLORS.Adaptive}
                    />
                    <div className="micro">
                      12 held-out episodes ·{" "}
                      {(training.accuracy * 100).toFixed(0)}% sign accuracy
                      <br />
                      Matched trained Control: {training.controlMSE.toFixed(
                        3,
                      )}{" "}
                      MSE
                      <br />
                      Zero-feature ablation: {training.ablatedMSE.toFixed(
                        3,
                      )}{" "}
                      MSE
                      <br />
                      <strong>Recurrent edge changes: 0</strong>
                    </div>
                  </div>
                ) : (
                  <p className="micro">
                    Readout only. Separate train/test episodes.
                    <br />
                    Supervised toy task, not learned navigation.
                  </p>
                )}
              </section>
            </aside>
          </div>
          <section className="experiment-strip">
            <div className="strip-title">
              <h2>Experiment ledger</h2>
              <span>
                DETERMINISTIC / LOCAL-FIRST · ACTIVE SEED {activeSeed}
              </span>
            </div>
            <div className="seed-control">
              <label htmlFor="seed">Seed</label>
              <input
                id="seed"
                inputMode="numeric"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
              <button
                onClick={() => {
                  const n = Number(seed);
                  if (
                    seed.trim() === "" ||
                    !Number.isInteger(n) ||
                    n < 0 ||
                    n > 4294967295
                  ) {
                    setNotice(
                      "Seed must be an integer between 0 and 4294967295.",
                    );
                    setError(true);
                    return;
                  }
                  send({ type: "reset", seed: n });
                  setNotice("New deterministic run, seed " + n + ".");
                  setError(false);
                }}
              >
                New run
              </button>
            </div>
            <button
              onClick={() => {
                setHistory([]);
                send({ type: "replay" });
                setNotice("Verifying replay…");
              }}
            >
              ↻ Verify replay
            </button>
            <button onClick={() => file.current?.click()}>Import JSON</button>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              className="file-input"
              onChange={(e) => void importRun(e.target.files?.[0])}
            />
            <button
              className="quiet"
              onClick={() => {
                action({ type: "clear" });
                setNotice(
                  "All stimuli cleared. Circuit activity may decay over subsequent ticks.",
                );
              }}
            >
              Clear stimuli
            </button>
          </section>
          <div className={"notice " + (error ? "error" : "")} role="status">
            {error ? "!" : "○"} {notice}
          </div>
          <section className="comparison">
            <div>
              <div className="eyebrow">MATCHED EXPERIMENT</div>
              <h2>Three networks. One sensory stream.</h2>
              <p>
                Inputs are yoked to the Biological reference body. Each mode has
                independent neural state and identical body rules.
              </p>
              <button className="text-link" onClick={() => inspect("control")}>
                What does this comparison establish? ↗
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Specimen</th>
                  <th>Graph fingerprint</th>
                  <th>Spikes</th>
                  <th>Path / u</th>
                  <th>Plasticity</th>
                </tr>
              </thead>
              <tbody>
                {frame.specimens.map((s) => (
                  <tr key={s.mode} onClick={() => setMode(s.mode)}>
                    <th style={{ color: COLORS[s.mode] }}>{s.mode}</th>
                    <td className="mono">{s.graph}</td>
                    <td>{s.totalSpikes}</td>
                    <td>{s.distance.toFixed(3)}</td>
                    <td>{s.mode === "Adaptive" ? "Readout only" : "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div className="sensor-inspector">
            <span>INSPECT A MAPPING</span>
            {TOOLS.map((t) => (
              <button key={t.id} onClick={() => inspect(t.id)}>
                {t.label} ⓘ
              </button>
            ))}
            <button onClick={() => inspect("motor")}>Motor / body ⓘ</button>
          </div>
        </div>
      </main>
      <footer>
        <span>
          NeuroTerrarium <i>/</i> An open, inspectable laboratory.
        </span>
        <span>
          nt-mini v1 · demo-lif-1 · {__CODE_COMMIT__.slice(0, 7)}
          {__CODE_DIRTY__ ? " (dirty build)" : ""}
        </span>
        <span>No telemetry. No remote runtime assets.</span>
      </footer>
      <dialog
        ref={dialog}
        className="provenance-dialog"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="dialog-heading">
          <div className="eyebrow">PROVENANCE INSPECTOR</div>
          <button
            aria-label="Close provenance"
            onClick={() => dialog.current?.close()}
          >
            ✕
          </button>
        </div>
        <h2>Know what you’re looking at.</h2>
        <p className="dialog-intro">
          Measured anatomy, published research and invented interface choices
          must never look interchangeable.
        </p>
        <div className="evidence-legend">
          <span>Measured: 0</span>
          <span>Published: references only</span>
          <span>Inferred: 0</span>
          <span>Demo-only: running model</span>
        </div>
        <div className="provenance-body">
          <nav aria-label="Provenance topics">
            {PROVENANCE.map((p) => (
              <button
                key={p.id}
                className={p.id === inspector ? "chosen" : ""}
                onClick={() => setInspector(p.id)}
              >
                {p.label}
              </button>
            ))}
          </nav>
          <article>
            {PROVENANCE.filter((p) => p.id === inspector).map((p) => (
              <div key={p.id}>
                <span className={"evidence " + p.class}>{p.class}</span>
                <h3>{p.label}</h3>
                <p>{p.detail}</p>
                {p.citation && (
                  <a href={p.citation} target="_blank" rel="noreferrer">
                    Open source reference ↗
                  </a>
                )}
                <hr />
                <h4>Milestone 1 boundary</h4>
                <p>
                  This terrarium runs only nt-mini. The separate MaleCNS
                  instrument never drives this body. A miniature fixture
                  demonstrates engineering semantics, not biological fidelity,
                  consciousness or a topology advantage.
                </p>
              </div>
            ))}
          </article>
        </div>
      </dialog>
    </div>
  );
}
