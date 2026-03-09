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
  await expect(
    page.getByRole('heading', { name: '上から順に、今の装備と条件を決める' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '次に、どの欄を 1 つだけ変えて試すか選ぶ' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rod の候補を 1 つ追加する' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '追加した候補を今の装備と比べる' })).toBeVisible();
  await expect(page.getByText('現在の装備の合計ステータス', { exact: true })).toBeVisible();
  await expect(page.getByTestId('current-loadout-table')).toBeVisible();
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Rod の候補を右から選ぶ');
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
  await expect(totalStatsSection.locator('span.rounded-full', { hasText: 'Max Weight' })).toHaveCSS(
    'background-color',
    'rgb(146, 84, 186)',
  );
  await expect(page.locator('thead span', { hasText: 'Max Weight' }).first()).toHaveCSS(
    'color',
    'rgb(76, 37, 103)',
  );
  await expect(totalStatsSection).not.toContainText('11.999999999999');
  await expect(totalStatsSection).not.toContainText('16.999999999999');

  const initialExpectedValuePerHour = await page
    .getByTestId('summary-expected-value-per-hour')
    .textContent();
  const initialRowCount = await page.locator('tbody tr').count();

  await page.locator('#loadout-picker-rod tbody tr', { hasText: 'Fortunate Rod' }).click();
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Line の候補を右から選ぶ');
  await page.locator('#loadout-picker-line tbody tr', { hasText: 'Lucky Line' }).click();
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Bobber の候補を右から選ぶ');
  await page.locator('#loadout-picker-bobber tbody tr', { hasText: 'Lucky Bobber' }).click();
  await expect(page.getByTestId('slot-picker-panel')).toContainText('Enchant の候補を右から選ぶ');
  await page.locator('#loadout-picker-enchant tbody tr', { hasText: 'Money Maker' }).click();
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
  await page.goto('/calculator/');

  await expect(page.getByTestId('current-loadout-table')).toBeVisible();

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

  // Badge text must not be broken across lines: verify white-space:nowrap is applied.
  const pickerPanel = page.getByTestId('slot-picker-panel');
  await expect(pickerPanel).toBeVisible();
  const firstBadge = pickerPanel.locator('span.whitespace-nowrap').first();
  await expect(firstBadge).toBeVisible();
  await expect(firstBadge).toHaveCSS('white-space', 'nowrap');
});

test('sources page shows data governance and current source set', async ({ page }) => {
  await page.goto('/sources/');

  await expect(page.getByRole('heading', { name: '📚 出典・免責事項' })).toBeVisible();
  await expect(page.getByText('このサイトのデータの扱い方')).toBeVisible();
  await expect(page.getByText('Fish! TrickForge Studios Fandom Index')).toBeVisible();
  await expect(page.getByText('Fish! TrickForge Studios Fandom Rods')).toBeVisible();
  await expect(page.getByText('現在の対応範囲')).toBeVisible();
});
