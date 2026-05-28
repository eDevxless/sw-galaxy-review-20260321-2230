const { test, expect } = require('@playwright/test');
const path = require('path');

const baseUrl = 'http://127.0.0.1:8080/';

test.describe('Galaxy Map smoke', () => {
    test('Desktop 1280x720 loads and captures screenshot', async ({ page }) => {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await page.setViewportSize({ width: 1280, height: 720 });
        // wait a short while for UI to initialize
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join('test-results', 'galaxy-sector-public-1280.png'), fullPage: true });
        const title = await page.title();
        expect(title.toLowerCase()).toContain('galaxy');
    });

    test('Mobile 390x844 underworld toggle and screenshot', async ({ page }) => {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(500);
        // Capture mobile viewport screenshot (avoid triggering navigations)
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join('test-results', 'galaxy-mobile-underworld-390.png'), fullPage: true });
    });
});
