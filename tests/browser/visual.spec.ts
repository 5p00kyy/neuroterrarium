import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
test("guided experiment, honest flow, frozen macro view and hero evidence", async ({
  page,
}) => {
  mkdirSync("artifacts/visual", { recursive: true });
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") errors.push(m.text());
  });
  await page.route("**/*", (route) => {
    const u = route.request().url();
    if (
      !u.startsWith("http://127.0.0.1:4173/") &&
      !u.startsWith("data:") &&
      !u.startsWith("blob:")
    ) {
      external.push(u);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start with light ↗", exact: true }),
  ).toBeEnabled();
  const flow = page.getByTestId("neural-flow");
  await expect(page.getByTestId("flow-count")).toHaveText(
    "0 / 48 sampled spikes",
  );
  expect(await flow.locator('path[data-active="true"]').count()).toBe(0);
  const biological = await flow.getAttribute("data-graph");
  expect(biological).not.toBe("mismatch");
  await page.getByRole("tab", { name: /Control/ }).click();
  await expect(flow).not.toHaveAttribute("data-graph", biological!);
  await expect(flow).not.toHaveAttribute("data-graph", "mismatch");
  await page.getByRole("tab", { name: /Biological/ }).click();
  await page
    .getByRole("button", { name: "Start with light ↗", exact: true })
    .click();
  await expect(page.getByTestId("tick")).not.toContainText("0 ticks");
  await page.getByRole("button", { name: "Ⅱ Pause", exact: true }).click();
  // Capture an actual spiking tick, never fabricate activity for the hero.
  for (
    let i = 0;
    i < 30 &&
    (await page.getByTestId("flow-count").innerText()).startsWith("0 /");
    i++
  ) {
    const previous = await page.getByTestId("tick").innerText();
    await page
      .getByRole("button", { name: "Single step", exact: true })
      .click();
    await expect(page.getByTestId("tick")).not.toHaveText(previous);
  }
  await expect(page.getByTestId("flow-count")).not.toHaveText(
    "0 / 48 sampled spikes",
  );
  expect(
    await flow.locator('path[data-active="true"]').count(),
  ).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Inspect fly", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Inspect fly", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator(".stage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  const canvas = page.locator(".stage canvas");
  const first = await canvas.screenshot();
  await page.waitForTimeout(200);
  const second = await canvas.screenshot();
  expect(first.equals(second)).toBe(true);
  await expect(canvas).toHaveAttribute("data-draw-calls", /^[1-9][0-9]*$/);
  const budget = await canvas.evaluate((e) => ({
    drawCalls: Number(e.dataset.drawCalls),
    triangles: Number(e.dataset.triangles),
  }));
  expect(budget.drawCalls).toBeLessThan(600);
  expect(budget.triangles).toBeLessThan(250000);
  const timing = await page.evaluate(
    () =>
      new Promise<{ medianMs: number; p95Ms: number }>((resolve) => {
        const times: number[] = [];
        let last = performance.now();
        function next(now: number) {
          times.push(now - last);
          last = now;
          if (times.length < 45) requestAnimationFrame(next);
          else {
            times.sort((a, b) => a - b);
            resolve({ medianMs: times[22], p95Ms: times[42] });
          }
        }
        requestAnimationFrame(next);
      }),
  );
  await page
    .locator(".stage")
    .screenshot({ path: "artifacts/visual/hero.png" });
  await page.screenshot({
    path: "artifacts/visual/desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Arena", exact: true }).click();
  await page.getByRole("button", { name: "Odour", exact: true }).click();
  await page
    .getByRole("button", { name: "Place preset ↗", exact: true })
    .click();
  await expect(page.getByTestId("stimulus-contract")).toContainText(
    "not simulated diffusion",
  );
  await page.getByRole("button", { name: "Touch", exact: true }).click();
  await expect(page.getByTestId("stimulus-contract")).toContainText(
    "Global 200 ms",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Compact population activity")).toBeVisible();
  await expect(flow).not.toBeVisible();
  const overlap = await page.evaluate(() => {
    const a = document
        .querySelector(".camera-controls")!
        .getBoundingClientRect(),
      b = document.querySelector(".toolbox")!.getBoundingClientRect();
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    );
  });
  expect(overlap).toBe(false);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "artifacts/visual/compact.png",
    fullPage: true,
  });
  writeFileSync(
    "artifacts/visual/browser-audit.json",
    JSON.stringify(
      {
        errors,
        external,
        budget,
        pausedPageFrameCadence: timing,
        limitations:
          "45 page rAF intervals while paused, with an on-demand canvas. This is idle page cadence, not rendered FPS, physical-GPU FPS, active throughput or a baseline comparison.",
        sampledTick: await page.getByTestId("tick").innerText(),
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
