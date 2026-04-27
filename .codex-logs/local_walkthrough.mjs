import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import('file:///C:/Users/VICTORIA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const frontendUrl = process.env.LANDRIFY_FRONTEND_URL || 'http://127.0.0.1:5000';
const apiBaseUrl = process.env.LANDRIFY_API_BASE_URL || 'http://127.0.0.1:8000';
const outputDir = 'C:/Users/VICTORIA/Desktop/Gladiators/.codex-logs';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function registerUser() {
  const email = `codex-walkthrough-${Date.now()}@example.com`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'CodexPass123!',
        confirm_password: 'CodexPass123!',
        full_name: 'Codex Walkthrough',
        user_type: 'individual',
      }),
    });
    if (response.ok) {
      return response.json();
    }
    if (response.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }
    throw new Error(`register failed: ${response.status} ${await response.text()}`);
  }
  throw new Error('register failed after retries');
}

async function getAuth() {
  if (process.env.LANDRIFY_TOKEN) {
    return { token: process.env.LANDRIFY_TOKEN };
  }
  return registerUser();
}

async function launchBrowser() {
  const attempts = [
    { headless: true },
    { headless: true, channel: 'msedge' },
  ];
  let lastError;
  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function takeScreenshot(page, name) {
  const filePath = path.join(outputDir, name);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

const auth = await getAuth();
const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1400 },
  geolocation: { latitude: 6.4698, longitude: 3.5852 },
  colorScheme: 'light',
});

await context.grantPermissions(['geolocation'], { origin: frontendUrl });
await context.addInitScript(({ token, apiBaseUrl }) => {
  window.localStorage.setItem('landrify_token', token);

  const defaultApiBaseUrl = 'http://127.0.0.1:8000';
  const rewriteUrl = (input) => {
    if (typeof input === 'string' && input.startsWith(defaultApiBaseUrl)) {
      return input.replace(defaultApiBaseUrl, apiBaseUrl);
    }
    if (input instanceof Request && typeof input.url === 'string' && input.url.startsWith(defaultApiBaseUrl)) {
      return new Request(input.url.replace(defaultApiBaseUrl, apiBaseUrl), input);
    }
    return input;
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => originalFetch(rewriteUrl(input), init);

  const originalOpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
    const rewrittenUrl =
      typeof url === 'string' && url.startsWith(defaultApiBaseUrl)
        ? url.replace(defaultApiBaseUrl, apiBaseUrl)
        : url;
    return originalOpen.call(this, method, rewrittenUrl, ...rest);
  };
}, { token: auth.token, apiBaseUrl });

const page = await context.newPage();
const summary = {
  addressPreview: false,
  addressDropdownClosed: false,
  manualPreview: false,
  gpsPreview: false,
  mapPickPreview: false,
  scanRedirect: false,
  aiExpandCollapse: false,
  weatherProjectionVisible: false,
  mobilePreview: false,
  screenshots: {},
};

try {
  await page.goto(frontendUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    window.history.pushState({}, '', '/scan/new');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(1200);
  summary.initialUrl = page.url();
  summary.screenshots.initial = await takeScreenshot(page, 'walkthrough-initial.png');
  summary.initialBody = (await page.locator('body').innerText()).slice(0, 1200);
  await page.waitForSelector('iframe[title="Location preview"]', { timeout: 15000 });

  const addressInput = page.getByPlaceholder('Search any Nigerian address, landmark, town, LGA, or state');
  await addressInput.fill('Lekki Phase 1');
  await page.waitForSelector('.max-h-80 button', { timeout: 20000 });
  await page.locator('.max-h-80 button').first().click();
  await page.waitForTimeout(800);
  await page.waitForSelector('text=Selected address:', { timeout: 10000 });
  await page.waitForSelector('text=scan radius 50 m', { timeout: 10000 });
  summary.addressPreview = true;
  summary.addressDropdownClosed = (await page.locator('.max-h-80 button').count()) === 0;
  summary.screenshots.address = await takeScreenshot(page, 'walkthrough-address-preview.png');

  await page.getByRole('button', { name: 'Coordinates' }).click();
  await page.getByPlaceholder('Latitude').fill('6.4698');
  await page.getByPlaceholder('Longitude').fill('3.5852');
  await page.getByRole('button', { name: 'Use these coordinates' }).click();
  await page.waitForSelector('text=Manual coordinates', { timeout: 10000 });
  summary.manualPreview = true;
  summary.screenshots.manual = await takeScreenshot(page, 'walkthrough-manual-preview.png');

  await page.getByRole('button', { name: 'My Location' }).click();
  await page.getByRole('button', { name: 'Use my current location' }).click();
  await page.waitForSelector('text=GPS coordinates captured', { timeout: 15000 });
  summary.gpsPreview = true;
  summary.screenshots.gps = await takeScreenshot(page, 'walkthrough-gps-preview.png');

  await page.getByRole('button', { name: 'Pick on Map' }).click();
  await page.waitForSelector('.leaflet-container', { timeout: 15000 });
  const map = page.locator('.leaflet-container');
  await map.click({ position: { x: 260, y: 220 } });
  await page.waitForSelector('text=Map pin location', { timeout: 10000 });
  summary.mapPickPreview = true;
  summary.screenshots.mapPick = await takeScreenshot(page, 'walkthrough-map-pick-preview.png');

  const scanStart = Date.now();
  await page.getByRole('button', { name: 'Run land scan' }).click();

  const submitOutcome = await Promise.race([
    page.waitForFunction(
      () => /\/scan\/[0-9a-f-]+$/.test(window.location.pathname),
      null,
      { timeout: 180000 },
    ).then(() => 'redirect'),
    page.waitForSelector('text=Download PDF Report', { timeout: 180000 }).then(() => 'result'),
    page.waitForSelector('text=Failed to create scan.', { timeout: 180000 }).then(() => 'generic-error'),
    page.waitForSelector('[class*="text-red"]', { timeout: 180000 }).then(() => 'inline-error'),
  ]);

  summary.submitOutcome = submitOutcome;
  summary.postSubmitUrl = page.url();
  summary.postSubmitBody = (await page.locator('body').innerText()).slice(0, 1800);
  summary.screenshots.afterSubmit = await takeScreenshot(page, 'walkthrough-after-submit.png');

  if (submitOutcome === 'redirect' || submitOutcome === 'result') {
    await page.waitForSelector('text=Download PDF Report', { timeout: 180000 });
    summary.scanRedirect = true;
    summary.scanDurationMs = Date.now() - scanStart;
    summary.resultUrl = page.url();
    summary.screenshots.result = await takeScreenshot(page, 'walkthrough-scan-result.png');

    await page.waitForSelector('text=Weather & Climate', { timeout: 30000 });
    const climateSectionText = await page.locator('body').innerText();
    summary.weatherProjectionVisible =
      climateSectionText.includes('2030 Projection')
      && climateSectionText.includes('2075 Projection')
      && !climateSectionText.includes('2030 Projection\n— mm/year');
  }

  const loadMore = page.getByRole('button', { name: 'Load More' });
  if (summary.scanRedirect && await loadMore.count()) {
    await loadMore.click();
    await page.waitForSelector('text=Read Less', { timeout: 10000 });
    await page.getByRole('button', { name: 'Read Less' }).click();
    await page.waitForSelector('text=Load More', { timeout: 10000 });
    summary.aiExpandCollapse = true;
  }

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    geolocation: { latitude: 6.4698, longitude: 3.5852 },
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
  });
  await mobileContext.grantPermissions(['geolocation'], { origin: frontendUrl });
  await mobileContext.addInitScript(({ token, apiBaseUrl }) => {
    window.localStorage.setItem('landrify_token', token);
    const defaultApiBaseUrl = 'http://127.0.0.1:8000';
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (typeof input === 'string' && input.startsWith(defaultApiBaseUrl)) {
        return originalFetch(input.replace(defaultApiBaseUrl, apiBaseUrl), init);
      }
      if (input instanceof Request && typeof input.url === 'string' && input.url.startsWith(defaultApiBaseUrl)) {
        return originalFetch(new Request(input.url.replace(defaultApiBaseUrl, apiBaseUrl), input), init);
      }
      return originalFetch(input, init);
    };
    const originalOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      const rewrittenUrl =
        typeof url === 'string' && url.startsWith(defaultApiBaseUrl)
          ? url.replace(defaultApiBaseUrl, apiBaseUrl)
          : url;
      return originalOpen.call(this, method, rewrittenUrl, ...rest);
    };
  }, { token: auth.token, apiBaseUrl });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(frontendUrl, { waitUntil: 'networkidle' });
  await mobilePage.evaluate(() => {
    window.history.pushState({}, '', '/scan/new');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await mobilePage.waitForTimeout(1200);
  const mobileAddressInput = mobilePage.getByPlaceholder('Search any Nigerian address, landmark, town, LGA, or state');
  await mobileAddressInput.fill('Lekki Phase 1');
  await mobilePage.waitForSelector('.max-h-80 button', { timeout: 20000 });
  await mobilePage.locator('.max-h-80 button').first().click();
  await mobilePage.waitForSelector('text=Selected address:', { timeout: 10000 });
  summary.mobilePreview = true;
  summary.screenshots.mobile = await takeScreenshot(mobilePage, 'walkthrough-mobile-preview.png');
  await mobileContext.close();

  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  summary.error = {
    message: error?.message || String(error),
    resultUrl: page.url(),
  };
  console.log(JSON.stringify(summary, null, 2));
  throw error;
} finally {
  await browser.close();
}
