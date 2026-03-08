import { expect, test } from '@playwright/test';

test('home page exposes primary navigation links', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('main').getByRole('heading', { name: 'VRChat Fish! ガイド' }),
  ).toBeVisible();
  await expect(page.getByText('6 エリア対応')).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/calculator\/$/),
    page
      .getByRole('main')
      .getByRole('link', { name: /確率・収益計算機/ })
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

test('calculator updates summary cards and fish list when filters change', async ({ page }) => {
  await page.goto('/calculator/');

  await expect(page.getByRole('heading', { name: '📊 確率・収益計算機' })).toBeVisible();

  const initialExpectedValuePerHour = await page
    .locator('text=期待値/時間')
    .locator('..')
    .first()
    .textContent();
  const initialRowCount = await page.locator('tbody tr').count();

  await page.getByLabel('釣りエリア').selectOption({ label: 'Open Sea' });
  await page.getByLabel('時間帯フィルタ').selectOption({ label: 'Night' });
  await page.getByLabel('天候フィルタ').selectOption({ label: 'Rainy' });
  await page.getByLabel('平均試行時間（秒/回）').fill('30');
  await page.getByLabel('空振り確率').fill('0.2');
  await page.getByLabel('Luck 近似倍率').fill('2');

  await expect(page.getByText('対象魚種:')).toBeVisible();
  await expect(page.getByRole('table').getByText('Abyssal Serpentfish').first()).toBeVisible();
  await expect(page.getByRole('table').getByText('Albacore Tuna').first()).toBeVisible();

  const updatedExpectedValuePerHour = await page
    .locator('text=期待値/時間')
    .locator('..')
    .first()
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
  await expect(page.getByText('FISH! Info by Snerx')).toBeVisible();
  await expect(page.getByText('現在の対応範囲')).toBeVisible();
});
