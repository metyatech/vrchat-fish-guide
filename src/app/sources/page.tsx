import React from 'react';
import { SOURCES } from '@/data/sources';
import { SourceCard } from '@/components/Sources/SourceCard';

export default function SourcesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📚 出典・免責事項</h1>
        <p className="text-sm text-gray-500 mt-1">
          このサイトで使用するデータの出典、ライセンス状況、および計算の限界について説明しています。
        </p>
      </div>

      {/* Data governance */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">データ・ガバナンスポリシー</h2>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>このサイトでは、各データソースを以下の分類で管理しています。</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="font-semibold text-yellow-800 mb-1">数値のみ抽出 (fact-only)</div>
              <div className="text-yellow-700">
                価格・重量などの数値のみを抽出。表現的コンテンツは一切複製しません。
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="font-semibold text-orange-800 mb-1">
                直接不使用 (not-used-directly)
              </div>
              <div className="text-orange-700">参照はするが、計算には使用しないソース。</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="font-semibold text-red-800 mb-1">非サポート (unsupported)</div>
              <div className="text-red-700">
                検証不能な計算式。計算機には組み込まず、ユーザー設定項目として提供。
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sources list */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">データソース一覧</h2>
        <div className="space-y-4">
          {SOURCES.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      </section>

      {/* Unsupported mechanics */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">非サポートメカニクス</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm leading-relaxed">
          <p className="text-red-800 mb-3">
            以下のゲームメカニクスは、内部計算式が非公開またはコミュニティによる逆解析に基づくため、
            このサイトの計算機には組み込んでいません。
          </p>
          <ul className="space-y-2 text-red-700">
            <li>
              • <strong>ラック（Luck）</strong>:
              内部計算式はコミュニティ報告のみで検証不能。計算機では簡略化モデルをユーザー入力として提供。
            </li>
            <li>
              • <strong>Big Catch</strong>: 発動条件・効果の詳細が不明。計算機には含みません。
            </li>
            <li>
              • <strong>アトラクションシステム</strong>: 内部詳細不明。計算機には含みません。
            </li>
            <li>
              • <strong>重量ボーナス価格計算</strong>: 計算式が未検証のため除外。基本価格のみ使用。
            </li>
            <li>
              • <strong>時間帯・季節効果</strong>: 安全なソースからのデータが不足のため除外。
            </li>
          </ul>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">免責事項</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-sm text-gray-700 leading-relaxed space-y-3">
          <p>
            このサイトは VRChat Fish!
            の非公式コミュニティサイトです。ゲーム開発者・運営会社とは一切無関係です。
          </p>
          <p>
            掲載しているデータはコミュニティ報告・個人計測に基づく推定値であり、正確性を保証するものではありません。
            ゲームのアップデートにより情報が古くなる可能性があります。
          </p>
          <p>
            計算結果は参考情報です。実際のゲームプレイにおける収益・確率は異なる場合があります。
          </p>
        </div>
      </section>

      {/* Ad policy */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">広告ポリシー</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-sm text-blue-800 leading-relaxed space-y-2">
          <p>このサイトは将来的にサイト維持費用のための広告を掲載する予定があります。</p>
          <ul className="space-y-1 text-blue-700">
            <li>• 広告はすべて「広告」として明示的に表示します</li>
            <li>• 広告コンテンツとサイトコンテンツを明確に区別します</li>
            <li>• 広告掲載開始時には本ページで告知します</li>
            <li>• ユーザー体験を著しく損なう広告フォーマットは採用しません</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
