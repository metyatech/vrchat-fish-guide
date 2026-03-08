# VRChat Fish! ガイド

VRChat ワールド `Fish!` 向けの非公式コミュニティサイトです。  
現時点では、主要 6 エリア・100 種超の魚データをもとにした確率・収益計算機と、データ出典ポリシーの明示を提供します。

## 概要

- 1回あたりの釣果価値分布を可視化
- 単位時間あたりの期待収益を可視化
- エリア、時間帯、天候タグで対象魚を絞り込み
- 売値レンジ中央値ベースの期待値モデルを採用
- データソースを `Source` / `Cross-check` / `Not used directly` の考え方で管理
- 将来の広告掲載に備えた `AdSlot` 抽象化を用意
- 実ブラウザ相当の Playwright E2E スモークテストを同梱
- 内部式が裏付けられないメカニクスは近似または未対応として明示

## 対応環境

- Node.js 20 以上
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
  - 確率・収益計算機
- `/sources`
  - 出典、ライセンス状況、非対応メカニクス、広告ポリシー

## 使い方

1. `確率計算機` ページを開く
2. 釣りエリア、時間帯、天候、平均試行時間、空振り率、Luck 近似倍率などの入力値を設定する
3. `1回あたり` と `1時間あたり` を切り替えて分布を確認する
4. `魚種別詳細` テーブルで各魚の条件、売値レンジ、重量レンジ、確率、期待値を見る

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
  - format / lint / typecheck / unit+a11y / build / Playwright E2E
- `deploy-pages.yml`
  - `main` push 時に `verify` を通したうえで GitHub Pages へデプロイ
- `codeql.yml`
  - JavaScript / TypeScript の CodeQL 解析
- `security.yml`
  - 依存脆弱性監査
  - secret scan

## バージョン方針

このリポジトリは `SemVer` を使います。

- `MAJOR`
  - 計算結果の解釈や入力パラメータ互換性を壊す変更
- `MINOR`
  - 新しい計算機能、ページ、データ項目の追加
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
