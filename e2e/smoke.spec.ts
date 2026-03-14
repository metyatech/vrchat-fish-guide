import packageJson from '../package.json';
import { expect, test } from '@playwright/test';

const SITE_VERSION = `v${packageJson.version}`;

test('home page exposes primary navigation links', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('main').getByRole('heading', { name: 'VRChat Fish! ガイド' }),
  ).toBeVisible();
  await expect(page.getByTestId('site-version-badge')).toHaveText(SITE_VERSION);
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
  await expect(page.getByRole('heading', { name: 'いまの装備' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '比べる部位を選ぶ' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rod の候補を追加' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '比較一覧' })).toBeVisible();
  await expect(page.getByTestId('total-stats-section')).toContainText('装備の合計');
  await expect(page.getByTestId('current-loadout-table')).toBeVisible();
  await expect(page.getByTestId('slot-picker-panel')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /詳細設定/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rod を変える' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'この候補を比較に追加' })).toBeVisible();
  await expect(page.getByRole('button', { name: /この比較を URL で共有/ })).toBeVisible();
  const totalStatsSection = page.getByTestId('total-stats-section');
  await expect(
    totalStatsSection.locator('[data-total-stat="luck"] span.rounded-full').first(),
  ).toHaveCSS('background-color', 'rgba(255, 231, 86, 0.12)');
  await expect(
    totalStatsSection.locator('[data-total-stat="strength"] span.rounded-full').first(),
  ).toHaveCSS('background-color', 'rgba(254, 108, 109, 0.12)');
  await expect(
    totalStatsSection.locator('[data-total-stat="expertise"] span.rounded-full').first(),
  ).toHaveCSS('background-color', 'rgba(75, 188, 224, 0.12)');
  await expect(
    totalStatsSection.locator('[data-total-stat="attractionRate"] span.rounded-full').first(),
  ).toHaveCSS('background-color', 'rgba(146, 213, 188, 0.12)');
  await expect(
    totalStatsSection.locator('[data-total-stat="bigCatchRate"] span.rounded-full').first(),
  ).toHaveCSS('background-color', 'rgba(255, 215, 109, 0.12)');
  await expect(totalStatsSection).not.toContainText('11.999999999999');
  await expect(totalStatsSection).not.toContainText('16.999999999999');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Rod の候補');
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Rod を編集中');
  await expect(page.getByTestId('current-loadout-table')).toContainText('Basic Line');
  await expect(page.getByTestId('current-loadout-table')).toContainText('Bobber');
  await expect(
    page.getByTestId('total-stats-section').locator('[data-total-stat="luck"]').first(),
  ).toContainText('-50');

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
  await page.getByLabel('釣り場').selectOption('open-sea');
  await page.getByLabel('時間帯').selectOption('night');
  await page.getByLabel('天気').selectOption('rainy');
  await page.getByLabel('投げてから着水まで (sec)').fill('1.4');
  await page.getByLabel('`!` が出てから反応するまで (sec)').fill('0.25');
  await page.getByLabel('ミス率').fill('0.12');

  await page.getByRole('button', { name: 'Enchant を変える' }).click();
  await expect(page.getByRole('heading', { name: 'Enchant の候補を追加' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'この候補を比較に追加' })).toBeVisible();
  await page.getByRole('button', { name: 'この候補を比較に追加' }).click();
  await expect(page.getByText('いま比べている候補 2 件')).toBeVisible();
  await expect(page.getByRole('heading', { name: '比較一覧' })).toBeVisible();

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
  await expect(page.getByTestId('active-slot-indicator')).toHaveCount(0);
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

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();
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
  await expect(activeRow).toContainText('選んだ装備がここに反映されます');
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

test('desktop widths switch Step 1 into a side-by-side comparison workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/calculator/');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();
  const pickerPanel = page.getByTestId('slot-picker-panel');
  await expect(pickerPanel).toContainText('Rod の候補');
  const workspaceShell = page.getByTestId('slot-picker-workspace-shell');
  await expect(workspaceShell).toBeVisible();
  await expect(page.getByTestId('total-stats-section')).toBeVisible();

  const geometry = await page.evaluate(() => {
    const workspace = document.querySelector(
      '[data-testid="slot-picker-workspace-shell"]',
    ) as HTMLElement | null;
    const table = document.querySelector(
      '[data-testid="current-loadout-table"]',
    ) as HTMLElement | null;
    const totals = document.querySelector(
      '[data-testid="total-stats-section"]',
    ) as HTMLElement | null;
    if (!workspace || !table || !totals) {
      return { error: 'missing step 1 geometry' };
    }
    const workspaceRect = workspace.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    const totalsRect = totals.getBoundingClientRect();
    return {
      workspaceBesideTable: workspaceRect.left >= tableRect.right - 1,
      workspaceAboveTotals: workspaceRect.top <= totalsRect.top + 8,
      tableVisibleWidth: tableRect.width,
      workspaceFitsViewport: workspaceRect.right <= window.innerWidth - 8,
    };
  });

  expect(geometry).not.toHaveProperty('error');
  expect((geometry as { workspaceBesideTable: boolean }).workspaceBesideTable).toBe(true);
  expect((geometry as { workspaceAboveTotals: boolean }).workspaceAboveTotals).toBe(true);
  expect((geometry as { tableVisibleWidth: number }).tableVisibleWidth).toBeGreaterThan(320);
  expect((geometry as { workspaceFitsViewport: boolean }).workspaceFitsViewport).toBe(true);
});

test('1920-width desktop keeps the picker in the side workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/calculator/');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();

  const workspaceShell = page.getByTestId('slot-picker-workspace-shell');
  await expect(workspaceShell).toBeVisible();

  const geometry = await page.evaluate(() => {
    const workspace = document.querySelector(
      '[data-testid="slot-picker-workspace-shell"]',
    ) as HTMLElement | null;
    const table = document.querySelector(
      '[data-testid="current-loadout-table"]',
    ) as HTMLElement | null;
    const totals = document.querySelector(
      '[data-testid="total-stats-section"]',
    ) as HTMLElement | null;
    if (!table || !totals) {
      return { error: 'missing base step 1 sections' };
    }
    return {
      hasWorkspace: !!workspace,
      workspaceInsideViewport: workspace
        ? workspace.getBoundingClientRect().right <= window.innerWidth - 8
        : false,
      workspaceBesideTable: workspace
        ? workspace.getBoundingClientRect().left >= table.getBoundingClientRect().right - 1
        : false,
      tableVisibleWidth: table.getBoundingClientRect().width,
    };
  });

  expect(geometry).not.toHaveProperty('error');
  expect((geometry as { hasWorkspace: boolean }).hasWorkspace).toBe(true);
  expect((geometry as { workspaceInsideViewport: boolean }).workspaceInsideViewport).toBe(true);
  expect((geometry as { workspaceBesideTable: boolean }).workspaceBesideTable).toBe(true);
  expect((geometry as { tableVisibleWidth: number }).tableVisibleWidth).toBeGreaterThan(320);
});

test('calculator avoids horizontal scrolling on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calculator/');

  await expect(page.getByRole('heading', { name: 'いまの装備' })).toBeVisible();

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

test('current loadout workspace visual appearance matches snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1720, height: 900 });
  await page.goto('/calculator/');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();
  await expect(page.getByTestId('active-slot-indicator')).toContainText('Rod を編集中');
  const workspaceBoard = page.getByTestId('current-loadout-workspace-board');
  await expect(workspaceBoard).toBeVisible();
  // Pin the board width so the screenshot stays stable across desktop widths.
  await workspaceBoard.evaluate((node) => {
    (node as HTMLElement).style.width = '560px';
    (node as HTMLElement).style.height = '887px';
    (node as HTMLElement).style.maxHeight = '887px';
    (node as HTMLElement).style.overflow = 'hidden';
  });
  // Wait a tick for CSS animations to settle.
  await page.waitForTimeout(500);

  // Visual regression: the workspace board must match the established baseline.
  await expect(workspaceBoard).toHaveScreenshot('loadout-workspace-rod-active.png', {
    // Cross-platform font rendering shifts this table more on Linux than on Windows,
    // while the structural regression checks below still guard the important layout cues.
    maxDiffPixelRatio: 0.06,
  });
});

test('clicking outside the picker panel closes it', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/calculator/');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Rod の候補');

  await page.mouse.click(40, 40);

  await expect(page.getByTestId('slot-picker-panel')).toHaveCount(0);
});

test('scrolled picker panel keeps the header sealed', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/calculator/');

  await page.getByLabel('Enchant を選び直す').click();
  const pickerPanel = page.getByTestId('slot-picker-panel');
  await expect(pickerPanel).toContainText('Enchant の候補');

  await page.evaluate(() => {
    const list = document.getElementById('loadout-picker-enchant');
    const wrap = list?.parentElement;
    if (wrap) {
      wrap.scrollTop = 320;
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

test('equipment picker search filters items by name, location, and special effects', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/calculator/');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();
  const pickerPanel = page.getByTestId('slot-picker-panel');
  await expect(pickerPanel).toContainText('Rod の候補');

  const searchInput = pickerPanel.getByPlaceholder('名前・入手場所・効果で検索...');
  await expect(searchInput).toBeVisible();

  const initialRowCount = await pickerPanel.locator('[data-testid="picker-option-row"]').count();
  expect(initialRowCount).toBeGreaterThan(5);

  await searchInput.fill('Fortunate');
  await page.waitForTimeout(100);
  const fortunateRowCount = await pickerPanel.locator('[data-testid="picker-option-row"]').count();
  expect(fortunateRowCount).toBeGreaterThan(0);
  expect(fortunateRowCount).toBeLessThan(initialRowCount);
  await expect(pickerPanel.locator('[data-testid="picker-option-row"]').first()).toContainText(
    'Fortunate',
  );

  await searchInput.fill('Coconut Bay');
  await page.waitForTimeout(100);
  const coconutBayRowCount = await pickerPanel.locator('[data-testid="picker-option-row"]').count();
  expect(coconutBayRowCount).toBeGreaterThan(0);

  await searchInput.fill('xyznonexistent');
  await page.waitForTimeout(100);
  await expect(pickerPanel.locator('[data-testid="picker-option-row"]')).toHaveCount(0);
  await expect(pickerPanel).toContainText('見つかりません');
  await expect(searchInput).toHaveValue('xyznonexistent');

  await searchInput.fill('');
  await page.waitForTimeout(100);
  const clearedRowCount = await pickerPanel.locator('[data-testid="picker-option-row"]').count();
  expect(clearedRowCount).toBe(initialRowCount);
});

test('candidate picker supports recommendation-tag filters and stat-improvement chips', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/calculator/');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();
  const pickerPanel = page.getByTestId('slot-picker-panel');

  await page.getByRole('button', { name: 'おすすめタグ: 終盤向け' }).click();
  const endgameRows = pickerPanel.locator('[data-testid="picker-option-row"]');
  await expect(endgameRows.first()).toContainText('終盤向け');
  await page.getByRole('button', { name: 'おすすめタグ: コスパ' }).click();
  await expect(page.getByTestId('active-filter-chips')).toContainText('おすすめ: 終盤向け');
  await expect(page.getByTestId('active-filter-chips')).toContainText('おすすめ: コスパ');
  await expect(pickerPanel).toContainText('Sunleaf Rod');

  await page.getByRole('button', { name: 'Lk が上がる候補だけを表示' }).click();
  await expect(pickerPanel).toContainText('Sunleaf Rod');
  await expect(pickerPanel).toContainText('Alien Rod');
});

test('candidate picker supports advanced price and stat range filters', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/calculator/');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();
  const pickerPanel = page.getByTestId('slot-picker-panel');

  await page.getByRole('button', { name: /さらに絞る/ }).click();
  const advancedFilters = page.getByTestId('advanced-candidate-filters');

  await advancedFilters.getByLabel('Price 最高値').fill('1000');
  await expect(pickerPanel).toContainText('Toy Rod');
  await expect(pickerPanel).not.toContainText('Sturdy Wooden Rod');

  await advancedFilters.getByLabel('Price 最高値').fill('');
  await advancedFilters.getByLabel('Str 最低値').fill('50');
  await expect(pickerPanel).toContainText('Metallic Rod');
  await expect(pickerPanel).not.toContainText('Sunleaf Rod');

  await advancedFilters.getByLabel('Str 最低値').fill('');
  await advancedFilters.getByLabel('Lk 最高値').fill('0');
  await expect(pickerPanel).toContainText('Toy Rod');
  await expect(pickerPanel).not.toContainText('Sunleaf Rod');
});

test('candidate picker shows active filter chips and supports multiple locations', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/calculator/');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();
  const pickerPanel = page.getByTestId('slot-picker-panel');

  await page.getByLabel('候補の入手場所').selectOption('Coconut Bay');
  await expect(page.getByTestId('active-filter-chips')).toContainText('入手場所: Coconut Bay');

  await page.getByRole('button', { name: /さらに絞る/ }).click();
  await page.getByRole('button', { name: 'Sell Shops' }).click();

  await expect(page.getByLabel('候補の入手場所')).toHaveValue('__multiple__');
  await expect(pickerPanel).toContainText('Toy Rod');
  await expect(pickerPanel).toContainText('Sunleaf Rod');
  await expect(pickerPanel).not.toContainText('Alien Rod');

  await page.getByRole('button', { name: '入手場所: Coconut Bay' }).click();

  await expect(pickerPanel).not.toContainText('Toy Rod');
  await expect(pickerPanel).toContainText('Sunleaf Rod');
});

test('mobile widths keep a compact current-loadout summary above the stacked picker', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/calculator/');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();

  const mobileSummary = page.getByTestId('mobile-current-loadout-summary');
  await expect(mobileSummary).toBeVisible();
  await expect(mobileSummary).toContainText('いまの装備');
  await expect(mobileSummary).toContainText('Stick and String');
  await expect(mobileSummary).toContainText('Basic Line');
  await expect(mobileSummary).toContainText('装備の合計');
});

test('candidate rows show per-stat deltas against the current equipment', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/calculator/');

  await page.getByRole('button', { name: 'Rod を選び直す' }).click();
  const sunleafRow = page.getByTestId('picker-option-row').filter({ hasText: 'Sunleaf Rod' });

  await expect(sunleafRow).toContainText('+60');
  await expect(sunleafRow).toContainText('+115');
  await expect(sunleafRow).toContainText('+245kg');
});

test('sources page shows data governance and current source set', async ({ page }) => {
  await page.goto('/sources/');

  await expect(page.getByRole('heading', { name: '📚 出典・免責事項' })).toBeVisible();
  await expect(page.getByText('このサイトのデータの扱い方')).toBeVisible();
  await expect(page.getByText('Fish! TrickForge Studios Fandom Index')).toBeVisible();
  await expect(page.getByText('Fish! TrickForge Studios Fandom Rods')).toBeVisible();
  await expect(page.getByText('現在の対応範囲')).toBeVisible();
});
