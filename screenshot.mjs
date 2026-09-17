import puppeteer from './node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--allow-running-insecure-content',
  ],
  defaultViewport: { width: 1280, height: 800 },
});

const page = await browser.newPage();

try {
  console.log('Navigating to Flutter app...');
  await page.goto('http://localhost:52731', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: 'screenshot_splash.png' });
  console.log('Saved screenshot_splash.png');

  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: 'screenshot_after_splash.png' });
  console.log('Saved screenshot_after_splash.png');
} catch(e) {
  console.error('Error:', e.message);
  await page.screenshot({ path: 'screenshot_error.png' });
}

await browser.close();
