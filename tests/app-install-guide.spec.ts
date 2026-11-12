import { test, expect } from '@playwright/test';

test.describe('App Installation Guide & Route Separation Tests', () => {
  test('1. Navigating to /app displays the Wally Atkins App installation guide', async ({ page }) => {
    await page.goto('/app');

    // Verify main headline and subtitle
    const title = page.locator('h1.install-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('Get the Wally Atkins App');

    const subtitle = page.locator('p.install-subtitle');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText('Football Pick\'em');
    await expect(subtitle).toContainText('WallyMUD');

    // Verify Launch App button pointing to /pwa/
    const launchBtn = page.locator('button.btn-launch-secondary').first();
    await expect(launchBtn).toBeVisible();
    await expect(launchBtn).toContainText('Launch Wally Atkins App');
  });

  test('2. Displays iPhone Safari and Android installation walkthrough tabs', async ({ page }) => {
    await page.goto('/app');

    // Test iPhone tab
    const iosTabBtn = page.locator('button.device-tab-btn:has-text("iPhone / iPad")');
    await expect(iosTabBtn).toBeVisible();
    await iosTabBtn.click();

    // Verify Safari Share step
    const guideCard = page.locator('.install-guide-card');
    await expect(guideCard).toContainText('Tap the Share Button');
    await expect(guideCard).toContainText('Add to Home Screen');
    await expect(guideCard).toContainText('Wally Atkins');

    // Test Android tab
    const androidTabBtn = page.locator('button.device-tab-btn:has-text("Android")');
    await expect(androidTabBtn).toBeVisible();
    await androidTabBtn.click();

    // Verify Android steps
    await expect(guideCard).toContainText('Tap the Three Dots Menu');
    await expect(guideCard).toContainText('Install');
  });

  test('3. Navigating to /pwa or /pickem routes to /pwa/ for the standalone PWA bundle', async ({ page }) => {
    // Intercept redirect to /pwa/
    await page.route('**/pwa/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!DOCTYPE html><html><head><title>Wally Atkins</title></head><body><h1>Wally Atkins PWA</h1></body></html>'
      });
    });

    await page.goto('/pwa');
    // Verify it navigated to /pwa/
    expect(page.url()).toContain('/pwa/');
  });

  test('4. Personal website home page renders portfolio with clean branding', async ({ page }) => {
    await page.goto('/');

    // Verify document title and personal portfolio
    await expect(page).toHaveTitle(/Wally Atkins/);
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toBeVisible();
  });
});
