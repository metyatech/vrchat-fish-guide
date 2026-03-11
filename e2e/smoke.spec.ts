import { expect, test } from '@playwright/test';

test('home page exposes primary navigation links', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('main').getByRole('heading', { name: 'VRChat Fish! ガイド' }),
  ).toBeVisible();
  await expect(page.getByText('6 エリア対応')).toBeVisible();
  await expect(page.getByText('はじめて使うときの 3 手順')).toBeVisible();
  await expect(page.getByText('このサイトで分かること')).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/calculator\/$/),
    page
      .getByRole('main')
      .getByRole('link', { name: /装備を比べる/ })
      .click(),
  ]);

  await page.goto('/');
  await Promise.all([
    page.waitForURL(/\/sources\/$/),
    page
      .getByRole('main')
      .getByRole('link', { name: /出典・免責事項/ })
      .click(),
  ]);
});

test('calculator updates summary cards and fish list when loadout and filters change', async ({
  page,
}) => {
  await page.goto('/calculator/');

  await expect(page.getByRole('heading', { name: '📊 装備込みの期待値比較' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'まずは今の装備をそろえる' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '次に、どの欄を 1 つだけ変えて試すか選ぶ' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rod の候補を 1 つ追加する' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '追加した候補を今の装備と比べる' })).toBeVisible();
  await expect(page.getByText('現在の装備の合計ステータス', { exact: true })).toBeVisible();
  await expect(page.getByTestId('current-loadout-table')).toBeVisible();
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Rod の候補');
  await expect(page.getByTestId('slot-picker-panel')).toContainText(
    'この Rod 行を選び直しています',
  );
  await expect(page.getByTestId('slot-picker-anchor')).toBeVisible();
  await expect(page.getByRole('button', { name: /細かい調整と前提/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rod を変える' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'まずはこの候補を比較へ追加' })).toBeVisible();
  await expect(page.getByRole('button', { name: /この比較を URL で共有/ })).toBeVisible();
  const totalStatsSection = page.getByTestId('total-stats-section');
  await expect(totalStatsSection.locator('span.rounded-full', { hasText: 'Luck' })).toHaveCSS(
    'background-color',
    'rgb(255, 231, 86)',
  );
  await expect(totalStatsSection.locator('span.rounded-full', { hasText: 'Strength' })).toHaveCSS(
    'background-color',
    'rgb(254, 108, 109)',
  );
  await expect(totalStatsSection.locator('span.rounded-full', { hasText: 'Expertise' })).toHaveCSS(
    'background-color',
    'rgb(75, 188, 224)',
  );
  await expect(
    totalStatsSection.locator('span.rounded-full', { hasText: 'Attraction Rate' }),
  ).toHaveCSS('background-color', 'rgb(146, 213, 188)');
  await expect(
    totalStatsSection.locator('span.rounded-full', { hasText: 'Big Catch Rate' }),
  ).toHaveCSS('background-color', 'rgb(255, 215, 109)');
  await expect(totalStatsSection).not.toContainText('11.999999999999');
  await expect(totalStatsSection).not.toContainText('16.999999999999');

  const initialExpectedValuePerHour = await page
    .getByTestId('summary-expected-value-per-hour')
    .textContent();
  const initialRowCount = await page.locator('tbody tr').count();

  await page
    .locator('#loadout-picker-rod [data-testid="picker-option-row"]', { hasText: 'Fortunate Rod' })
    .click();
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Line の候補');
  await page
    .locator('#loadout-picker-line [data-testid="picker-option-row"]', { hasText: 'Lucky Line' })
    .click();
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Bobber の候補');
  await page
    .locator('#loadout-picker-bobber [data-testid="picker-option-row"]', {
      hasText: 'Lucky Bobber',
    })
    .click();
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Enchant の候補');
  await page
    .locator('#loadout-picker-enchant [data-testid="picker-option-row"]', {
      hasText: 'Money Maker',
    })
    .click();
  await page.getByLabel('Fishing Area').selectOption('open-sea');
  await page.getByLabel('Time of Day').selectOption('night');
  await page.getByLabel('Weather').selectOption('rainy');
  await page.getByLabel('投げてから着水まで (sec)').fill('1.4');
  await page.getByLabel('`!` が出てから反応するまで (sec)').fill('0.25');
  await page.getByLabel('プレイミスの多さ').fill('0.12');

  await page.getByRole('button', { name: 'Enchant を変える' }).click();
  await expect(page.getByRole('heading', { name: 'Enchant の候補を 1 つ追加する' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'まずはこの候補を比較へ追加' })).toBeVisible();
  await page.getByRole('button', { name: 'まずはこの候補を比較へ追加' }).click();
  await expect(page.getByText('いま比べている候補 2 件')).toBeVisible();
  await expect(page.getByRole('heading', { name: '追加した候補を今の装備と比べる' })).toBeVisible();

  await expect(page.getByText('対象魚種:')).toBeVisible();
  await expect(page.getByRole('table').getByText('Abyssal Serpentfish').first()).toBeVisible();
  await expect(page.getByRole('table').getByText('Albacore Tuna').first()).toBeVisible();

  const updatedExpectedValuePerHour = await page
    .getByTestId('summary-expected-value-per-hour')
    .textContent();
  const updatedRowCount = await page.locator('tbody tr').count();

  expect(updatedExpectedValuePerHour).not.toBe(initialExpectedValuePerHour);
  expect(updatedRowCount).not.toBe(initialRowCount);
});

test('current loadout table has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/calculator/');

  await expect(page.getByTestId('current-loadout-table')).toBeVisible();
  await expect(page.getByTestId('active-slot-indicator')).toContainText('Rod を編集中');
  await expect(page.getByTestId('current-loadout-card')).toHaveCSS('overflow', 'visible');

  // The compact-mode table (no location column, abbreviated stat headers) must fit
  // its container without triggering a horizontal scrollbar.
  const hasOverflow = await page.evaluate(() => {
    const tableEl = document.querySelector(
      '[data-testid="current-loadout-table"]',
    ) as HTMLElement | null;
    if (!tableEl) return { error: 'table element not found' };
    const wrapper = tableEl.parentElement;
    if (!wrapper) return { error: 'no parent wrapper' };
    return {
      scrollWidth: wrapper.scrollWidth,
      clientWidth: wrapper.clientWidth,
      overflow: wrapper.scrollWidth > wrapper.clientWidth,
    };
  });

  expect(hasOverflow).not.toHaveProperty('error');
  expect((hasOverflow as { overflow: boolean }).overflow).toBe(false);

  const pageOverflow = await page.evaluate(() => {
    const target = document.documentElement;
    return {
      scrollWidth: target.scrollWidth,
      clientWidth: target.clientWidth,
      overflow: target.scrollWidth > target.clientWidth + 1,
    };
  });
  expect((pageOverflow as { overflow: boolean }).overflow).toBe(false);

  // Badge text must not be broken across lines: verify white-space:nowrap is applied.
  const pickerPanel = page.getByTestId('slot-picker-panel');
  await expect(pickerPanel).toBeVisible();
  const firstBadge = pickerPanel.locator('span.whitespace-nowrap').first();
  await expect(firstBadge).toBeVisible();
  await expect(firstBadge).toHaveCSS('white-space', 'nowrap');

  const activeRow = page
    .getByTestId('current-loadout-table')
    .locator('[data-state="active"]')
    .first();
  await expect(activeRow).toBeVisible();
  await expect(activeRow).toContainText('選んだ候補はここに反映されます');
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Rod の候補');

  // ── New: game loadout board region must not overflow horizontally ──
  const loadoutBoardOverflow = await page.evaluate(() => {
    const card = document.querySelector(
      '[data-testid="current-loadout-card"]',
    ) as HTMLElement | null;
    if (!card) return { error: 'current-loadout-card not found' };
    return {
      scrollWidth: card.scrollWidth,
      clientWidth: card.clientWidth,
      overflow: card.scrollWidth > card.clientWidth + 1,
    };
  });
  expect(loadoutBoardOverflow).not.toHaveProperty('error');
  expect((loadoutBoardOverflow as { overflow: boolean }).overflow).toBe(false);
});

test('calculator avoids horizontal scrolling on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calculator/');

  await expect(page.getByRole('heading', { name: 'まずは今の装備をそろえる' })).toBeVisible();

  const pageOverflow = await page.evaluate(() => {
    const target = document.documentElement;
    window.scrollTo(10, 0);
    return {
      scrollWidth: target.scrollWidth,
      clientWidth: target.clientWidth,
      overflow: target.scrollWidth > target.clientWidth + 1,
      scrollX: window.scrollX,
    };
  });

  expect((pageOverflow as { overflow: boolean }).overflow).toBe(false);
  expect((pageOverflow as { scrollX: number }).scrollX).toBe(0);
});

test('current loadout table visual appearance matches snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/calculator/');

  const loadoutTable = page.getByTestId('current-loadout-table');
  await expect(loadoutTable).toBeVisible();
  // Ensure the active slot indicator shows Rod (default state).
  await expect(page.getByTestId('active-slot-indicator')).toContainText('Rod を編集中');
  // Pin the table width near its desktop layout width so the screenshot stays stable.
  await loadoutTable.evaluate((node) => {
    (node as HTMLElement).style.width = '1080px';
  });
  // Wait a tick for CSS animations to settle.
  await page.waitForTimeout(500);

  // Visual regression: the loadout table must match the established baseline.
  await expect(loadoutTable).toHaveScreenshot('loadout-table-rod-active.png', {
    maxDiffPixelRatio: 0.04,
  });
});

test('clicking outside the picker panel closes it', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/calculator/');

  await expect(page.getByTestId('slot-picker-panel')).toContainText('Rod の候補');

  await page.getByRole('heading', { name: 'まずは今の装備をそろえる' }).click();

  await expect(page.getByTestId('slot-picker-panel')).toHaveCount(0);
});

test('scrolled picker panel keeps the header sealed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calculator/');

  await page.getByLabel('Line を選び直す').click();
  const pickerPanel = page.getByTestId('slot-picker-panel');
  await expect(pickerPanel).toContainText('Line の候補');

  await page.evaluate(() => {
    const list = document.getElementById('loadout-picker-line');
    const wrap = list?.parentElement;
    if (wrap) {
      wrap.scrollTop = 220;
    }
  });

  await page.waitForTimeout(150);
  const headerSeal = await page.evaluate(() => {
    const scrollBody = document.querySelector(
      '[data-testid="picker-scroll-body"]',
    ) as HTMLElement | null;
    const header = document.querySelector(
      '[data-testid="picker-column-header"]',
    ) as HTMLElement | null;
    if (!scrollBody || !header) {
      return { error: 'missing scroll structure' };
    }

    const headerRect = header.getBoundingClientRect();
    const scrollBodyRect = scrollBody.getBoundingClientRect();
    const firstRow = scrollBody.querySelector(
      '[data-testid="picker-option-row"]',
    ) as HTMLElement | null;
    const firstRowRect = firstRow?.getBoundingClientRect() ?? null;

    return {
      scrollTop: scrollBody.scrollTop,
      separated: scrollBodyRect.top >= headerRect.bottom - 1,
      headerBackground: getComputedStyle(header).backgroundColor,
      firstRowTop: firstRowRect?.top ?? null,
      headerBottom: headerRect.bottom,
    };
  });

  expect(headerSeal).toEqual(
    expect.objectContaining({
      scrollTop: expect.any(Number),
      separated: true,
      headerBackground: 'rgb(255, 255, 255)',
    }),
  );
  expect((headerSeal as { scrollTop: number }).scrollTop).toBeGreaterThan(0);
});

test('sources page shows data governance and current source set', async ({ page }) => {
  await page.goto('/sources/');

  await expect(page.getByRole('heading', { name: '📚 出典・免責事項' })).toBeVisible();
  await expect(page.getByText('このサイトのデータの扱い方')).toBeVisible();
  await expect(page.getByText('Fish! TrickForge Studios Fandom Index')).toBeVisible();
  await expect(page.getByText('Fish! TrickForge Studios Fandom Rods')).toBeVisible();
  await expect(page.getByText('現在の対応範囲')).toBeVisible();
});
