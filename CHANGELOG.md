# Changelog

All notable changes to this project are documented here.

## [Unreleased]

## [0.5.0] - 2026-03-09

### Changed

- **Full-build optimizer is now exact exhaustive search**: Replaced the two-phase top-K pruned optimizer with a complete enumeration of all rod × line × bobber × enchant combinations (15 × 8 × 8 × 43 = 41,280). All combinations are evaluated; no pruning or candidates excluded. Benchmarked at ~194 ms in Node, well within browser budget.
- **Removed `topKPerSlot` from optimizer API**: `optimizeFullBuild` no longer accepts a `topKPerSlot` parameter; `FullBuildOptimizerResult` no longer exposes `topKPerSlot`. `searchedCount` now always equals `totalCombinationSpace`.
- **Updated optimizer UI wording**: Subtitle and warning banner now accurately state full exhaustive search and confirm no equipment is excluded.
- **Updated optimizer tests**: Tests now validate exact exhaustive search behavior (`searchedCount === totalCombinationSpace`) and remove pruning-specific assertions.
- **Non-blocking optimizer**: `optimizeFullBuildAsync` added to `ranking.ts`; `OptimizerView` now uses it with a loading state so the main thread is not blocked during the ~194 ms exhaustive search. Exact search semantics preserved.
- **Optimizer combination count derived, not hardcoded**: `OptimizerView` fallback display count is now computed from the actual equipment arrays (`RODS.length × LINES.length × BOBBERS.length × ENCHANTS.length`) so it stays in sync automatically.
- **Fix `decodeUrlStateWithReason` `vundefined` message**: Payloads that lack a `v` field no longer produce the misleading `"vundefined"` failure reason; they fall through to the generic structural-validation message instead.
- **URL restore error banner clears on non-share navigation**: The error banner is now dismissed when the hash changes to a URL that contains no `b=` share parameter, not only on successful restore.

## [0.4.0] - 2026-03-09

### Added

- **Multi-build support**: Create, manage, and compare arbitrary numbers of builds simultaneously using tabbed interface (`BuildTabs`). Builds persist across sessions via URL hash state.
- **Build comparison table** (`ComparisonSummary`): Side-by-side table showing expected value per catch, per hour, and catch probability across multiple builds for efficient gear optimization.
- **Per-slot ranking view** (`RankingView`): Ranked lists of top-5 gear items for each equipment slot (Rod, Line, Bobber, Enchant) based on EV/hour and EV/catch in the current area/condition context. Highlights current selection and best option.
- **URL share and restore**: Full calculator state (all builds, active build, parameters) encoded in `window.location.hash` for easy sharing and recovery. `"🔗 URL をコピー"` button copies shareable URL. Automatic state restoration on navigation.
- **Modifier-aware EV calculations**: Integrated fish appearance and size modifiers (Huge / Tiny / 23 appearance variants) into expected value calculations with experimental community-derived multiplier model. `ModifierAssumptions` panel allows toggling `includeModifiers` and `assumeCursedToBlessed` conversion policy.
- **Modifier data integration** (`src/data/modifiers.ts`): Documented modifier probabilities, multipliers, and source classification (community observation vs. independent approximation).

### Changed

- **Calculator UI workflow**: Restructured to multi-build-centric flow with inline build management, comparison summary, and ranking view as first-class features.
- **URL state encoding** (`src/lib/url-state.ts`): Implements versioned JSON-to-base64url encoding with strict validation; supports build operations (create, duplicate, rename, remove, update params).
- **ParameterForm layout**: Added `Modifier assumptions` section with toggles for modifier inclusion and Cursed→Blessed policy.
- Updated README with multi-build workflow guide, URL share explanation, ranking view documentation, and modifier assumptions description.
- Updated `/calculator` page intro step-by-step guidance to reflect new comparison workflow.

## [0.3.0] - 2026-03-08

### Added

- Equipment-aware calculator inputs: `Rod`, `Line`, `Bobber`, `Enchant`, active/inactive enchant handling, total stat summary, and derived model summary.
- Public Fandom gear dataset integration for rods, rod accessories, and enchantments.
- Supported direct value effects for `Money Maker`, `Pocket Watcher`, and `Double Up!!`.
- `Observed values` and `Estimated from equipment` time models with explicit supported / experimental labeling in the UI.

### Changed

- Replaced the old manual `Luck` approximation input with gear-driven stat aggregation.
- Expanded the calculator model to reflect `Luck`, `Strength`, `Expertise`, `Attraction`, `Big Catch`, and `Max Weight` through documented approximation layers.
- Reworked calculator guidance, sources page, README, and E2E coverage so the site explains the equipment-aware model directly in-product.
- Rewrote calculator unit tests around loadout stats, conditional enchant activation, direct value effects, and observed/estimated timing modes.

## [0.2.0] - 2026-03-08

### Added

- SEO baseline for public Pages deployment: `metadataBase`, Open Graph, Twitter metadata, `sitemap.xml`, and `robots.txt`.

### Changed (tooling/dependency updates)

- **React 18 → 19** (`react`, `react-dom`, `@types/react`, `@types/react-dom`): upgraded to React 19.2.x. Existing calculator UI, tests, and Next.js 16 build remain compatible with no app-code changes.
- **jsdom 26 → 28**: upgraded to `28.1.0`. This raises the effective Node runtime floor for test tooling to `20.19.0 / 22.12.0 / 24.0.0`, so the repo `engines.node` field and CI matrix now validate those exact runtime targets.
- **Next.js 15 → 16** (`next`, `eslint-config-next`): upgraded to Next.js 16.1.6. Static export, `basePath`, and `assetPrefix` config remain unchanged; GitHub Pages deployment unaffected.
- **ESLint 8 → 9** + **flat config migration**: deleted `.eslintrc.json`; new `eslint.config.mjs` uses `eslint-config-next/core-web-vitals` native flat-config export. The `--ext` and `--ignore-pattern` CLI flags (removed in ESLint 9) moved into the config file.
- **Tailwind CSS 3 → 4** (`tailwindcss`, `@tailwindcss/postcss`): migrated from `tailwind.config.js` + `@tailwind` directives to CSS-based config. Custom `ocean-*` palette now declared via `@theme` in `globals.css`. `autoprefixer` removed (built into Tailwind v4 via Lightning CSS).
- **recharts 2 → 3**: upgraded to 3.8.0. Updated `Tooltip` `formatter` callbacks to handle the new `ValueType | undefined` parameter type.
- **@types/node**: intentionally kept on the latest `20.x` line rather than moving to `25.x`, because this repo still supports Node 20 runtimes and should not typecheck against APIs that only exist on newer Node majors.
- **lint-staged 15 → 16**: major bump with no config or API changes.
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
