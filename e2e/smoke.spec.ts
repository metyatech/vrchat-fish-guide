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
      .getByRole('link', { name: /Equipment-aware 計算機/ })
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

  await expect(
    page.getByRole('heading', { name: '📊 Equipment-aware probability calculator' }),
  ).toBeVisible();
  await expect(page.getByText('このページの見方')).toBeVisible();
  await expect(page.getByText('Total Stats', { exact: true })).toBeVisible();
  await expect(page.getByText('Derived model', { exact: true })).toBeVisible();

  const initialExpectedValuePerHour = await page
    .getByTestId('summary-expected-value-per-hour')
    .textContent();
  const initialRowCount = await page.locator('tbody tr').count();

  await page.getByLabel('Fishing Area').selectOption({ label: 'Open Sea' });
  await page.getByLabel('Rod').selectOption({ label: 'Fortunate Rod' });
  await page.getByLabel('Line').selectOption({ label: 'Lucky Line' });
  await page.getByLabel('Bobber').selectOption({ label: 'Lucky Bobber' });
  await page.getByLabel('Enchant').selectOption({ label: 'Money Maker' });
  await page.getByLabel('Time of Day').selectOption({ label: 'Night' });
  await page.getByLabel('Weather').selectOption({ label: 'Rainy' });
  await page.getByLabel('Observed average catch time (sec/attempt)').fill('30');
  await page.getByLabel('Observed miss rate').fill('0.2');

  await expect(page.getByText('対象魚種:')).toBeVisible();
  await expect(page.getByRole('table').getByText('Abyssal Serpentfish').first()).toBeVisible();
  await expect(page.getByRole('table').getByText('Albacore Tuna').first()).toBeVisible();

  const updatedExpectedValuePerHour = await page
    .getByTestId('summary-expected-value-per-hour')
    .textContent();
  const updatedRowCount = await page.locator('tbody tr').count();

  expect(updatedExpectedValuePerHour).not.toBe(initialExpectedValuePerHour);
  expect(updatedRowCount).toBeLessThan(initialRowCount);
});

test('sources page shows data governance and current source set', async ({ page }) => {
  await page.goto('/sources/');

  await expect(page.getByRole('heading', { name: '📚 出典・免責事項' })).toBeVisible();
  await expect(page.getByText('データ・ガバナンスポリシー')).toBeVisible();
  await expect(page.getByText('Fish! TrickForge Studios Fandom Index')).toBeVisible();
  await expect(page.getByText('Fish! TrickForge Studios Fandom Rods')).toBeVisible();
  await expect(page.getByText('現在の対応範囲')).toBeVisible();
});
