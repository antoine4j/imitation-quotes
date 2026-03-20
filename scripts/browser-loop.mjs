import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium, devices } from "playwright";

const DEFAULT_PERSONALITY = "Frida Kahlo";
const DEFAULT_OUTPUT_DIR = ".artifacts/browser-loop";
const VIEWPORT_PRESETS = {
  desktop: {
    contextOptions: {
      viewport: { width: 1440, height: 1080 },
      deviceScaleFactor: 1,
    },
    screenshotName: "desktop",
  },
  mobile: {
    contextOptions: {
      ...devices["iPhone 13"],
    },
    screenshotName: "mobile",
  },
};

function parseArgs(argv) {
  const options = {
    url: process.env.BROWSER_LOOP_URL,
    personality: process.env.BROWSER_LOOP_PERSONALITY || DEFAULT_PERSONALITY,
    viewport: process.env.BROWSER_LOOP_VIEWPORT || "desktop",
    outputDir: process.env.BROWSER_LOOP_OUTPUT_DIR || DEFAULT_OUTPUT_DIR,
    headless: process.env.BROWSER_LOOP_HEADLESS !== "0",
    timeoutMs: Number(process.env.BROWSER_LOOP_TIMEOUT_MS || 30000),
    reloadAfterSubmit: process.env.BROWSER_LOOP_RELOAD_AFTER_SUBMIT !== "0",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--url") {
      options.url = argv[index + 1];
      index += 1;
    } else if (arg === "--personality") {
      options.personality = argv[index + 1];
      index += 1;
    } else if (arg === "--viewport") {
      options.viewport = argv[index + 1];
      index += 1;
    } else if (arg === "--output-dir") {
      options.outputDir = argv[index + 1];
      index += 1;
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--headed") {
      options.headless = false;
    } else if (arg === "--no-reload") {
      options.reloadAfterSubmit = false;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!VIEWPORT_PRESETS[options.viewport]) {
    throw new Error(
      `Unsupported viewport "${options.viewport}". Use one of: ${Object.keys(
        VIEWPORT_PRESETS,
      ).join(", ")}`,
    );
  }

  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error(`Invalid timeout: ${options.timeoutMs}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/browser-loop.mjs [options]

Options:
  --url <url>              Use a specific app URL instead of auto-detecting localhost.
  --personality <name>     Personality name to submit. Default: ${DEFAULT_PERSONALITY}
  --viewport <preset>      desktop | mobile
  --output-dir <dir>       Directory for screenshots and diagnostics.
  --timeout-ms <ms>        Timeout for page and result waits. Default: 30000
  --headed                 Launch Chromium with a visible window.
  --no-reload              Skip the post-submit refresh check.
  --help                   Show this message.

Environment:
  BROWSER_LOOP_URL
  BROWSER_LOOP_PERSONALITY
  BROWSER_LOOP_VIEWPORT
  BROWSER_LOOP_OUTPUT_DIR
  BROWSER_LOOP_TIMEOUT_MS
  BROWSER_LOOP_HEADLESS=0
  BROWSER_LOOP_RELOAD_AFTER_SUBMIT=0
`);
}

async function canReach(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
    });

    return response.ok || response.status === 307 || response.status === 308;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveBaseUrl(explicitUrl) {
  if (explicitUrl) {
    return explicitUrl;
  }

  const candidates = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
  ];

  for (const candidate of candidates) {
    if (await canReach(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Could not reach the local app. Start `npm run dev` first or pass --url.",
  );
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseUrl = await resolveBaseUrl(options.url);
  const preset = VIEWPORT_PRESETS[options.viewport];
  const runDir = path.join(
    options.outputDir,
    `${timestamp()}-${preset.screenshotName}`,
  );
  const diagnostics = {
    baseUrl,
    personality: options.personality,
    viewport: options.viewport,
    console: [],
    pageErrors: [],
    requestFailures: [],
    apiResponses: [],
    screenshots: {},
  };

  await mkdir(runDir, { recursive: true });

  const browser = await chromium.launch({ headless: options.headless });

  try {
    const context = await browser.newContext({
      ...preset.contextOptions,
    });
    const page = await context.newPage();

    page.on("console", (message) => {
      diagnostics.console.push({
        type: message.type(),
        text: message.text(),
      });
    });

    page.on("pageerror", (error) => {
      diagnostics.pageErrors.push({
        message: error.message,
      });
    });

    page.on("requestfailed", (request) => {
      diagnostics.requestFailures.push({
        url: request.url(),
        method: request.method(),
        errorText: request.failure()?.errorText ?? "Unknown request failure",
      });
    });

    page.on("response", async (response) => {
      if (!response.url().includes("/api/generate")) {
        return;
      }

      let bodyText = "";

      try {
        bodyText = await response.text();
      } catch {
        bodyText = "<unavailable>";
      }

      diagnostics.apiResponses.push({
        status: response.status(),
        url: response.url(),
        bodyText,
      });
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Who inspires you?" }).waitFor({
      state: "visible",
      timeout: options.timeoutMs,
    });

    const landingScreenshot = path.join(runDir, "01-landing.png");
    await page.screenshot({ path: landingScreenshot, fullPage: true });
    diagnostics.screenshots.landing = landingScreenshot;

    await page.getByLabel("Personality name").fill(options.personality);
    await page.getByRole("button", { name: "Generate quote" }).click();

    const quoteLocator = page.locator("blockquote");
    const errorLocator = page.locator("form [role='alert']");
    const feedbackLocator = page.locator("form p");

    await page.waitForFunction(
      () =>
        Boolean(document.querySelector("blockquote")) ||
        Boolean(document.querySelector("form [role='alert']")) ||
        Boolean(document.querySelector("form p")),
      null,
      { timeout: options.timeoutMs },
    );

    if (await errorLocator.isVisible()) {
      const errorScreenshot = path.join(runDir, "02-error.png");
      diagnostics.status = "error";
      diagnostics.errorMessage = await errorLocator.textContent();
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      diagnostics.screenshots.error = errorScreenshot;
      await writeFile(
        path.join(runDir, "diagnostics.json"),
        `${JSON.stringify(diagnostics, null, 2)}\n`,
        "utf8",
      );
      throw new Error(diagnostics.errorMessage || "Browser loop reached an error state.");
    }

    if ((await quoteLocator.count()) === 0 && (await feedbackLocator.isVisible())) {
      const noResultScreenshot = path.join(runDir, "02-no-result.png");
      diagnostics.status = "no_result";
      diagnostics.userMessage = await feedbackLocator.textContent();
      await page.screenshot({ path: noResultScreenshot, fullPage: true });
      diagnostics.screenshots.noResult = noResultScreenshot;

      await writeFile(
        path.join(runDir, "diagnostics.json"),
        `${JSON.stringify(diagnostics, null, 2)}\n`,
        "utf8",
      );

      console.log(
        JSON.stringify(
          {
            status: diagnostics.status,
            baseUrl,
            viewport: options.viewport,
            userMessage: diagnostics.userMessage,
            screenshots: diagnostics.screenshots,
            diagnosticsFile: path.join(runDir, "diagnostics.json"),
          },
          null,
          2,
        ),
      );

      return;
    }

    diagnostics.status = "success";
    diagnostics.quote = await quoteLocator.textContent();
    diagnostics.attribution = await page.locator("main p").first().textContent();

    const resultScreenshot = path.join(runDir, "02-result.png");
    await page.screenshot({ path: resultScreenshot, fullPage: true });
    diagnostics.screenshots.result = resultScreenshot;

    if (options.reloadAfterSubmit) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page
        .getByRole("heading", { name: "Who inspires you?" })
        .waitFor({ state: "visible", timeout: options.timeoutMs });
      const reloadedScreenshot = path.join(runDir, "03-reloaded.png");
      await page.screenshot({ path: reloadedScreenshot, fullPage: true });
      diagnostics.screenshots.reloaded = reloadedScreenshot;
    }

    await writeFile(
      path.join(runDir, "diagnostics.json"),
      `${JSON.stringify(diagnostics, null, 2)}\n`,
      "utf8",
    );

    console.log(
      JSON.stringify(
        {
          status: diagnostics.status,
          baseUrl,
          viewport: options.viewport,
          quote: diagnostics.quote,
          screenshots: diagnostics.screenshots,
          diagnosticsFile: path.join(runDir, "diagnostics.json"),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

main().catch(async (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
