import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { CalculatorPageClient } from './CalculatorPageClient';

export const metadata: Metadata = {
  title: '確率・収益計算機',
  description:
    'Fish! の主要エリアについて、Rod / Line / Bobber / Enchant、Time of Day、Weather、時間モデルを入力して期待値分布を計算します。',
  alternates: {
    canonical: `${SITE_URL}/calculator/`,
  },
};

export default function CalculatorPage() {
  return <CalculatorPageClient />;
}
