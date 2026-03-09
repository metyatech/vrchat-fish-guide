# VRChat Fish! ガイド

VRChat ワールド `Fish!` 向けの非公式コミュニティサイトです。  
現時点では、主要 6 エリア・100 種超の魚データと gear data をもとにした equipment-aware 確率・収益計算機と、データ出典ポリシーの明示を提供します。

## 概要

- 1回あたりの釣果価値分布を可視化
- 単位時間あたりの期待収益を可視化
- Rod / Line / Bobber / Enchant の stat を合算
- エリア、時間帯、天候タグで対象魚を絞り込み
- observed / estimated の 2 つの時間モデルを搭載
- 複数ビルドの比較（arbitrary count）を同時サポート
- ビルド比較テーブルで期待値/時間の効率を横並び確認
- URL 保存・復元機能でビルド構成をシェア可能
- 装備スロット別ランキング表示（Rod / Line / Bobber / Enchant 各スロットの EV トップランキング）
- フルビルド最適化（全 41,280 通りの完全網羅探索で EV/時間 上位ビルドを提示）
- 魚のサイズ・外見 modifier を考慮した EV 補正（experimental）
- Big Catch / Max Weight を price model に近似反映
- データソースを `Source` / `Cross-check` / `Not used directly` の考え方で管理
- 将来の広告掲載に備えた `AdSlot` 抽象化を用意
- 実ブラウザ相当の Playwright E2E スモークテストを同梱
- 内部式が裏付けられないメカニクスは近似または未対応として明示

## 対応環境

- Node.js
  - 20.19.0 以上の 20 系
  - 22.12.0 以上の 22 系
  - 24.0.0 以上
- npm 10 以上
- 静的ホスティング環境
  - 生成物は `out/` に出力されます

## セットアップ

```bash
npm install
```

`compose-agentsmd` を使う開発フローを前提にしています。  
repo ルールを再生成する場合:

```bash
compose-agentsmd
```

E2E をローカルで初回実行する際は、Chromium が自動インストールされます。

## ローカル開発

開発サーバーを起動:

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いて確認します。

## 主要ページ

- `/`
  - トップページ
- `/calculator`
  - 確率・収益計算機（ビルド比較、ランキング、モディファイア統合）
- `/sources`
  - 出典、ライセンス状況、非対応メカニクス、広告ポリシー

## 主要機能

### ビルド管理と比較

- **複数ビルド対応**: 任意数のビルドを同時に作成・管理でき、タブで切り替えながら異なる装備構成を比較できます。
- **ビルド操作**: ダブルクリック・✏ で名前変更、⧉ で複製、✕ で削除。
- **URL シェア**: 「🔗 URL をコピー」で現在のビルド構成（複数ビルド含む）を URL に保存。この URL を友人と共有したり、後で復元できます。

### ビルド比較テーブル

- 複数ビルドを作成すると、下部に「ビルド比較」テーブルが表示されます。
- 各ビルドの「期待値/時間」「期待値/回」「釣獲率」を横並びで確認でき、周回効率の改善を判定できます。

### スロット別ランキング

- Rod / Line / Bobber / Enchant 各スロットについて、現在のエリア・条件下での**トップ 5 装備**をランキング表示します。
- 各装備の EV/時間、EV/回、現在選択中の装備はハイライト表示されます。
- 「ベスト」マーク付きの装備を試すことで、周回効率向上の機会を発見できます。

### フルビルド最適化（Experimental）

- 「フルビルド最適化」パネルを展開すると、全装備の組み合わせ（15 × 8 × 8 × 43 = **41,280 通り全て**）を完全に評価して EV/時間 上位ビルドを一覧表示します。
- 上位 K 候補への枝刈りなし。除外された装備はありません。
- Luck スケーリング・時間モデル・Big Catch weight percentile などの experimental 近似モデルを前提とした推定値です。

### モディファイア対応（Experimental）

- 魚のサイズ（Huge / Tiny）・外見（appearance modifier）を考慮した EV 補正が利用できます。
- 左側「Modifier assumptions」パネルで以下が設定できます：
  - `Include modifiers in EV`: モディファイア EV 因子を反映するか
  - `Assume Cursed→Blessed conversion`: Cursed modifier を Blessed に変換したと仮定するか（コスト無し）
- モディファイアのランク確度はまだ community observation ベースです。

## 使い方

### ビルド構築と比較（推奨ワークフロー）

1. **エリアと条件を統一**: `確率計算機` ページを開き、Fishing Area、Time of Day、Weather を実際の狙い条件に合わせます。ここは全ビルド共通の軸になります。

2. **ベース loadout を設定**: 現在装備している Rod / Line / Bobber / Enchant を選択します。`Observed values` に実測値を入力すると最も正確です。

3. **複数ビルドを比較**: 「+ 追加」または「複製」でビルドを増やし、1 スロットずつ異なる装備を試します。各ビルドの「期待値/時間」と「期待値/回」を「ビルド比較」テーブルで見比べます。

4. **URL でシェア**: ページ上部の「🔗 URL をコピー」ボタンで、現在のビルド構成を URL に変換してコピーできます。この URL を友人と共有したり、別のブラウザで復元できます。

5. **前提を確認**: `Derived model` セクションで supported / experimental の範囲を確認。実測値が大きく異なる場合は、experimental な仮定が効いている可能性があります。

6. **ランキングで候補を探す**: 各スロット（Rod / Line / Bobber / Enchant）の「ランキング表示」で、そのエリア・条件下での EV トップ 5 を確認できます。「ベスト」マーク付きの装備を試してみるのも効果的です。

7. **分布とモディファイア**: グラフで 1 回あたり / 1 時間あたりの分布を確認します。左側「Modifier assumptions」で魚のサイズ・外見修飾を EV に反映させるかを選べます（experimental）。

8. `魚種別詳細` テーブルで各魚の条件、売値レンジ、重量レンジ、確率、期待値を見る

## データポリシー

このサイトは、外部ソースの表現的コンテンツを転載しません。  
使用するデータは以下の方針で管理します。

- `Source`
  - ライセンスや出典条件を確認できたソース
- `Cross-check`
  - 事実確認や数値照合にのみ用いるソース
- `Not used directly`
  - 逆解析やライセンス不明などの理由で、直接計算に使わないソース

価格・重量などの一部数値は、コミュニティ資料から**事実値のみを抽出して独自スキーマに正規化**しています。  
表現・説明文・表レイアウト・画像は再利用していません。

現在の主な出典:

- `Fish! TrickForge Studios Fandom Index`
  - エリアごとの魚プール、rarity tier、時間帯タグ、天候タグ
- `Fish! TrickForge Studios Fandom Rods / Rod Accessories / Enchantments`
  - gear stat、条件付き enchant、named special effect
- `FISH! Info by Snerx`
  - 売値レンジ、重量レンジ
- `wikiwiki.jp/fish_jp`
  - 上記 spreadsheet が上流元として言及している cross-check 対象

## 広告対応方針

現時点では広告ネットワークを統合していません。  
ただし、将来の掲載に備えてレイアウト上の広告スロットを先に用意しています。

- 広告表示時は明示的に「広告」と表示する
- サイト内容と広告枠を視覚的に分離する
- コンテンツ本文より広告都合を優先しない

## 開発コマンド

| Command                 | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Start local Next.js dev server                |
| `npm run build`         | Build static site output                      |
| `npm run start`         | Start Next.js production server               |
| `npm run lint`          | Run ESLint                                    |
| `npm run lint:fix`      | Auto-fix ESLint issues                        |
| `npm run format`        | Format files with Prettier                    |
| `npm run format:check`  | Check formatting without modifying files      |
| `npm run typecheck`     | Run TypeScript type checking                  |
| `npm run test:unit`     | Run calculator/statistics unit tests          |
| `npm run test:a11y`     | Run page-level accessibility smoke tests      |
| `npm run test:e2e`      | Run Playwright end-to-end smoke tests         |
| `npm run test`          | Run all test suites                           |
| `npm run test:watch`    | Run Vitest in watch mode                      |
| `npm run test:coverage` | Run tests with coverage output                |
| `npm run verify`        | Run format, lint, typecheck, tests, and build |

## Required configuration

- Environment variables: none
- External API keys: none
- Ad network settings: not implemented yet

## CI / 品質ゲート

GitHub Actions で以下を回します。

- `ci.yml`
  - Node `20.19.0` / `22.12.0` / `24.0.0` matrix
  - format / lint / typecheck / unit+a11y / build / Playwright E2E
- `deploy-pages.yml`
  - `Node 24` で `main` push 時に `verify` を通したうえで GitHub Pages へデプロイ
- `codeql.yml`
  - `Node 24` で JavaScript / TypeScript の CodeQL 解析
- `security.yml`
  - 依存脆弱性監査
  - secret scan

## Node runtime target policy

- `jsdom` は `28.x` を採用しています
- そのため、サポート対象の Node runtime floor は `20.19.0 / 22.12.0 / 24.0.0` です
- `@types/node` は `20.x` 系を維持しています
  - 理由: この repo は Node 20 系もサポート対象に含めており、より新しい Node 型定義を入れると、最低サポート runtime には存在しない API を型上使えてしまうためです

## バージョン方針

このリポジトリは `SemVer` を使います。

- `MAJOR`
  - 計算結果の解釈や入力パラメータ互換性を壊す変更
- `MINOR`
  - 新しい計算機能、gear / page / data field の追加
- `PATCH`
  - 既存仕様を壊さない不具合修正、文言修正、データ修正

## リリース / デプロイ

GitHub Pages への自動公開を設定しています。  
`main` ブランチへ push されると `deploy-pages.yml` が `out/` を公開します。

公開 URL:

```text
https://metyatech.github.io/vrchat-fish-guide/
```

ローカルで静的出力を確認する最小手順:

```bash
npm run verify
npm run build
```

その後、`out/` を任意の静的サーバーで配信できます。

GitHub Pages と同じ base path 付き出力をローカルで確認したい場合は、`DEPLOY_TARGET=github-pages` を設定してから `npm run build` を実行します。  
この環境変数は `deploy-pages.yml` で自動設定され、通常のローカル開発や CI では不要です。

## ドキュメント

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [LICENSE](./LICENSE)
- [AGENTS.md](./AGENTS.md)

## 免責事項

このサイトは `Fish!` の非公式ファンサイトです。  
ゲーム開発者・運営・VRChat とは無関係です。  
掲載データは公開 community source や自己計測に基づく推定値を含み、正確性を保証しません。
