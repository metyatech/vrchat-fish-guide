import type { Metadata } from 'next';
import React from 'react';
import { SourceCard } from '@/components/Sources/SourceCard';
import { BOBBERS, ENCHANTS, LINES, RODS } from '@/data/equipment';
import { FISH_DATA, FISHING_AREAS } from '@/data/fish';
import { SOURCE_AUDIT } from '@/data/sourceAudit';
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

const dateTimeFormatter = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Tokyo',
});

const formulaStatusBadge: Record<
  'published' | 'qualitative-only' | 'not-found',
  { label: string; className: string }
> = {
  published: { label: '公開数値あり', className: 'border-green-200 bg-green-50 text-green-700' },
  'qualitative-only': {
    label: '説明のみ',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  'not-found': { label: '未確認', className: 'border-gray-200 bg-gray-50 text-gray-600' },
};

export default function SourcesPage() {
  const checkedAtLabel = dateTimeFormatter.format(new Date(SOURCE_AUDIT.checkedAt));
  const revisionMap = new Map(SOURCE_AUDIT.revisions.map((revision) => [revision.id, revision]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📚 出典・免責事項</h1>
        <p className="mt-1 text-sm text-gray-500">
          このサイトで使っているデータの出どころと、どこまで正確に計算できているかをまとめています。
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">最新の確認状況</h2>
        <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50 p-6 text-sm leading-relaxed text-sky-900">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
              最終確認: {checkedAtLabel}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
              魚データ差分: {SOURCE_AUDIT.summary.modeledDiffCount} 件
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
              装備データ差分: {SOURCE_AUDIT.summary.equipmentDiffCount} 件
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-sky-200 bg-white p-3">
              <div className="mb-1 font-semibold text-sky-800">計算機に入っている魚</div>
              <div className="text-2xl font-bold text-sky-900">
                {SOURCE_AUDIT.summary.modeledFishCount}
              </div>
              <div className="text-sky-700">現在の Fish データ</div>
            </div>
            <div className="rounded-lg border border-sky-200 bg-white p-3">
              <div className="mb-1 font-semibold text-sky-800">公開ソースで確認できた魚</div>
              <div className="text-2xl font-bold text-sky-900">
                {SOURCE_AUDIT.summary.publicFishCount}
              </div>
              <div className="text-sky-700">Fandom + Snerx の数値行</div>
            </div>
            <div className="rounded-lg border border-sky-200 bg-white p-3">
              <div className="mb-1 font-semibold text-sky-800">未追加の通常魚</div>
              <div className="text-2xl font-bold text-sky-900">
                {SOURCE_AUDIT.summary.inScopeButUnmodeledCount}
              </div>
              <div className="text-sky-700">今の計算機範囲で不足している行</div>
            </div>
            <div className="rounded-lg border border-sky-200 bg-white p-3">
              <div className="mb-1 font-semibold text-sky-800">モデル外の公開行</div>
              <div className="text-2xl font-bold text-sky-900">
                {SOURCE_AUDIT.summary.outsideCalculatorScopeCount}
              </div>
              <div className="text-sky-700">Secret など現在の対象外</div>
            </div>
          </div>

          <p className="text-xs text-sky-700">
            この確認は `npm run sources:refresh` で更新し、公開ソースの最終 revision とローカルの
            fact-only データ差分をまとめています。
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">このサイトのデータの扱い方</h2>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 text-sm leading-relaxed text-gray-700">
          <p>
            このサイトでは、{FISHING_AREAS.length} エリア / {FISH_DATA.length} 魚種 / {RODS.length}{' '}
            Rod / {LINES.length} Line / {BOBBERS.length} Bobber / {ENCHANTS.length - 1} Enchant
            のデータを扱います。ページ本文や表レイアウトを転載せず、必要な事実値のみを独自のデータ構造に正規化しています。
          </p>
          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div className="mb-1 font-semibold text-yellow-800">数値だけ使う</div>
              <div className="text-yellow-700">
                価格・重さ・条件のような数値事実だけを使います。元ページの文章・表の見た目・画像はそのまま持ち込みません。
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="mb-1 font-semibold text-amber-800">まだ推定の部分</div>
              <div className="text-amber-700">
                コミュニティの観測値と、このサイトの近似を組み合わせて計算しています。ゲーム内部の正確式が確認できていないため、結果は参考値です。
              </div>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="mb-1 font-semibold text-orange-800">参考だけに使う</div>
              <div className="text-orange-700">
                出どころの確認には使いますが、このサイトの計算データには直接入れません。
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="mb-1 font-semibold text-red-800">まだ計算に入れていない</div>
              <div className="text-red-700">根拠が弱すぎて、まだ計算に入れていない要素です。</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">データソース一覧</h2>
        <div className="space-y-4">
          {SOURCES.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              revision={revisionMap.get(source.id)}
              checkedAtLabel={checkedAtLabel}
            />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">公開ソースとの差分確認</h2>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 text-sm leading-relaxed text-gray-700">
          {SOURCE_AUDIT.summary.modeledDiffCount === 0 &&
          SOURCE_AUDIT.summary.equipmentDiffCount === 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
              現在の fact-only データでは、公開ソースとの差分は見つかっていません。
            </div>
          ) : (
            <div className="space-y-3">
              {SOURCE_AUDIT.modeledDiffs.length > 0 && (
                <div>
                  <div className="mb-2 font-semibold text-gray-900">魚データ差分</div>
                  <ul className="space-y-2 text-xs">
                    {SOURCE_AUDIT.modeledDiffs.map((diff) => (
                      <li
                        key={`${diff.category}-${diff.name}-${diff.field}`}
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800"
                      >
                        <strong>{diff.name}</strong>: {diff.field} が {String(diff.localValue)} →{' '}
                        {String(diff.sourceValue)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {SOURCE_AUDIT.equipmentDiffs.length > 0 && (
                <div>
                  <div className="mb-2 font-semibold text-gray-900">装備データ差分</div>
                  <ul className="space-y-2 text-xs">
                    {SOURCE_AUDIT.equipmentDiffs.map((diff) => (
                      <li
                        key={`${diff.category}-${diff.name}-${diff.field}`}
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800"
                      >
                        <strong>{diff.name}</strong>: {diff.field} が {String(diff.localValue)} →{' '}
                        {String(diff.sourceValue)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 font-semibold text-gray-900">今の計算機に入っていない通常魚</div>
              {SOURCE_AUDIT.inScopeButUnmodeled.length === 0 ? (
                <p className="text-xs text-gray-600">現時点では見つかっていません。</p>
              ) : (
                <ul className="space-y-2 text-xs text-gray-700">
                  {SOURCE_AUDIT.inScopeButUnmodeled.map((gap) => (
                    <li
                      key={gap.name}
                      className="rounded-md border border-amber-200 bg-amber-50 p-3"
                    >
                      <strong>{gap.name}</strong>
                      {gap.rarity ? ` (${gap.rarity})` : ''}
                      <div className="mt-1 text-amber-700">{gap.reason}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-2 font-semibold text-gray-900">公開されているが現在のモデル外</div>
              {SOURCE_AUDIT.outsideCalculatorScope.length === 0 ? (
                <p className="text-xs text-gray-600">現時点では見つかっていません。</p>
              ) : (
                <ul className="space-y-2 text-xs text-gray-700">
                  {SOURCE_AUDIT.outsideCalculatorScope.map((gap) => (
                    <li key={gap.name} className="rounded-md border border-slate-200 bg-white p-3">
                      <strong>{gap.name}</strong>
                      {gap.rarity ? ` (${gap.rarity})` : ''}
                      <div className="mt-1 text-gray-600">{gap.reason}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          公開ソースでどこまで裏付けられているか
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SOURCE_AUDIT.formulaEvidence.map((item) => {
            const badge = formulaStatusBadge[item.status];
            return (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{item.label}</h3>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{item.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">現在の対応範囲</h2>
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-sm leading-relaxed text-green-800">
          <ul className="space-y-2">
            <li>• エリアごとの魚候補</li>
            <li>• 時間帯タグ / 天候タグによる対象魚の絞り込み</li>
            <li>• Rod / Line / Bobber / Enchant のステータス合算</li>
            <li>• 条件付き Enchant の有効 / 無効判定</li>
            <li>• レア度ごとの出やすさの基準値</li>
            <li>• Money Maker / Pocket Watcher / Double Up!! の直接期待値補正</li>
            <li>• 装備を含む推定売値ベースの期待値計算</li>
            <li>• 装備ステータスから自動見積もりした時間あたり収益推定</li>
            <li>
              • <span className="rounded bg-amber-100 px-1 text-amber-800">まだ推定</span>{' '}
              見た目・サイズの追加効果を期待値へ反映（デフォルト有効、無効化可）
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">見た目・サイズ補正の出どころ</h2>
        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed">
          <p className="text-amber-800">
            計算機の「見た目・サイズ補正」で使っている値は、コミュニティの解析・観測データに基づきます。ライセンスが不明なため、名前一覧や表の見た目は転載せず、数値事実だけを使っています。
          </p>

          <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
            <div className="rounded-lg border border-amber-300 bg-white p-3">
              <div className="mb-1 font-semibold text-amber-800">
                Snerx community sheet の観測値
              </div>
              <ul className="space-y-1 text-amber-700">
                <li>
                  • <strong>何らかの追加効果が付く割合 ≈ 22.5%</strong>
                </li>
                <li>
                  • <strong>見た目だけ ≈ 7.5%</strong>
                </li>
                <li>
                  • <strong>サイズだけ ≈ 10%</strong>
                </li>
                <li>
                  • <strong>見た目とサイズの両方 ≈ 5%</strong>
                </li>
                <li>• 見た目の追加効果: 23 種</li>
                <li>• 外見平均倍率 ≈ 2.404x（各種等確率での平均）</li>
                <li>• Huge ×1.5, Tiny ×1.0</li>
              </ul>
            </div>
            <div className="rounded-lg border border-orange-300 bg-white p-3">
              <div className="mb-1 font-semibold text-orange-800">まだ仮定している点</div>
              <ul className="space-y-1 text-orange-700">
                <li>• 見た目の追加効果ごとの出やすさ → すべて同じと仮定</li>
                <li>• Huge / Tiny 選択確率 → 50/50 を仮定</li>
              </ul>
              <div className="mb-1 mt-3 font-semibold text-blue-800">ユーザーが選べる設定</div>
              <ul className="space-y-1 text-blue-700">
                <li>
                  • <strong>Cursed → Blessed 変換</strong>: ON/OFF
                  を選べます。このサイトでは変換コスト・移動時間を 0 として扱います。
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-amber-300 bg-white p-3 text-xs text-amber-800">
            <div className="mb-1 font-semibold">「見た目だけ / サイズだけ」の確率について</div>
            <p className="text-amber-700">
              Snerx community sheet
              には、見た目だけ（7.5%）、サイズだけ（10%）、両方（5%）の個別確率が明示されています。これを観測値として計算に使っています。ただしゲーム内部の正確式は確認されていないため、参考値です。
            </p>
            <ul className="mt-1 space-y-0.5 text-amber-700">
              <li>
                ‣ <em>見た目だけ</em>: 見た目の追加効果だけが付くケース
              </li>
              <li>
                ‣ <em>サイズだけ</em>: Huge/Tiny だけが付くケース
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
            以下は根拠が弱いか、まだ十分に確認できていないため、主計算にそのままは入れていません。
          </p>
          <ul className="space-y-2 text-red-700">
            <li>
              • <strong>Luck の正確な内部式</strong>: 現在は装備の合計 Luck
              を、高レア寄りにする補正として近似しています。
            </li>
            <li>
              • <strong>Big Catch Rate</strong>: 現在は「重い魚が出やすくなる」方向の近似です。
            </li>
            <li>
              • <strong>Attraction Rate / Strength / Expertise</strong>:
              現在は、魚が掛かるまでの時間・ミニゲーム時間・逃がす割合への近似です。
            </li>
            <li>
              • <strong>重さから売値への正確な曲線</strong>:
              現在は、重さを上に寄せる近似で計算しています。
            </li>
            <li>
              • <strong>Secret / Ultimate Secret / Relic などの特殊行</strong>:
              公開ソースに名前や一部確率が出ている行はありますが、今の計算機では通常魚の最適化に集中するためモデル外にしています。
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
