import { expect, test } from '@playwright/test';

test('home page exposes primary navigation links', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('main').getByRole('heading', { name: 'VRChat Fish! ガイド' }),
  ).toBeVisible();

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

test('calculator updates summary cards and table when inputs change', async ({ page }) => {
  await page.goto('/calculator/');

  await expect(page.getByRole('heading', { name: '📊 確率・収益計算機' })).toBeVisible();

  await page.getByLabel('釣りエリア').selectOption({ label: '海エリア' });
  await page
    .getByLabel('平均釣り時間（秒/回）※ キャスト〜釣り上げまでの時間（自己計測値）')
    .fill('30');
  await page.getByLabel('空振り確率（0〜0.9）※ 何も釣れない確率（推定値）').fill('0.2');
  await page.getByLabel('ラック倍率（実験的）⚠️ 非公式近似モデル').fill('2');
  await page.getByRole('button', { name: '1時間あたり' }).click();

  await expect(
    page
      .locator('div')
      .filter({ hasText: /^531G期待値\/回$/ })
      .first(),
  ).toBeVisible();
  await expect(
    page
      .locator('div')
      .filter({ hasText: /^63\.8kG期待値\/時間$/ })
      .first(),
  ).toBeVisible();
  await expect(page.getByRole('table').getByText('ドラゴンフィッシュ')).toBeVisible();
  await expect(page.getByRole('table').getByText('Dragon Fish')).toBeVisible();
});

test('sources page shows data governance and source attribution', async ({ page }) => {
  await page.goto('/sources/');

  await expect(page.getByRole('heading', { name: '📚 出典・免責事項' })).toBeVisible();
  await expect(page.getByText('データ・ガバナンスポリシー')).toBeVisible();
  await expect(page.getByText('データソース一覧')).toBeVisible();
  await expect(page.getByText('VRChat Fish! wikiwiki.jp community wiki')).toBeVisible();
  await expect(page.getByText('Community datamine / reverse-engineering data')).toBeVisible();
});
