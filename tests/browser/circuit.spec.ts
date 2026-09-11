import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
for (const width of [1440, 390])
  test("measured circuit multiscale workflow at " + width, async ({ page }) => {
    const errors: string[] = [],
      warnings: string[] = [],
      external: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
      if (m.type() === "warning") warnings.push(m.text());
    });
    page.on("request", (r) => {
      if (
        !r.url().startsWith("http://127.0.0.1:4173/") &&
        !r.url().startsWith("blob:") &&
        !r.url().startsWith("data:")
      )
        external.push(r.url());
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "▶ Run", exact: true }),
    ).toBeEnabled();
    await page
      .getByLabel("Dataset / circuit", { exact: true })
      .selectOption("gf");
    const lab = page.getByRole("region", {
      name: "Measured circuit instrument",
    });
    await expect(lab).toContainText(
      "Simulation-ready topology ≠ validated physiology",
    );
    await expect(page.locator(".stage")).not.toBeVisible();
    mkdirSync("artifacts/phase3", { recursive: true });
    await page.screenshot({
      path: "artifacts/phase3/circuit-regions-" + width + ".png",
      fullPage: true,
    });
    await lab
      .getByRole("button", { name: "Population routes", exact: true })
      .click();
    await expect(page.locator(".route-list button")).toHaveCount(32);
    await page.screenshot({
      path: "artifacts/phase3/circuit-routes-" + width + ".png",
      fullPage: true,
    });
    await page.locator(".route-list button").first().click();
    await page.getByLabel("Selected circuit neuron").selectOption("10010");
    await expect(page.locator(".neuron-inspector")).toContainText(
      "DNp01(GF)_L",
    );
    expect(await page.locator(".neuron-map line").count()).toBeLessThanOrEqual(
      120,
    );
    await page.screenshot({
      path: "artifacts/phase3/circuit-neuron-" + width + ".png",
      fullPage: true,
    });
    await lab.getByRole("button", { name: "Provenance", exact: true }).click();
    await expect(page.locator(".circuit-provenance")).toContainText("417,398");
    await page.screenshot({
      path: "artifacts/phase3/circuit-provenance-" + width + ".png",
      fullPage: true,
    });
    await page.getByLabel("Circuit stimulus population").selectOption("DNp70");
    await page
      .getByRole("button", { name: "Run circuit smoke", exact: true })
      .click();
    await expect(page.locator(".circuit-status")).toContainText(
      "120 ticks complete",
    );
    await expect(page.locator(".smoke-results tbody tr")).toHaveCount(12);
    await page
      .getByRole("button", { name: "Verify circuit replay", exact: true })
      .click();
    await expect(page.locator(".circuit-status")).toContainText(
      "Circuit replay verified",
    );
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export circuit run", exact: true })
      .click();
    const path = "artifacts/phase3/browser-circuit-" + width + ".json";
    await (await download).saveAs(path);
    const run = JSON.parse(readFileSync(path, "utf8"));
    expect(run.circuit.anatomy).toBe("measured");
    expect(run.recurrentAfter).toBe(run.recurrentBefore);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: "artifacts/phase3/circuit-smoke-" + width + ".png",
      fullPage: true,
    });
    await page
      .getByLabel("Dataset / circuit", { exact: true })
      .selectOption("mini");
    await expect(
      page.getByText("Not MaleCNS. No measured anatomy."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "▶ Run", exact: true }),
    ).toBeEnabled();
    writeFileSync(
      "artifacts/phase3/console-" + width + ".json",
      JSON.stringify({ errors, warnings, external }, null, 2),
    );
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(external).toEqual([]);
  });
