import type { Metadata } from 'next';
import React from 'react';
import { SourceCard } from '@/components/Sources/SourceCard';
import { FISH_DATA, FISHING_AREAS } from '@/data/fish';
import { SOURCES } from '@/data/sources';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: '出典・免責事項',
  description:
    'VRChat Fish! ガイドで使用しているデータソース、再利用ポリシー、計算モデルの限界をまとめたページです。',
  alternates: {
    canonical: `${SITE_URL}/sources/`,
  },
};

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📚 出典・免責事項</h1>
        <p className="mt-1 text-sm text-gray-500">
          {SITE_NAME}{' '}
          で使用するデータの出典、ライセンス状況、および計算モデルの限界を公開しています。
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">データ・ガバナンスポリシー</h2>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 text-sm leading-relaxed text-gray-700">
          <p>
            このサイトでは、{FISHING_AREAS.length} エリア / {FISH_DATA.length}{' '}
            魚種のデータを扱います。ページ本文や表レイアウトを転載せず、必要な事実値のみを独自のデータ構造に正規化しています。
          </p>
          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div className="mb-1 font-semibold text-yellow-800">数値のみ抽出 (fact-only)</div>
              <div className="text-yellow-700">
                価格・重量・条件タグなどの事実値だけを抽出し、独自の列構成に再整形したものです。
              </div>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="mb-1 font-semibold text-orange-800">
                直接不使用 (not-used-directly)
              </div>
              <div className="text-orange-700">
                出所や解析過程の把握には使うが、サイトの計算データには直接取り込まないソースです。
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="mb-1 font-semibold text-red-800">非サポート (unsupported)</div>
              <div className="text-red-700">
                検証不能な内部式。近似パラメータ化するか、完全に除外して扱います。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">データソース一覧</h2>
        <div className="space-y-4">
          {SOURCES.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">現在の対応範囲</h2>
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-sm leading-relaxed text-green-800">
          <ul className="space-y-2">
            <li>• エリアごとの魚プール</li>
            <li>• 時間帯タグ / 天候タグによる対象魚の絞り込み</li>
            <li>• rarity tier ごとの既定相対重み</li>
            <li>• 売値レンジ中央値ベースの期待値計算</li>
            <li>• 平均試行時間と空振り率を含む時間あたり収益推定</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">非サポートメカニクス</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm leading-relaxed">
          <p className="mb-3 text-red-800">
            以下は内部計算式の根拠が弱い、または community reverse-engineering
            に依存するため、主計算には組み込んでいません。
          </p>
          <ul className="space-y-2 text-red-700">
            <li>
              • <strong>Luck の正確な内部式</strong>: 現在は高 rarity tier
              に重みを寄せる近似入力のみ。
            </li>
            <li>
              • <strong>Big Catch Rate</strong>: 発動確率と重量分布への効き方が未確定です。
            </li>
            <li>
              • <strong>Attraction Rate</strong>: 着水からヒットまでの待ち時間式は未対応です。
            </li>
            <li>
              • <strong>重量から売値への厳密曲線</strong>: 売値レンジ中央値を使う簡略モデルです。
            </li>
            <li>
              • <strong>Secret / Ultimate Secret / Relic</strong>:
              公開ソースで十分な確率根拠を確保できていません。
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">免責事項</h2>
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm leading-relaxed text-gray-700">
          <p>
            このサイトは VRChat Fish!
            の非公式コミュニティサイトです。ゲーム開発者・運営会社とは無関係です。
          </p>
          <p>
            掲載データには community source
            に基づく推定値が含まれます。ゲームアップデートにより情報が古くなる可能性があります。
          </p>
          <p>計算結果は参考情報であり、実際のプレイ結果や収益を保証するものではありません。</p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">広告ポリシー</h2>
        <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-6 text-sm leading-relaxed text-blue-800">
          <p>
            現時点では広告ネットワークを接続していませんが、将来的に運営費用のための広告枠を設ける予定です。
          </p>
          <ul className="space-y-1 text-blue-700">
            <li>• 広告はすべて「広告」として明示します</li>
            <li>• コンテンツと広告枠を視覚的に分離します</li>
            <li>• 広告導入時は本ページの説明も更新します</li>
            <li>• 内容理解を阻害する広告フォーマットは採用しません</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
