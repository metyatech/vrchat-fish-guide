# VRChat Fish! ガイド

VRChat ワールド `Fish!` 向けの非公式コミュニティサイトです。  
現時点では、主要 6 エリア・100 種超の魚データをもとに、今の装備から何を変えると一番伸びるかをすぐ比べられる計算機と、データ出典ポリシーを提供します。

## 概要

- 1回あたりの釣果価値分布を可視化
- 単位時間あたりの期待収益を可視化
- Rod / Line / Bobber / Enchant のステータスを合算
- Fishing Area 自動選択と Time of Day / Weather 自動平均に対応
- 装備ステータスからプレイ速度を自動見積もりし、必要なら微調整可能
- 1 本の自然な操作フローで比較を進める UX
- 「何を比べたいか」を先に選び、次に試す候補をすぐ表示
- 複数の比較組み合わせを同時サポート
- 組み合わせ比較テーブルで期待値/時間の効率を横並び確認
- URL 保存・復元機能でビルド構成をシェア可能
- 比べたい欄ごとのおすすめ候補表示（Rod / Line / Bobber / Enchant）
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

### 組み合わせ管理と比較

- **複数比較対応**: 任意数の組み合わせを同時に作成・管理でき、切り替えながら装備構成を比較できます。
- **比較候補を追加**: 現在の装備を基準に、1 か所だけ変えた組み合わせを増やして差分を見られます。
- **組み合わせ操作**: ダブルクリック・✏ で名前変更、⧉ で複製、✕ で削除。
- **URL シェア**: 「🔗 この比較を URL で共有」で現在の比較内容を URL に保存できます。

### 使い始めやすい比較フロー

- **1 画面で完結**: beginner / expert の分岐は置かず、必要な順に入力と結果を並べています。
- **上から順に使える**: `場所と装備` → `何を比べるか` → `候補を追加` → `比較結果` → `詳しい数字` の順に並べています。
- **入力が先、結果は後**: 先に場所や装備を決めてから候補や結果を見る流れにしているため、初見でも手順を追いやすくしています。
- **次に試す候補をすぐ出す**: 比べたい対象を選ぶと、その目的に合わせた最初の候補と期待値/時間の差をすぐ提示します。
- **細かい設定は後ろへ**: `詳細調整` に推定前提やレア度上書きをまとめ、必要になるまで初期表示から退かせています。

### 組み合わせ比較テーブル

- 複数の組み合わせを作成すると、下部に比較テーブルが表示されます。
- 各組み合わせの「期待値/時間」「期待値/回」「釣獲率」を横並びで確認できます。

### 比べたい欄のおすすめ候補

- Rod / Line / Bobber / Enchant のうち、今変えたい欄だけを先に見られます。
- いまの条件で伸びやすい候補を上から順に並べ、現在の装備との差も見られます。
- まず 1 か所だけ変えて比べたいときに使います。

### 全部まとめて比べる

- 「全部まとめて比べる」を開くと、全装備の組み合わせ（15 × 8 × 8 × 43 = **41,280 通り全て**）を完全に評価して、期待値/時間の上位候補を一覧表示します。
- 上位 K 候補への枝刈りなし。除外された装備はありません。
- Luck スケーリング・時間モデル・Big Catch weight percentile などの experimental 近似モデルを前提とした推定値です。

### 見た目・サイズ補正（推定）

- 魚のサイズ（Huge / Tiny）・見た目の追加効果を考慮した補正が利用できます。
- 左側「見た目・サイズ補正」で以下が設定できます：
  - 見た目・サイズの補正を期待値に含める
  - Cursed を Blessed として扱う（コスト無し）
- モディファイアのランク確度はまだ community observation ベースです。

## 使い方

### 比べ方（推奨フロー）

1. **上から順に、現在の装備を入れる**: `確率計算機` で現在の Rod / Line / Bobber / Enchant を選びます。Fishing Area は最初は自動のままで大丈夫です。

2. **必要なら場所や条件を絞る**: Fishing Area、Time of Day、Weather は必要なときだけ固定します。初期状態では自動選択・自動平均です。

3. **次に、どこを変えて比べるか選ぶ**: `Rod / Line / Bobber / Enchant / 全部まとめて` から、いま見たい比較方法を選びます。

4. **候補を 1 件追加する**: `この候補で比べる組み合わせを追加` または候補一覧の `この候補を追加` を押します。

5. **保存した候補を並べて比べる**: 比較欄で、いま追加した候補と現在の装備を並べます。

6. **期待値/時間で判断する**: まず `期待値/時間` を見て、必要なら `期待値/回` と `魚が釣れる確率` を確認します。

7. **最後に詳しい数字を見る**: 下のグラフや魚一覧で、どの魚が期待値を押し上げているかを確認します。

8. **必要なときだけ詳細調整**: `詳細調整` を開くと、推定前提、見た目・サイズ補正、レア度上書きを調整できます。

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

| Command                 | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`           | Start local Next.js dev server                     |
| `npm run build`         | Build static site output                           |
| `npm run start`         | Serve the exported static site locally             |
| `npm run lint`          | Run ESLint                                         |
| `npm run lint:fix`      | Auto-fix ESLint issues                             |
| `npm run format`        | Format files with Prettier                         |
| `npm run format:check`  | Check formatting without modifying files           |
| `npm run typecheck`     | Run TypeScript type checking                       |
| `npm run test:unit`     | Run calculator/statistics unit tests               |
| `npm run test:a11y`     | Run page-level accessibility smoke tests           |
| `npm run test:e2e`      | Build static output and run Playwright smoke tests |
| `npm run test`          | Run all test suites                                |
| `npm run test:watch`    | Run Vitest in watch mode                           |
| `npm run test:coverage` | Run tests with coverage output                     |
| `npm run verify`        | Run format, lint, typecheck, tests, and build      |

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
