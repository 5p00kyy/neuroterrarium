import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Manifest } from "../../src/sim/experiment";
test("complete local scientific workflow, export and deterministic replay", async ({
  page,
}) => {
  mkdirSync("artifacts", { recursive: true });
  const errors: string[] = [],
    warnings: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warning") warnings.push(m.text());
  });
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (
      !url.startsWith("http://127.0.0.1:4173/") &&
      !url.startsWith("data:") &&
      !url.startsWith("blob:")
    ) {
      external.push(url);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "▶ Run", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("Not MaleCNS. No measured anatomy."),
  ).toBeVisible();
  await expect(page.getByTestId("spike-count")).toHaveText("0");
  await page.screenshot({
    path: "artifacts/desktop-initial.png",
    fullPage: true,
  });
  await page.context().setOffline(true);
  // A real raycast into the soil, not only a DOM control.
  const canvas = page.locator(".stage canvas");
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await canvas.click({
    position: { x: box.width * 0.62, y: box.height * 0.52 },
  });
  await expect(page.getByRole("status")).toContainText("Light placed");
  await page.getByRole("button", { name: "Single step", exact: true }).click();
  await expect(page.getByTestId("tick")).toContainText("1 ticks");
  await page.getByLabel("Simulation speed").selectOption("4");
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect
    .poll(async () =>
      Number((await page.getByTestId("distance").innerText()).replace("u", "")),
    )
    .toBeGreaterThan(0.5);
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  const paused = await page.getByTestId("tick").innerText();
  await page.waitForTimeout(150);
  expect(await page.getByTestId("tick").innerText()).toBe(paused);
  for (const name of ["Loom", "Odour", "Touch", "Obstacle"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page
      .getByRole("button", { name: "Place preset ↗", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Single step", exact: true })
      .click();
  }
  await page.getByLabel("Perturbation population").selectOption("4");
  await page.getByRole("button", { name: "Silence", exact: true }).click();
  await page.getByRole("button", { name: "Single step", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Silence", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Unperturbed", exact: true }).click();
  await page.getByRole("button", { name: /Train readout/ }).click();
  await expect(page.getByTestId("training-results")).toContainText(
    "Recurrent edge changes: 0",
  );
  await page.getByRole("tab", { name: /Control/ }).click();
  await expect(page.getByRole("tab", { name: /Control/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: /Adaptive/ }).click();
  await page.getByLabel("Overlay all").check();
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect
    .poll(async () =>
      Number((await page.getByTestId("distance").innerText()).replace("u", "")),
    )
    .toBeGreaterThan(1);
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  await page.getByRole("button", { name: /^Provenance/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Matched Control", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "per-neuron in/out degree",
  );
  await page.screenshot({ path: "artifacts/provenance.png" });
  await page.getByRole("button", { name: "Close provenance" }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export experiment ↓", exact: true })
    .click();
  const d = await download;
  await d.saveAs("artifacts/deterministic-run.json");
  const m = JSON.parse(
    readFileSync("artifacts/deterministic-run.json", "utf8"),
  ) as Manifest;
  expect(m.dataset.synthetic).toBe(true);
  expect(m.training!.afterMSE).toBeLessThan(m.training!.beforeMSE);
  expect(m.graphs.Control).not.toBe(m.graphs.Biological);
  expect(m.outputs.length).toBe(m.ticks);
  expect(m.events.some((e) => e.action.type === "perturb")).toBe(true);
  expect(m.events.filter((e) => e.action.type === "stimulus")).toHaveLength(5);
  await page
    .getByRole("button", { name: "↻ Verify replay", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Replay verified");
  await page.getByRole("button", { name: "↺ Reset", exact: true }).click();
  await expect(page.getByTestId("spike-count")).toHaveText("0");
  await page
    .locator("input[type=file]")
    .setInputFiles("artifacts/deterministic-run.json");
  await expect(page.getByRole("status")).toContainText("Replay verified");
  await expect(page.getByTestId("tick")).toContainText(m.ticks + " ticks");
  await page.screenshot({
    path: "artifacts/desktop-verified.png",
    fullPage: true,
  });
  const bad = structuredClone(m);
  bad.outputs[0].bodies[0].x = 999;
  writeFileSync("artifacts/tampered-run.json", JSON.stringify(bad));
  await page
    .locator("input[type=file]")
    .setInputFiles("artifacts/tampered-run.json");
  await expect(page.getByRole("status")).toContainText("Replay mismatch");
  await expect(page.getByTestId("tick")).toContainText(m.ticks + " ticks");
  await page.getByLabel("Seed", { exact: true }).fill("-1");
  await page.getByRole("button", { name: "New run", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Seed must");
  await page.getByLabel("Seed", { exact: true }).fill("137");
  await page.getByRole("button", { name: "New run", exact: true }).click();
  await expect(page.getByTestId("tick")).toContainText("0 ticks");
  writeFileSync(
    "artifacts/browser-console.json",
    JSON.stringify(
      {
        errors,
        warnings,
        externalRequests: external,
        viewport: { width: 1440, height: 1100 },
        ticks: m.ticks,
        code: m.code,
        learning: m.training,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("compact viewport and keyboard-only stimulus control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "▶ Run", exact: true }),
  ).toBeEnabled();
  const preset = page.getByRole("button", {
    name: "Place preset ↗",
    exact: true,
  });
  await preset.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Light placed");
  await page.getByRole("button", { name: "Single step", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
});
