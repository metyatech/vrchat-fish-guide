import React from 'react';
import Link from 'next/link';
import { AdSlot } from '@/components/AdSlot';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Hero */}
      <section className="text-center mb-12">
        <div className="text-6xl mb-4">🎣</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">VRChat Fish! ガイド</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          コミュニティ非公式の攻略情報サイト。確率計算機、魚種データ、収益シミュレーションなどを提供します。
        </p>
        <div className="mt-2 inline-block bg-amber-50 border border-amber-200 rounded-full px-4 py-1 text-xs text-amber-700">
          ⚠️ 非公式サイトです。掲載データはコミュニティ報告に基づく推定値です。
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Link
          href="/calculator/"
          className="group block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-ocean-300 transition-all"
        >
          <div className="text-3xl mb-3">📊</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-ocean-700 transition-colors">
            確率・収益計算機
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            釣りエリア・時間パラメータを設定し、魚種ごとの釣獲確率と期待値を可視化。1時間あたりの収益見込みを計算します。
          </p>
          <div className="mt-4 text-sm font-medium text-ocean-600 group-hover:text-ocean-700">
            計算してみる →
          </div>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60">
          <div className="text-3xl mb-3">🐟</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">魚種データベース</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            全魚種の基本情報・価格・重量データ。（準備中）
          </p>
          <div className="mt-4 text-sm text-gray-400">近日公開予定</div>
        </div>

        <Link
          href="/sources/"
          className="group block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-ocean-300 transition-all"
        >
          <div className="text-3xl mb-3">📚</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-ocean-700 transition-colors">
            出典・免責事項
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            データの出典、ライセンス状況、計算の前提・限界について詳しく説明しています。
          </p>
          <div className="mt-4 text-sm font-medium text-ocean-600 group-hover:text-ocean-700">
            詳細を見る →
          </div>
        </Link>
      </section>

      {/* In-content ad slot */}
      <div className="flex justify-center my-8">
        <AdSlot position="in-content" size="leaderboard" showPlaceholder={false} />
      </div>

      {/* Data disclaimer */}
      <section className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">
        <h2 className="font-semibold mb-3">⚠️ データについての注意事項</h2>
        <ul className="space-y-2 leading-relaxed">
          <li>
            •
            このサイトのデータはコミュニティ報告・自己計測に基づく推定値であり、公式データではありません。
          </li>
          <li>
            • VRChat Fish! ゲームのアップデートにより、確率・価格・仕様が変更される場合があります。
          </li>
          <li>
            • ラック・Big
            Catch・アトラクションなどの内部計算式は非公開のため、計算機では近似モデルを使用しています。
          </li>
          <li>• 計算結果はあくまで参考値です。実際の収益を保証するものではありません。</li>
        </ul>
      </section>
    </div>
  );
}
