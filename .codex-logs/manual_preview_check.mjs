import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import('file:///C:/Users/VICTORIA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');

const frontendUrl = 'http://127.0.0.1:5000';
const outputDir = 'C:/Users/VICTORIA/Desktop/Gladiators/.codex-logs';

await fs.mkdir(outputDir, { recursive: true });

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

const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  colorScheme: 'light',
});

await context.addInitScript((token) => {
  window.localStorage.setItem('landrify_token', token);
}, process.env.LANDRIFY_TOKEN);

const page = await context.newPage();

try {
  await page.goto(frontendUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    window.history.pushState({}, '', '/scan/new');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Coordinates' }).click();
  await page.getByPlaceholder('Latitude').fill('6.4698');
  await page.getByPlaceholder('Longitude').fill('3.5852');
  await page.getByRole('button', { name: 'Use these coordinates' }).click();
  await page.waitForSelector('text=Manual coordinates', { timeout: 15000 });
  await page.waitForTimeout(5000);
  const filePath = path.join(outputDir, 'manual-preview-check.png');
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(filePath);
} finally {
  await browser.close();
}
