const { test, expect } = require('@playwright/test');
const path = require('path');

const baseUrl = 'http://127.0.0.1:8080/';

async function loadMap(page, viewport) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize(viewport);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const intro = document.getElementById('landingIntro');
    if (intro) {
      intro.classList.add('hidden');
      intro.setAttribute('aria-hidden', 'true');
      intro.style.display = 'none';
      intro.style.pointerEvents = 'none';
    }
  });
  expect(errors).toEqual([]);
}

async function clickBySelector(page, selector) {
  await page.evaluate((targetSelector) => {
    document.querySelector(targetSelector)?.click();
  }, selector);
  await page.waitForTimeout(500);
}

async function loginAsAdmin(page) {
  const body = Buffer.from(JSON.stringify({
    sub: 'admin',
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  const token = `${body}.test-signature`;
  await page.route('**/api/admin/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token,
        role: 'admin',
        expiresIn: 604800,
      }),
    });
  });
  await page.goto(`${baseUrl}?admin=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const intro = document.getElementById('landingIntro');
    if (intro) {
      intro.classList.add('hidden');
      intro.setAttribute('aria-hidden', 'true');
      intro.style.display = 'none';
      intro.style.pointerEvents = 'none';
    }
  });
  await page.locator('#adminPasswordInput').fill('test-password');
  await page.locator('#adminLoginModal [data-action="submit"]').click();
  await page.waitForTimeout(700);
}

test.describe('Galaxy Map smoke', () => {
  test('Desktop 1280x720 loads and captures screenshot', async ({ page }) => {
    await loadMap(page, { width: 1280, height: 720 });
    await page.screenshot({ path: path.join('test-results', 'galaxy-sector-public-1280.png'), fullPage: true });
    const title = await page.title();
    expect(title.toLowerCase()).toContain('galaxy');
  });

  test('Public sector layer has no editor UI or handles', async ({ page }) => {
    await loadMap(page, { width: 1280, height: 720 });
    const sectorFilter = page.locator('[data-filter-key="sectorArmies"]');
    await expect(sectorFilter).toHaveCount(1);
    await clickBySelector(page, '[data-filter-key="sectorArmies"]');

    await expect(page.locator('#sectorArmyEditorMount')).toHaveClass(/hidden/);
    await expect(page.locator('.sector-army-editor-handle')).toHaveCount(0);
    await expect(page.locator('.sector-army-edge-hitbox')).toHaveCount(0);
    await expect(page.locator('.sector-army-curve-control')).toHaveCount(0);
  });

  test('Public sector click opens details without navigating away', async ({ page }) => {
    await loadMap(page, { width: 1280, height: 720 });
    await clickBySelector(page, '[data-filter-key="sectorArmies"]');
    await page.waitForTimeout(800);

    const before = page.url();
    const clicked = await page.evaluate(() => {
      const regions = Array.from(document.querySelectorAll('.sector-army-region'));
      const target = regions.find((node) => {
        const rect = node.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        return rect.width > 10 && rect.height > 10 && cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight;
      }) || regions[0] || null;
      target?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return Boolean(target);
    });
    expect(clicked).toBeTruthy();
    await page.waitForTimeout(500);

    expect(page.url()).toBe(before);
    await expect(page.locator('body')).not.toContainText('404: NOT_FOUND');
    await expect(page.locator('#sectorArmyEditorMount')).toHaveClass(/hidden/);
  });

  test('Underworld disables sector armies and keeps faction filters usable', async ({ page }) => {
    await loadMap(page, { width: 1280, height: 720 });
    await clickBySelector(page, '[data-filter-key="sectorArmies"]');
    await clickBySelector(page, '#mapModeToggleButton');
    await expect(page.locator('body')).toHaveClass(/map-mode-underworld/, { timeout: 5000 });

    const sectorFilter = page.locator('[data-filter-key="sectorArmies"]');
    await expect(sectorFilter).toBeDisabled();
    await expect(page.locator('.sector-army-region')).toHaveCount(0);

    const underworldFilter = page.locator('[data-filter-key="blacksun"]');
    await expect(underworldFilter).toHaveCount(1);
    await clickBySelector(page, '[data-filter-key="blacksun"]');
    await expect(underworldFilter).toHaveAttribute('aria-pressed', /false|true/);
  });

  test('Admin boundary editor starts only after warning confirmation', async ({ page }) => {
    await loginAsAdmin(page);
    await clickBySelector(page, '[data-filter-key="sectorArmies"]');
    await page.waitForTimeout(800);

    await expect(page.locator('.sector-army-editor-handle')).toHaveCount(0);
    await page.evaluate(() => {
      const target = document.querySelector('.sector-army-region');
      target?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
    await page.waitForTimeout(700);
    await expect(page.locator('.sector-army-admin-actions [data-sector-detail-action="start-boundary-edit"]').first()).toBeVisible();
    await expect(page.locator('.sector-army-editor-handle')).toHaveCount(0);

    await page.locator('.sector-army-admin-actions [data-sector-detail-action="start-boundary-edit"]').first().click();
    await expect(page.locator('.sector-confirm-dialog')).toBeVisible();
    await page.locator('.sector-confirm-dialog .accent-button').click();
    await expect(page.locator('.sector-army-editor-handle').first()).toBeVisible();
    await expect(page.locator('#sectorArmyEditorMount')).not.toHaveClass(/hidden/);
  });

  test('Admin can add edit and remove custom sector ship classes', async ({ page }) => {
    await loginAsAdmin(page);
    await clickBySelector(page, '[data-filter-key="sectorArmies"]');
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      document.querySelector('.sector-army-region')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
    await page.waitForTimeout(700);

    await page.locator('[data-sector-detail-action="start-table-edit"]').first().click();
    await page.locator('.sector-confirm-dialog .accent-button').click();
    await page.waitForTimeout(700);
    page.on('dialog', async (dialog) => {
      await dialog.accept('Test Patrol Cutter');
    });
    await page.locator('[data-sector-detail-action="add-ship-class"]').first().click();
    await expect(page.locator('[data-sector-ship-class-label]').first()).toHaveValue('Test Patrol Cutter');

    const freeInput = page.locator('[data-sector-ship-key^="custom-"][data-sector-category="free"]').first();
    await freeInput.fill('3');
    await freeInput.dispatchEvent('change');
    await expect(page.locator('[data-sector-ship-class-label]').first()).toHaveValue('Test Patrol Cutter');

    const labelInput = page.locator('[data-sector-ship-class-label]').first();
    await labelInput.fill('Renamed Patrol Cutter');
    await labelInput.dispatchEvent('change');
    await expect(page.locator('[data-sector-ship-class-label]').first()).toHaveValue('Renamed Patrol Cutter');

    await page.locator('[data-sector-detail-action="remove-ship-class"]').first().click();
    await page.locator('.sector-confirm-dialog .accent-button').click();
    await expect(page.locator('[data-sector-ship-class-label]')).toHaveCount(0);
  });

  test('Mobile 390x844 loads and underworld toggle does not crash', async ({ page }) => {
    await loadMap(page, { width: 390, height: 844 });
    await clickBySelector(page, '#mapModeToggleButton');
    await expect(page.locator('body')).toHaveClass(/map-mode-underworld/, { timeout: 5000 });
    await page.screenshot({ path: path.join('test-results', 'galaxy-mobile-underworld-390.png'), fullPage: true });
  });
});
