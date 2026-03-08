# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- SEO baseline for public Pages deployment: `metadataBase`, Open Graph, Twitter metadata, `sitemap.xml`, and `robots.txt`.

### Changed (tooling/dependency updates)

- **React 18 → 19** (`react`, `react-dom`, `@types/react`, `@types/react-dom`): upgraded to React 19.2.x. Existing calculator UI, tests, and Next.js 16 build remain compatible with no app-code changes.
- **Next.js 15 → 16** (`next`, `eslint-config-next`): upgraded to Next.js 16.1.6. Static export, `basePath`, and `assetPrefix` config remain unchanged; GitHub Pages deployment unaffected.
- **ESLint 8 → 9** + **flat config migration**: deleted `.eslintrc.json`; new `eslint.config.mjs` uses `eslint-config-next/core-web-vitals` native flat-config export. The `--ext` and `--ignore-pattern` CLI flags (removed in ESLint 9) moved into the config file.
- **Tailwind CSS 3 → 4** (`tailwindcss`, `@tailwindcss/postcss`): migrated from `tailwind.config.js` + `@tailwind` directives to CSS-based config. Custom `ocean-*` palette now declared via `@theme` in `globals.css`. `autoprefixer` removed (built into Tailwind v4 via Lightning CSS).
- **recharts 2 → 3**: upgraded to 3.8.0. Updated `Tooltip` `formatter` callbacks to handle the new `ValueType | undefined` parameter type.
- **jsdom 25 → 26**, **lint-staged 15 → 16**: minor major bumps with no config or API changes.
- **GitHub Actions**: `actions/checkout` v4 → v5 across all workflows; `github/codeql-action/init` and `analyze` v3 → v4 (v3 deprecated).

### Changed

- Expanded the calculator dataset from a small placeholder pool to 6 named areas and 100+ fish entries sourced from public community indexes.
- Switched the calculator model to area/time/weather filtering plus rarity-tier weighting, with sell-price range midpoint used for expected value.
- Updated calculator UI, table, and chart to show filter conditions, price ranges, and weight ranges from the normalized dataset.
- Rewrote unit tests and Playwright smoke coverage to match the new calculator model and live source set.
- Updated source documentation and README to explain the current provenance split and unsupported mechanics more precisely.

## [0.1.0] - 2026-03-08

### Added

- Initial repository scaffold: Next.js 15 static export, TypeScript strict, Tailwind CSS, Recharts.
- `src/types/index.ts` — core TypeScript interfaces (`FishEntry`, `FishingArea`, `CalculatorParams`, `DistributionResult`, `DataSource`).
- `src/data/fish.ts` — fact-only fish and area data (community-sourced, clearly marked).
- `src/data/sources.ts` — source governance registry with `sourceStatus` and `reuseMode` classification.
- `src/lib/calculator.ts` — probability distribution calculator: `getFishPool`, `applyLuckScaling`, `calculateDistribution`, `formatCurrency`, `getDefaultParams`.
- `src/lib/distributions.ts` — statistical helpers: `mean`, `variance`, `stddev`, `buildHistogram`.
- `src/app/layout.tsx` — root layout with Header and Footer.
- `src/app/page.tsx` — home page with feature cards and data disclaimer.
- `src/app/calculator/page.tsx` — probability/revenue calculator page with parameter form, charts, and result table.
- `src/app/sources/page.tsx` — data governance and disclaimer page.
- `src/components/AdSlot.tsx` — ad slot abstraction with placeholder UI; no ad network integrated.
- `src/components/Layout/` — `Header`, `Footer`, `Sidebar` components.
- `src/components/Calculator/` — `ParameterForm`, `DistributionChart`, `ResultTable`, `WarningBanner`.
- `src/components/Sources/SourceCard.tsx` — source metadata card.
- `src/test/calculator.test.ts` — unit tests for calculator logic.
- `src/test/distributions.test.ts` — unit tests for statistical helpers.
- `.github/workflows/ci.yml` — GitHub Actions CI: format check, lint, typecheck, test, build.
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment after passing full verification.
- `.github/workflows/codeql.yml` / `.github/workflows/security.yml` — static analysis and security scanning workflows.
- Husky pre-commit hook: lint-staged runs ESLint + Prettier on staged files.
- `README.md`, `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`.

### Changed

- Upgraded `next` and `eslint-config-next` to `15.5.12` to clear published security advisories before release.
- Upgraded `vitest`, `@vitest/coverage-v8`, and `@vitejs/plugin-react` to current secure releases.
- Updated `tsconfig.json` to match Next.js 15 recommendations.
- Split GitHub Pages build detection to `DEPLOY_TARGET=github-pages` so CI verification and Pages deployment no longer conflict.
