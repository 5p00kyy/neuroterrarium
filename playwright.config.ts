import { defineConfig } from "@playwright/test";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
process.env.TMPDIR = resolve(".cache/tmp");
mkdirSync(process.env.TMPDIR, { recursive: true });
const managed =
  process.env.PLAYWRIGHT_CHROMIUM === "managed" ||
  (!!process.env.CI && !process.env.CHROMIUM_PATH);
const executablePath = managed
  ? undefined
  : process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: 0,
  testDir: "./tests/browser",
  timeout: 90000,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "artifacts/browser-results.json" }],
  ],
  outputDir: "artifacts/browser-runs",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 1100 },
    launchOptions: {
      executablePath,
      env: {
        ...process.env,
        HOME: resolve(".cache/browser-home"),
        XDG_CONFIG_HOME: resolve(".cache/browser-config"),
        XDG_CACHE_HOME: resolve(".cache/browser-cache"),
      },
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
