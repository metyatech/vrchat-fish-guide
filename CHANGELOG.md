# Changelog

All notable changes to this project are documented here.

## [Unreleased]

## [0.12.7] - 2026-03-10

### Changed

- **Step 1 speech-bubble chooser is now aligned to the active row instead of hanging low on the board**: the overlay anchor is positioned from the selected row inside the board content layer, so the bubble reads as coming from the row you clicked instead of drifting between rows.
- **The bubble connection was softened into a rounder row-to-overlay bridge**: the hard notch was replaced with a more organic connector so the chooser feels like it grows out of the active row instead of appearing as a detached panel edge.
- **The right-side chooser now reads more like the left loadout table**: candidate rows use the same column structure and flatter table rhythm, making it easier to compare names and stat columns without the previous card-list feel.

## [0.12.6] - 2026-03-10

### Changed

- **Step 1 now keeps the loadout board as a fixed table while the chooser opens as a right-side speech-bubble overlay**: clicking a row no longer stretches the board itself, and the candidate list now feels attached to that specific row instead of becoming a detached second layout column.
- **Desktop and mobile picker rendering were split cleanly**: desktop now uses one anchored overlay inside the board, while mobile still uses the stacked picker, which removed the duplicate-panel test ambiguity and the desktop overflow regression.
- **Visual regression baselines and row-anchor tests were refreshed** so the new row-to-overlay relationship is treated as the expected Step 1 behavior.

## [0.12.5] - 2026-03-10

### Changed

- **Step 1 now reads more like a real table instead of a row of cards**: the current loadout sits inside one shared board with one stat header row, one row rhythm, and cleaner row separation, so the four slots are easier to scan as one comparison surface.
- **The active row remains attached to the anchored picker without breaking the table feel**: the selected row still opens into the attached chooser, but the resting state now looks like one table first and an editor second.
- **Lint now ignores transient Playwright `test-results` output** so visual regression runs do not break the repo-standard verification flow when that folder is absent.

## [0.12.4] - 2026-03-10

### Changed

- **Step 1 current loadout now reads as a single stat table instead of four separate cards**: the left side uses one shared header row for `Lk / Str / Exp / Atk / BigC / MaxWt`, making Rod, Line, Bobber, and Enchant easier to compare at a glance.
- **The anchored picker flow stays intact while the left side is more table-like**: the active row still opens into the attached chooser, but the resting rows now align like one list instead of four disconnected blocks.
- **Visual regression baselines were refreshed for the table-style loadout board** so the more comparable stat layout is treated as the new expected appearance.

## [0.12.3] - 2026-03-10

### Changed

- **Step 1 now opens the picker from inside the active loadout row instead of positioning it as a detached board-level panel**: the selected row expands into a two-part editor, so the current item, the choice list, and the destination all read as one connected interaction.
- **The active row is now the only focus surface while it is open**: nested interactive conflicts were removed, the active state stays visually anchored, and the picker no longer depends on manual offset math.
- **Visual review and regression baselines were updated to the new anchored row layout**: the inventory expansion animation now grows from the left edge, and the screenshot baseline reflects the wider, row-attached picker presentation.

## [0.12.2] - 2026-03-10

### Changed

- **Step 1 now reads more like an anchored selection flow instead of two detached cards**: the active row keeps the focus inside the current-loadout board, the picker panel uses a notch aligned to that row, and the active-state callout stays inside the row instead of floating outside the board.
- **Removed the overflow-causing external callout**: the Step 1 active indicator no longer sticks out of the loadout board, so the board keeps its width without reintroducing horizontal scrolling.
- **Strengthened the wording around the source→destination relationship**: the active row now says that the choice will land in that row, while the picker panel says it is attached to the matching row on the left.

## [0.12.1] - 2026-03-10

### Changed

- **Step 1 was rebuilt around a clearer source→choice→destination flow**: the left side now stays as a readable current-loadout board, the active row itself explains that the change comes from the right, and the picker panel states that the selected item will land back in that specific row.
- **Removed the detached connector presentation that made the previous game-style redesign harder to understand**: the right picker now behaves like a row-anchored chooser instead of a separate mysterious panel in the middle of the page.
- **Strengthened automated clarity checks for Step 1**: regression tests now assert the visible relationship between the active row and the chooser panel, and the visual snapshot baseline was updated to the new layout.

## [0.12.0] - 2026-03-10

### Changed

- **Step 1 now uses a darker, game-like loadout board instead of a generic web form**: the current Rod / Line / Bobber / Enchant rows live on a HUD-style slate panel with stronger slot colors, animated selection glow, and a clearer sense of "current loadout" before you edit anything.
- **The right-side picker now behaves more like an inventory drawer**: the active slot is shown inside a darker in-panel header, the close action no longer wraps, and the left "current loadout" board and right picker feel like one connected interaction instead of two unrelated cards.
- **Slot identity is now easier to follow visually**: the active row, connector lane, slot chip, and total-stat update hint now share the same slot color so users can tell what is selected now, what they are choosing from, and where the result will apply.
- **Visual regression and layout guards were strengthened again**: automated checks now cover the redesigned loadout board for overflow and wrapping regressions, and Playwright now keeps a screenshot baseline for the Step 1 loadout board itself so large visual drift is caught before release.

## [0.11.0] - 2026-03-09

### Changed

- **Step 1 was redesigned around a single visible current-loadout table**: the current Rod / Line / Bobber / Enchant rows now stay visible as the main anchor, and the slot being edited is highlighted instead of buried inside nested cards.
- **The candidate picker now uses a compact two-column comparison layout**: users can compare names, effects, and stat badges without the wide multi-column table that previously forced clipping and horizontal scrolling.
- **The connection between left and right is now explicit in the UI**: the active slot indicator, connector lane, and picker header all reinforce which row is being edited and where the chosen item will land.
- **Automated UI quality checks now guard overflow and first-use clarity regressions**: Playwright coverage now checks the current-loadout area for horizontal overflow and verifies that the calculator remains usable on a narrow viewport.

## [0.10.7] - 2026-03-09

### Changed

- **Step 1 now starts from a single current-loadout table**: Rod, Line, Bobber, and Enchant are always visible together in one table, so users can see their current build at a glance before choosing what to change.
- **Gear picking now happens in a right-side game-like selector panel**: Clicking a row in the current-loadout table opens that slot's candidate table in a right-side panel instead of jumping the page around or expanding multiple stacked sections.
- **Removed the forced auto-scroll between loadout steps**: Choosing a Rod, Line, Bobber, or Enchant no longer scrolls the calculator to a different place automatically, which makes the selection flow easier to follow.
- **Selection feedback now goes back into the current-loadout table**: After choosing a candidate, the destination row in the current-loadout table animates and updates in place, making the change easier to track visually.
- **Regression coverage now guards the new Step 1 flow**: Component and Playwright tests now check the current-loadout table entry point, the right-side picker panel, and the absence of auto-scroll behavior.

## [0.10.6] - 2026-03-09

### Changed

- **Total stat displays no longer leak floating-point noise**: Combined equipment stats and the related explanation text now round for human-readable display, so values such as `11.999999999999996` show as `12`.
- **Added regression coverage for display precision**: Unit, component, and Playwright smoke checks now guard against long raw float strings reappearing in the total-stat area.
- **Calculator visuals were refined again without changing the step flow**: The input panels, hero area, build tabs, comparison block, and key summary cards now use richer glass/gradient surfaces and stronger hierarchy while keeping the same top-to-bottom usage order.

## [0.10.5] - 2026-03-09

### Changed

- **The calculator UI is now materially more visually modern and polished**: The page background has a subtle ocean blue gradient, section cards have stronger shadows, step numbers appear as circular ocean-blue badges throughout the form, and the "期待値/時間" summary card is visually elevated above the other metrics to draw the eye immediately to the most important number.
- **Motion is now used deliberately across all main interactive states**: Result metric cards animate when values change (slide-in from below). Gear table panels now show a rotating chevron to indicate open/close state. The active comparison tab uses a gradient background with a stronger shadow. Comparison buttons respond visually to hover and press. "この候補を追加" buttons are now styled as ocean-tinted call-to-action buttons with a shadow lift on hover. Best-result rows in the ranking view have a subtle green tint.
- **The hero header is now an ocean-gradient banner** with the page title and description inside it, making the entry point more visually anchored.
- **Step flow indicators are numbered circular badges** (1–7) placed consistently at the start of each section header, reinforcing the top-to-bottom progression without adding new steps or changing any logic.
- **Gear table rows now show a gradient green highlight when selected** and a softer ocean hover tint when not selected, making the current selection easier to spot at a glance.
- **The chart mode toggle is now a pill-selector** (white active pill on gray background) instead of two separate button variants, improving visual consistency.
- **Build tabs now have a gradient active state** (ocean gradient background, stronger shadow) and icon actions are always slightly visible instead of fully hidden until hover.

## [0.10.4] - 2026-03-09

### Changed

- **Step 1 rows are now selectable anywhere, not just on a small button**: Each Rod / Line / Bobber / Enchant row can now be clicked directly, so choosing gear feels like table selection instead of button hunting.
- **Stat contrast was corrected, including Max Weight**: The calculator now uses separate text colors for colored pills vs. white/light surfaces, which fixes the unreadable Max Weight text and keeps the stat table legible.
- **Toggle panels now open with visible motion and guidance**: Step 1 gear tables, fine-tuning controls, the calculation-notes panel, and the full-build optimizer now expand with animated transitions instead of appearing instantly, and Step 1 auto-scrolls to the next opened section.

## [0.10.3] - 2026-03-09

### Changed

- **Step 1 gear selection is now table-based and collapsible**: Rod, Line, Bobber, and Enchant now open as comparison tables with all six stats visible in columns, making it easier to scan several candidates at once without horizontal scrolling.
- **Step 1 now advances naturally from top to bottom**: Choosing one row closes the current gear decision and opens the next slot, so users can set up their current loadout in a single straight flow.
- **Regression coverage updated for the table picker flow**: Unit and Playwright smoke tests now exercise row selection and the new Step 1 structure.

## [0.10.2] - 2026-03-09

### Changed

- **Step 1 gear selection is now card-based instead of dropdown-based**: Rod, Line, Bobber, and Enchant now appear as swipeable comparison cards so users can scan names, locations/effects, and all six stats before choosing.
- **Selected gear is now easier to compare at a glance**: Each equipment card shows the same color-coded stat grid used elsewhere in the calculator, with the currently equipped item clearly marked.
- **Accessibility and E2E coverage updated for the new picker flow**: Tests now exercise card selection directly, and the calculator accessibility smoke test timeout was raised to match the larger Step 1 DOM.

## [0.10.1] - 2026-03-09

### Changed

- **Stat colors now match the in-game Fish! UI palette more closely**: Luck, Strength, Expertise, Attraction Rate, Big Catch Rate, and Max Weight now use consistent game-like colors in the calculator, based on public Fish! screenshots.
- **Selected gear now shows color-coded stat pills immediately under each picker**: After choosing a Rod, Line, Bobber, or Enchant, the current item's six main stats are shown in the same color system as the total-stat area.
- **Added regression coverage for stat-color rendering**: A new render test and Playwright smoke check now verify the calculator keeps the stat color mapping intact.

## [0.10.0] - 2026-03-09

### Changed

- **Step 4 / 5 are now a simpler one-way flow**: The calculator now separates "pick one slot to change" from "pick one candidate to add", so users no longer have to infer the intended action from a mixed recommendation panel.
- **Slot colors are now consistent across the comparison flow**: Rod, Line, Bobber, Enchant, and full-build comparison each keep the same accent color across selection, recommendation, and candidate areas, making it easier to scan what the page is talking about.
- **Candidate lists now stay focused on the selected slot**: Guided comparison mode keeps the chosen slot open without extra nested toggles, so users can move from Step 4 to Step 5 without deciding what to expand next.
- **Copy and walkthrough updated for the stricter flow**: Calculator wording, README guidance, and Playwright smoke coverage now match the new first-use order: current gear -> optional narrowing -> play-speed adjustment -> choose one slot -> add one candidate -> compare.

## [0.9.0] - 2026-03-09

### Changed

- **Calculator now starts from current gear, not area selection**: The first step now focuses on Rod / Line / Bobber / Enchant. Fishing Area moved to an optional narrowing step, with automatic best-area selection as the default.
- **Time of Day / Weather now auto-average by default**: Instead of asking users to lock changing conditions up front, the calculator now averages published Time of Day and Weather states by default and only fixes them when the user chooses to narrow conditions.
- **Play speed is now always derived from gear first**: The calculator now estimates cast time, bite wait, reaction delay, minigame time, and escape rate from equipment stats, while still letting users nudge cast time, reaction delay, and mistake tendency.
- **Step 4 and Step 5 are more direct**: Users now choose what single part to compare first, then see only the strongest candidates for that part before opening broader comparisons.
- **Plainer user-facing wording**: Replaced leftover mixed English/internal wording in the calculator with more ordinary Japanese task language, especially around automatic conditions, comparison guidance, and timing assumptions.
- **Ranking view now centers only the chosen part first**: Instead of showing every slot at once, the page shows the selected part first and keeps the other parts behind an explicit reveal, reducing first-use cognitive load.
- **Playwright now tests the exported static site**: E2E no longer depends on `next dev`; the smoke suite now builds the site and serves `out/` for more stable verification.

## [0.8.0] - 2026-03-09

### Changed

- **Calculator flow reordered to match first-use behavior**: The calculator now follows a strict top-to-bottom sequence: first enter area/loadout, then choose what to compare, then add candidate combinations, then compare saved combinations, and only after that inspect detailed result cards and tables.
- **Setup now comes before recommendations and results**: Recommendation cards, ranking tools, and comparison results were moved behind the prerequisite setup steps so the page no longer asks users to interpret outputs before they know what to input.
- **Comparison area now explains the next visible action**: The page now tells users when they still need to add a candidate before comparison results will appear, instead of showing an empty comparison section with no clear next move.
- **README and E2E updated for the new order**: Usage documentation and smoke tests now follow the same top-to-bottom flow as the product UI.

## [0.7.0] - 2026-03-09

### Changed

- **Plainer first-use copy across the site**: Rewrote home, calculator, and sources page text so first-time users can follow the comparison flow without internal labels such as "Equipment-aware", "Derived model", "Modifier assumptions", or "Full build".
- **Comparison actions are now more direct**: Ranking rows and full-combination results now let users add a candidate straight into the comparison list instead of re-entering the same loadout manually.
- **Comparison naming is simpler**: The default entry is now `現在の装備`; newly created comparisons use plain labels like `比較 2`, `X を試す`, and `全部比較のおすすめ`.
- **Sources page language simplified**: Replaced site-specific source-governance jargon with plain Japanese wording while keeping the reuse boundaries and uncertainty policy explicit.
- **Calculator warnings and explanation notes rewritten**: In-product explanation strings now use user-facing Japanese instead of internal modeling terminology.
- **README and smoke tests updated**: Documentation and E2E expectations now match the simpler wording and the one-click comparison flow.

## [0.6.0] - 2026-03-09

### Changed

- **Single-flow calculator UX**: Reworked the calculator so users stay on one natural comparison path instead of juggling a dense all-at-once form. The top of the page now asks what slot or goal to compare first and surfaces the next recommended action immediately.
- **Next recommendation card**: Added a top-level recommendation panel that shows the best next Rod / Line / Bobber / Enchant candidate for the current conditions and lets the user create a comparison build with one click.
- **Lower initial cognitive load**: The parameter form is now grouped into `Step 1`, `Step 2`, `Step 3`, with advanced assumptions moved into a single `詳細調整` disclosure section. Core inputs remain in the same page; no beginner/expert mode split was introduced.
- **Ranking focus follows the selected comparison goal**: The per-slot ranking view now prioritizes the currently selected slot and opens in context, while full-build optimization opens directly when `Full build` is selected.
- **Build management wording updated**: Renamed the top build area and add button to emphasize side-by-side comparison builds rather than generic tabs.
- **Updated docs and E2E coverage**: README workflow guidance and Playwright smoke tests now reflect the single-flow comparison UX.

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
