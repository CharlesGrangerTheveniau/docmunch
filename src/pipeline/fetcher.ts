import { ofetch } from "ofetch";
import { execSync } from "node:child_process";
import consola from "consola";

/** HTTP status codes that warrant a Playwright retry */
const BROWSER_RETRY_CODES = new Set([403, 406, 429]);

/** Patterns that indicate a bot-protection challenge page */
const CHALLENGE_PATTERNS = [
  "verify you are human",
  "just a moment",
  "checking your browser",
  "attention required",
  "enable javascript and cookies",
];

/**
 * Detect if fetched HTML is a bot-protection challenge page
 * rather than real content.
 */
function isChallengeContent(html: string): boolean {
  const lower = html.toLowerCase();
  return CHALLENGE_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Fetch the raw HTML of a documentation page.
 * Uses static fetch by default, falls back to Playwright on blocked responses.
 */
export async function fetchPage(url: string): Promise<string> {
  try {
    return await ofetch(url, { responseType: "text" });
  } catch (err: any) {
    const status = err?.response?.status ?? err?.statusCode;
    if (status && BROWSER_RETRY_CODES.has(status)) {
      consola.warn(
        `Static fetch returned ${status}, retrying with browser...`
      );
      return fetchWithBrowser(url);
    }
    throw err;
  }
}

/**
 * Fetch a page using Playwright for JS-rendered sites.
 * Tries headless first, falls back to non-headless if a bot challenge is detected.
 * Playwright is an optional dependency — throws a typed error if not installed.
 */
export async function fetchWithBrowser(url: string): Promise<string> {
  const playwright = await loadPlaywright();

  // Try headless first
  let html = await launchAndFetch(playwright, url, true);

  // If we got a challenge page, retry with visible browser
  if (isChallengeContent(html)) {
    consola.warn("Bot protection detected, retrying with visible browser...");
    html = await launchAndFetch(playwright, url, false);
  }

  return html;
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    consola.info(
      "This site requires a browser to fetch. Installing Playwright..."
    );
    try {
      execSync("npm install -g playwright", { stdio: "inherit" });
      execSync("npx playwright install chromium", { stdio: "inherit" });
      return await import("playwright");
    } catch {
      const err = new Error(
        "Failed to auto-install Playwright. Install it manually:\n\n" +
          "  npm install -g playwright && npx playwright install chromium\n"
      );
      (err as any).code = "ERR_PLAYWRIGHT_NOT_INSTALLED";
      throw err;
    }
  }
}

async function launchAndFetch(
  playwright: typeof import("playwright"),
  url: string,
  headless: boolean
): Promise<string> {
  const browser = await playwright.chromium.launch({ headless });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Wait for JS-rendered content to settle
    await page.waitForTimeout(2000);
    return await page.content();
  } finally {
    await browser.close();
  }
}
