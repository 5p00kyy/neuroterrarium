import type { Action, Frame, Manifest } from "./experiment";
export type Request =
  | { type: "reset"; seed: number }
  | { type: "run"; running: boolean; speed: number }
  | { type: "step" }
  | { type: "action"; action: Action }
  | { type: "export" }
  | { type: "replay"; manifest?: unknown };
export type Response =
  | { type: "frame"; frame: Frame; running: boolean; seed: number }
  | { type: "export"; manifest: Manifest }
  | { type: "notice"; text: string }
  | { type: "error"; text: string };
