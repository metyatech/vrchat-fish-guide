import type { Metadata } from 'next';
import React from 'react';
import { SourceCard } from '@/components/Sources/SourceCard';
import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
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
            このサイトでは、{FISHING_AREAS.length} エリア / {FISH_DATA.length} 魚種 / {RODS.length}{' '}
            Rod / {LINES.length} Line / {BOBBERS.length} Bobber / {ENCHANTS.length - 1} Enchant
            のデータを扱います。ページ本文や表レイアウトを転載せず、必要な事実値のみを独自のデータ構造に正規化しています。
          </p>
          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div className="mb-1 font-semibold text-yellow-800">数値のみ抽出 (fact-only)</div>
              <div className="text-yellow-700">
                価格・重量・条件タグなどの「裸の数値事実」だけを抽出し、独自の列構成に再整形したものです。元ページの文章・表レイアウト・画像は転載しません。
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="mb-1 font-semibold text-amber-800">近似モデル (experimental)</div>
              <div className="text-amber-700">
                community
                が観測した数値事実と、このサイト独自の近似仮定を組み合わせて計算しています。ゲーム内部の公式計算式は確認されていないため、結果は参考近似値です。
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
                根拠が弱すぎる内部式。近似パラメータ化もできず、計算から除外しています。
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
            <li>• Rod / Line / Bobber / Enchant の stat 合算</li>
            <li>• 条件付き Enchant の active / inactive 判定</li>
            <li>• rarity tier ごとの既定相対重み</li>
            <li>• Money Maker / Pocket Watcher / Double Up!! の直接期待値補正</li>
            <li>• gear を含む modeled price ベースの期待値計算</li>
            <li>• observed / estimated の時間モデルを含む時間あたり収益推定</li>
            <li>
              • <span className="rounded bg-amber-100 px-1 text-amber-800">experimental</span>{' '}
              外見・サイズ modifier の期待値補正（デフォルト有効、無効化可）: 23 種外見 modifier +
              Huge/Tiny サイズ modifier の community 近似モデル。確率（外見のみ 7.5% / サイズのみ
              10% / 両方 5%）は Snerx community sheet 観測値。
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Modifier データ — 出典と分類</h2>
        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed">
          <p className="text-amber-800">
            計算機の「Modifier assumptions」で設定できる外見・サイズ modifier
            の期待値モデルは、コミュニティリバースエンジニアリングデータに基づきます。ライセンスが不明なため、modifier
            の名称リストや表現的コンテンツは転載せず、裸の数値事実のみを抽出（fact-only）しています。
          </p>

          <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
            <div className="rounded-lg border border-amber-300 bg-white p-3">
              <div className="mb-1 font-semibold text-amber-800">
                Snerx community sheet 観測値（fact-only / experimental）
              </div>
              <ul className="space-y-1 text-amber-700">
                <li>
                  • <strong>P(any modifier) ≈ 22.5%</strong>: 釣れた魚のうち何らかの modifier
                  が付く割合（total base mutation chance）
                </li>
                <li>
                  • <strong>P(外見のみ) ≈ 7.5%</strong>: 外見 modifier のみが単独でスポーンする割合
                </li>
                <li>
                  • <strong>P(サイズのみ) ≈ 10%</strong>: サイズ modifier
                  のみが単独でスポーンする割合
                </li>
                <li>
                  • <strong>P(both) ≈ 5%</strong>: 外見とサイズの両方が同時に付く割合
                </li>
                <li>• 外見 modifier 種数: 23 種</li>
                <li>• 外見平均倍率 ≈ 2.404x（各種等確率での平均）</li>
                <li>• Huge ×1.5, Tiny ×1.0</li>
              </ul>
            </div>
            <div className="rounded-lg border border-orange-300 bg-white p-3">
              <div className="mb-1 font-semibold text-orange-800">残る独立仮定</div>
              <ul className="space-y-1 text-orange-700">
                <li>• 外見 modifier 各種の選択確率 → 等確率を仮定</li>
                <li>• Huge / Tiny 選択確率 → 50/50 を仮定</li>
              </ul>
              <div className="mb-1 mt-3 font-semibold text-blue-800">ユーザー方針（計算設定）</div>
              <ul className="space-y-1 text-blue-700">
                <li>
                  • <strong>Cursed → Blessed 変換</strong>: ON/OFF
                  をユーザーが選択。このサイトは変換コスト・移動時間を 0
                  とモデル化しており、コスト面の不確実性は除外している。不確実性はあくまで upstream
                  の modifier 確率データの精度に限られる。
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-amber-300 bg-white p-3 text-xs text-amber-800">
            <div className="mb-1 font-semibold">「外見のみ / サイズのみ」の確率について</div>
            <p className="text-amber-700">
              Snerx community sheet には外見のみ（7.5%）、サイズのみ（10%）、両方（5%）の個別確率が
              明示されています。これらは community
              観測値（fact-only）として扱い、計算に使用しています。
              ただしゲーム内部式の確認はされていないため、数値は「参考近似値」です。
            </p>
            <ul className="mt-1 space-y-0.5 text-amber-700">
              <li>
                ‣ <em>外見のみ</em>: 魚に外見 modifier だけが付くケース（サイズ変化なし）
              </li>
              <li>
                ‣ <em>サイズのみ</em>: 魚にサイズ
                modifier（Huge/Tiny）だけが付くケース（外見変化なし）
              </li>
            </ul>
          </div>

          <p className="text-xs text-amber-700">
            外見・サイズ各種の選択確率などの独立仮定を含むため、計算機の期待値は「参考近似値」として扱ってください。
          </p>
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
              • <strong>Luck の正確な内部式</strong>: 現在は gear 合計 Luck を高 rarity tier
              に寄せる multiplier へ変換する近似です。
            </li>
            <li>
              • <strong>Big Catch Rate</strong>: 現在は expected weight percentile
              への近似変換です。
            </li>
            <li>
              • <strong>Attraction Rate / Strength / Expertise</strong>: estimated mode では bite
              wait / minigame time / miss rate への近似変換です。
            </li>
            <li>
              • <strong>重量から売値への厳密曲線</strong>: 現在は weight percentile と Max Weight
              cap を使う線形近似です。
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
