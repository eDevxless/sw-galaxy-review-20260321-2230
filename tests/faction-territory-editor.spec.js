const { test, expect } = require('@playwright/test');

const baseUrl = process.env.FACTION_EDITOR_TEST_URL || 'http://127.0.0.1:8080/';

async function hideIntro(page) {
  await page.evaluate(() => {
    const intro = document.getElementById('landingIntro');
    if (!intro) return;
    intro.style.display = 'none';
    intro.style.pointerEvents = 'none';
    intro.setAttribute('aria-hidden', 'true');
  });
}

async function loginAsAdmin(page) {
  const body = Buffer.from(JSON.stringify({
    sub: 'admin', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  await page.route('**/api/admin/login', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: `${body}.test-signature` }) });
  });
  await page.goto(`${baseUrl}?admin=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  await hideIntro(page);
  await page.locator('#adminPasswordInput').fill('test-password');
  await page.locator('#adminLoginModal [data-action="submit"]').click();
  await page.locator('[data-window-open="mapTools"]').click();
  await expect(page.locator('#factionTerritoryEditorButton')).toBeVisible();
}

async function coruscantScreenPoint(page, dx, dy) {
  const point = await page.evaluate(({ dx, dy }) => {
    const viewer = window.MapAdminApi.getViewer();
    const size = window.MapAdminApi.getImageSize();
    const item = window.MapAdminApi.getMapItems().find((entry) => entry.name === 'Coruscant');
    const viewportPoint = viewer.world.getItemAt(0).imageToViewportCoordinates(item.x * size.width, item.y * size.height);
    const viewerPoint = viewer.viewport.pixelFromPoint(viewportPoint, true);
    const rect = viewer.element.getBoundingClientRect();
    return { x: rect.left + viewerPoint.x + dx, y: rect.top + viewerPoint.y + dy };
  }, { dx, dy });
  return point;
}

async function clickPlanetOffset(page, dx, dy) {
  const point = await coruscantScreenPoint(page, dx, dy);
  await page.mouse.click(point.x, point.y);
  return point;
}

test.describe('Faction territory editor', () => {
  test('public visitors cannot open the editing workspace', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1300);
    await hideIntro(page);
    await expect(page.locator('#factionTerritoryEditorButton')).toBeHidden();
    await expect(page.locator('.faction-editor-shell.is-open')).toHaveCount(0);
  });

  test('admin draws a curved territory, assigns enclosed planets, and reloads the saved vector', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsAdmin(page);
    await expect(page.locator('.faction-territory-image-svg')).toHaveCount(1);
    await page.locator('#factionTerritoryEditorButton').click();
    await expect(page.locator('.faction-editor-shell.is-open')).toBeVisible();
    await page.locator('[data-faction-row="1"][data-faction-id="republic"]').click();
    const republicBoundaries = page.locator('.faction-territory-path[data-faction-id="republic"]');
    await expect.poll(() => republicBoundaries.count()).toBeGreaterThan(0);
    await page.locator('[data-tool="transform"]').click();
    await expect(page.locator('[data-transform-handle]')).toHaveCount(5);
    await page.evaluate(() => {
      const viewer = window.MapAdminApi.getViewer();
      const rect = viewer.element.getBoundingClientRect();
      viewer.element.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, pointerId: 97, button: 0,
        clientX: rect.left + 2, clientY: rect.top + 2,
      }));
    });
    await expect(republicBoundaries).toHaveCount(0);
    await expect(page.locator('[data-transform-handle]')).toHaveCount(0);
    await page.locator('[data-faction-row="1"][data-faction-id="republic"]').click();
    const existingTerritoryId = await republicBoundaries.first().getAttribute('data-territory-id');
    await page.locator(`[data-territory-row="${existingTerritoryId}"]`).click();
    await page.locator('[data-tool="node"]').click();
    await expect(page.locator('[data-node-anchor]')).toHaveCount(8);
    await page.locator('[data-faction-row="1"][data-faction-id="separatist"]').click();
    await expect.poll(() => page.locator('.faction-territory-path[data-faction-id="separatist"]').count()).toBeGreaterThan(0);
    await page.locator('[data-faction-row="1"][data-faction-id="republic"]').click();
    const layersPanel = page.locator('[data-panel-content="layers"]');
    await page.locator('[data-panel-toggle="layers"]').click();
    await expect(layersPanel).toBeHidden();
    await page.locator('[data-panel-toggle="layers"]').click();
    await expect(layersPanel).toBeVisible();

    await page.locator('[data-action="add-faction"]').click();
    const factionRow = page.locator('[data-faction-row="1"]').filter({ hasText: 'Neue Fraktion' }).last();
    const factionId = await factionRow.getAttribute('data-faction-id');
    await page.locator('[data-action="new-territory"]').click();
    await page.evaluate(() => window.MapAdminApi.getViewer().viewport.goHome(true));
    await page.waitForTimeout(350);

    await clickPlanetOffset(page, -70, -55);
    await expect(page.locator('.faction-editor-draft-point')).toHaveCount(1);
    await clickPlanetOffset(page, -70, -55);
    await expect(page.locator('.faction-editor-draft-point')).toHaveCount(1);
    await expect(page.locator('[data-toast]')).toContainText('mindestens 18 Pixel Abstand');
    const curveStart = await coruscantScreenPoint(page, 70, -55);
    const curveEnd = await coruscantScreenPoint(page, 90, -50);
    await page.mouse.move(curveStart.x, curveStart.y);
    await page.mouse.down();
    await page.mouse.move(curveEnd.x, curveEnd.y, { steps: 4 });
    await page.mouse.up();
    await expect(page.locator('.faction-editor-draft-point')).toHaveCount(2);
    await expect(page.locator('.faction-editor-draft-point-ring')).toHaveCount(2);
    const draftPresentation = await page.evaluate(() => {
      const controlSvg = document.querySelector('.faction-territory-controls-svg');
      const regionOverlay = document.querySelector('.faction-territory-map-overlay');
      const objectOverlay = document.querySelector('.faction-territory-image-overlay');
      const regionSvg = document.querySelector('.faction-territory-map-svg');
      const objectSvg = document.querySelector('.faction-territory-image-svg');
      const draftPath = document.querySelector('.faction-editor-draft-path');
      const marker = document.querySelector('.faction-editor-draft-point');
      const bounds = [regionSvg, objectSvg, controlSvg].map((svg) => {
        const rect = svg.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
      const markerRect = marker.getBoundingClientRect();
      return {
        controlsAfterRegion: Boolean(regionSvg.compareDocumentPosition(controlSvg) & Node.DOCUMENT_POSITION_FOLLOWING),
        controlsAfterObjects: Boolean(objectSvg.compareDocumentPosition(controlSvg) & Node.DOCUMENT_POSITION_FOLLOWING),
        path: draftPath?.getAttribute('d') || '',
        markerVisible: Boolean(marker?.getClientRects().length),
        markerInViewport: markerRect.right > 0 && markerRect.bottom > 0 && markerRect.left < innerWidth && markerRect.top < innerHeight,
        layersHaveArea: bounds.every((rect) => rect.width > 10 && rect.height > 10),
        alignedLayers: bounds.every((rect) =>
          Math.abs(rect.x - bounds[0].x) < 1 && Math.abs(rect.y - bounds[0].y) < 1 &&
          Math.abs(rect.width - bounds[0].width) < 1 && Math.abs(rect.height - bounds[0].height) < 1),
      };
    });
    expect(draftPresentation.controlsAfterRegion).toBe(true);
    expect(draftPresentation.controlsAfterObjects).toBe(true);
    expect(draftPresentation.path).toMatch(/C/);
    expect(draftPresentation.markerVisible).toBe(true);
    expect(draftPresentation.markerInViewport).toBe(true);
    expect(draftPresentation.layersHaveArea).toBe(true);
    expect(draftPresentation.alignedLayers).toBe(true);
    await clickPlanetOffset(page, 10, 70);
    await clickPlanetOffset(page, -70, -55);

    const createdTerritoryPath = page.locator(`.faction-territory-path[data-faction-id="${factionId}"]`);
    await expect(createdTerritoryPath).toHaveCount(1);
    const createdTerritoryId = await createdTerritoryPath.getAttribute('data-territory-id');
    await expect(page.locator('.faction-editor-draft-path')).toHaveCount(0);
    await expect(page.locator('[data-handle-key]')).toHaveCount(2);
    await expect.poll(async () => page.evaluate(() => {
      const item = window.MapAdminApi.getMapItems().find((entry) => entry.name === 'Coruscant');
      return item?.faction || '';
    })).toBe(factionId);
    await expect.poll(async () => page.evaluate((faction) => {
      const items = window.MapAdminApi.getMapItems().filter((item) => item.kind !== 'route' && item.kind !== 'faction');
      const center = items.find((item) => item.name === 'Coruscant');
      return items.filter((item) => item.name !== 'Coruscant')
        .sort((a, b) => Math.hypot(b.x - center.x, b.y - center.y) - Math.hypot(a.x - center.x, a.y - center.y))[0]?.faction || '';
    }, factionId)).not.toBe(factionId);

    const territoriesLayer = page.locator('[data-layer-visible="territories"]');
    await territoriesLayer.uncheck();
    await expect(createdTerritoryPath).toHaveCount(0);
    await territoriesLayer.check();
    await expect(createdTerritoryPath).toHaveCount(1);

    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=', 'base64');
    await page.locator('[data-image-file]').setInputFiles({ name: 'alpha-banner.png', mimeType: 'image/png', buffer: transparentPng });
    await expect(page.locator('.faction-banner-image')).toHaveCount(1);
    await page.locator('[data-action="undo"]').click();
    await expect(page.locator('.faction-banner-image')).toHaveCount(0);
    await page.locator('[data-action="redo"]').click();
    await expect(page.locator('.faction-banner-image')).toHaveCount(1);

    const widthField = page.locator('[data-object-field="width"]');
    await widthField.fill('0.1200');
    await widthField.press('Tab');
    const rotationField = page.locator('[data-object-field="rotation"]');
    await rotationField.fill('15');
    await rotationField.press('Tab');
    await expect(page.locator('.faction-banner-image')).toHaveAttribute('transform', /rotate\(15 /);
    await expect.poll(async () => page.evaluate(async () => {
      const image = document.querySelector('.faction-banner-image');
      const url = image?.getAttribute('href');
      if (!url?.startsWith('blob:')) return null;
      const blob = await (await fetch(url)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0);
      const alpha = context.getImageData(0, 0, 1, 1).data[3];
      bitmap.close();
      return { type: blob.type, alpha };
    })).toEqual({ type: 'image/png', alpha: 0 });

    await page.locator('[data-action="save"]').click();
    await expect(page.locator('[data-save-state]')).toHaveText('Gespeichert');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1700);
    await hideIntro(page);
    await page.locator('#factionTerritoryEditorButton').click();
    await expect(page.locator('.faction-editor-shell.is-open')).toBeVisible();
    await page.locator(`[data-faction-row="1"][data-faction-id="${factionId}"]`).click();
    await expect(page.locator(`.faction-territory-path[data-faction-id="${factionId}"]`)).toHaveCount(1);
    await expect(page.locator('.faction-banner-image')).toHaveCount(1);
    const createdTerritoryRow = page.locator(`[data-territory-row="${createdTerritoryId}"]`);
    await expect(createdTerritoryRow).toHaveCount(1);
    await createdTerritoryRow.click();
    await page.locator('[data-tool="node"]').click();
    await expect(page.locator('[data-handle-key]')).toHaveCount(2);
    await expect.poll(async () => page.evaluate(() => {
      const item = window.MapAdminApi.getMapItems().find((entry) => entry.name === 'Coruscant');
      return item?.faction || '';
    })).toBe(factionId);
    await page.locator('#mapModeToggleButton').evaluate((button) => button.click());
    await expect.poll(() => page.evaluate(() => window.MapAdminApi.getMapMode())).toBe('underworld');
    for (const underworldFaction of ['blacksun', 'hutt', 'pyke', 'ohnaka']) {
      const areaCount = page.locator(`[data-faction-row="1"][data-faction-id="${underworldFaction}"] .faction-editor-row-end`);
      await expect.poll(async () => Number(await areaCount.textContent())).toBeGreaterThan(0);
    }
    await page.locator('[data-faction-row="1"][data-faction-id="blacksun"]').click();
    await expect.poll(() => page.locator('.faction-territory-path[data-faction-id="blacksun"]').count()).toBeGreaterThan(0);
    await page.locator('[data-action="close"]').click();
    await expect(page.locator('.faction-territory-path')).toHaveCount(0);
  });
});
