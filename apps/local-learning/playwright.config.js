import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser", timeout: 60000, workers: 1,
  use: { baseURL: "http://127.0.0.1:4175", launchOptions: { executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] } },
  webServer: { command: "node --env-file=runtime.env --experimental-strip-types tests/browser/server.ts", url: "http://127.0.0.1:4175/api/health", reuseExistingServer: false, timeout: 60000 },
  reporter: "list", outputDir: "/tmp/atlas-playwright-results"
});
