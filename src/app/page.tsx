import type { Metadata } from 'next';
import Link from 'next/link';
import { AdSlot } from '@/components/AdSlot';
import { FISH_DATA, FISHING_AREAS } from '@/data/fish';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: `${SITE_NAME} | ホーム`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/`,
  },
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section className="mb-12 text-center">
        <div className="mb-4 text-6xl">🎣</div>
        <h1 className="mb-3 text-3xl font-bold text-gray-900">{SITE_NAME}</h1>
        <p className="mx-auto max-w-3xl text-lg text-gray-600">
          公開 community data を整理し、Fish! の主要 6 エリア・100 種超の魚を対象に、
          確率分布と期待収益を可視化する非公式攻略サイトです。
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
          <div className="rounded-full border border-ocean-200 bg-ocean-50 px-4 py-1 text-ocean-700">
            {FISHING_AREAS.length} エリア対応
          </div>
          <div className="rounded-full border border-ocean-200 bg-ocean-50 px-4 py-1 text-ocean-700">
            {FISH_DATA.length} 魚種を収録
          </div>
          <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-amber-700">
            非公式・推定値を含む
          </div>
        </div>
      </section>

      <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/calculator/"
          className="group block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-ocean-300 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">📊</div>
          <h2 className="mb-2 text-lg font-semibold text-gray-800 transition-colors group-hover:text-ocean-700">
            確率・収益計算機
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            エリア、時間帯、天候、平均試行時間、空振り率、Luck 近似倍率を設定して、 1回あたりと
            1時間あたりの期待値を比較できます。
          </p>
          <div className="mt-4 text-sm font-medium text-ocean-600 transition-colors group-hover:text-ocean-700">
            計算してみる →
          </div>
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white p-6 opacity-70 shadow-sm">
          <div className="mb-3 text-3xl">🐟</div>
          <h2 className="mb-2 text-lg font-semibold text-gray-800">魚種データベース</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            現在の計算ページでは魚一覧と価格レンジを表示しています。専用の図鑑ページは次段階で追加予定です。
          </p>
          <div className="mt-4 text-sm text-gray-400">専用ページは準備中</div>
        </div>

        <Link
          href="/sources/"
          className="group block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-ocean-300 hover:shadow-md"
        >
          <div className="mb-3 text-3xl">📚</div>
          <h2 className="mb-2 text-lg font-semibold text-gray-800 transition-colors group-hover:text-ocean-700">
            出典・免責事項
          </h2>
          <p className="text-sm leading-relaxed text-gray-600">
            採用元、照合元、未採用データを分けて公開し、ライセンス状況と計算モデルの限界を明示しています。
          </p>
          <div className="mt-4 text-sm font-medium text-ocean-600 transition-colors group-hover:text-ocean-700">
            詳細を見る →
          </div>
        </Link>
      </section>

      <div className="my-8 flex justify-center">
        <AdSlot position="in-content" size="leaderboard" showPlaceholder={false} />
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        <h2 className="mb-3 font-semibold">⚠️ データについての注意事項</h2>
        <ul className="space-y-2 leading-relaxed">
          <li>• 確率モデルは Fandom Index の公開 rarity table と条件タグを基礎にした近似です。</li>
          <li>
            • 売値・重量レンジは community spreadsheet
            から事実値だけを抽出して独自スキーマ化しています。
          </li>
          <li>• Luck、Big Catch、Attraction の内部式は未公開のため、完全再現はしていません。</li>
          <li>
            •
            ゲームアップデートで仕様が変わる可能性があるため、結果は常に参考値として扱ってください。
          </li>
        </ul>
      </section>
    </div>
  );
}
