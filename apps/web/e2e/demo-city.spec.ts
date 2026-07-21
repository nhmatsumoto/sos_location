import { expect, test, type Page } from '@playwright/test';

/**
 * Cenários E2E principais (seção 22 do prompt mestre).
 * Requerem a stack completa no ar: docker compose up --build
 * A cidade demo é importada automaticamente pelo worker no primeiro boot.
 */

async function openDemoCity(page: Page) {
  await page.goto('/');
  const cityButton = page.getByTestId('open-city-demo-district');
  await expect(cityButton).toBeVisible({ timeout: 90_000 });
  await cityButton.click();
  // Espera o voo da câmera terminar (zoom urbano) e o primeiro lote de tiles.
  await expect
    .poll(
      async () => {
        const text = await page.getByTestId('diagnostics-bar').innerText();
        const zoom = Number(text.match(/ZOOM\s+([\d.]+)/i)?.[1] ?? 0);
        const loaded = Number(text.match(/(\d+) loaded/)?.[1] ?? 0);
        return zoom >= 13 && loaded > 0 ? 1 : 0;
      },
      { timeout: 60_000 },
    )
    .toBe(1);
  await page.waitForTimeout(2_500); // estabilização final da câmera e dos tiles
}

test('opens the app and loads the demo city with tiles', async ({ page }) => {
  await openDemoCity(page);
  await expect(page.getByTestId('quality-level')).toContainText(/L[0-4]/);
  await expect(page.getByTestId('diagnostics-bar')).toContainText('revision #');
});

test('camera can be moved and layers toggled', async ({ page }) => {
  await openDemoCity(page);
  const scene = page.getByTestId('geo-scene');
  const box = (await scene.boundingBox())!;

  const before = await page.getByTestId('diagnostics-bar').innerText();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const after = await page.getByTestId('diagnostics-bar').innerText();
  expect(after).not.toBe(before); // lon/lat mudaram

  // Desativa e reativa edifícios.
  await page.getByTestId('layer-toggle-buildings').uncheck();
  await expect(page.getByTestId('layer-toggle-buildings')).not.toBeChecked();
  await page.getByTestId('layer-toggle-buildings').check();
  await expect(page.getByTestId('layer-toggle-buildings')).toBeChecked();
});

test('selecting a building opens the inspector with metadata and provenance', async ({ page }) => {
  await openDemoCity(page);

  const scene = page.getByTestId('geo-scene');
  const box = (await scene.boundingBox())!;
  const inspector = page.getByTestId('inspector-panel');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Vista em perspectiva (pitch 45): varre pontos até acertar um edifício,
  // como um usuário faria ao clicar em um prédio visível.
  let buildingSelected = false;
  outer: for (let dy = -80; dy <= 80; dy += 20) {
    for (let dx = -80; dx <= 80; dx += 20) {
      await page.mouse.click(cx + dx, cy + dy);
      await page.waitForTimeout(600);
      if (!(await inspector.isVisible().catch(() => false))) continue;
      const heading = (await inspector.innerText()).split('\n')[0];
      if (/building/i.test(heading)) {
        buildingSelected = true;
        break outer;
      }
      await page.getByTestId('inspector-close').click();
    }
  }

  expect(buildingSelected).toBe(true);
  await expect(inspector).toContainText(/Height/);
  await expect(inspector).toContainText(/Confidence/);
  await expect(inspector).toContainText(/Provenance/i);
  await page.getByTestId('inspector-close').click();
  await expect(inspector).not.toBeVisible();
});

test('city search + simulated import with progress and recoverable error', async ({ page }) => {
  // Geocoder e import são simulados por rotas: o teste não depende de APIs externas.
  await page.route('**/api/v1/places/search**', (route) =>
    route.fulfill({
      json: [
        {
          providerId: 'relation/9999',
          provider: 'nominatim',
          name: 'Komaki',
          country: 'Japan',
          countryCode: 'JP',
          region: 'Aichi',
          centerLon: 136.91,
          centerLat: 35.29,
          west: 136.85,
          south: 35.25,
          east: 136.97,
          north: 35.33,
        },
      ],
    }),
  );

  let polls = 0;
  let importStarted = false;
  const jobId = '11111111-1111-1111-1111-111111111111';
  const jobBase = {
    id: jobId,
    cityId: null,
    cityRevisionId: null,
    jobType: 'openstreetmap-import',
    stageMessage: null,
    error: null,
    attempts: 1,
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  await page.route('**/api/v1/imports', async (route) => {
    if (route.request().method() === 'POST') {
      importStarted = true;
      polls = 0;
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          ...jobBase,
          status: 'queued',
          progress: 0,
          currentStage: null,
        }),
      });
      return;
    }
    if (!importStarted) {
      await route.fulfill({ json: [] });
      return;
    }

    polls += 1;
    const job =
      polls < 3
        ? { ...jobBase, status: 'running', progress: 40, currentStage: 'Normalize' }
        : { ...jobBase, status: 'failed', progress: 55, currentStage: 'Reconstruct', error: 'Overpass timeout (recoverable: retry later)' };
    await route.fulfill({ json: [job] });
  });

  await page.goto('/');
  await page.getByTestId('city-search-input').fill('Komaki');
  await page.getByTestId('city-search-result').filter({ hasText: 'Komaki' }).click();

  await page.getByTestId('start-import').click();
  await expect(page.getByTestId('import-panel')).toContainText(/running|queued/, {
    timeout: 15_000,
  });
  // O erro recuperável aparece no painel sem quebrar a aplicação.
  await expect(page.getByTestId('import-panel')).toContainText('Overpass timeout', {
    timeout: 20_000,
  });
  await expect(page.getByTestId('diagnostics-bar')).toBeVisible();
});
