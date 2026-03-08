# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- SEO baseline for public Pages deployment: `metadataBase`, Open Graph, Twitter metadata, `sitemap.xml`, and `robots.txt`.

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
