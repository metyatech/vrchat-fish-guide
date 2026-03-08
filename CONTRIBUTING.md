# Contributing

Thank you for your interest in improving this community guide!

## Data contributions

All game data submitted must follow the source governance policy:

- **fact-only extraction only** — Submit numerical values (prices, weights, catch weights) observed in-game or reported by the community. Do **not** copy expressive text, tables, or layouts from any wiki or external site.
- **Cite your source** — Add or update the relevant entry in `src/data/sources.ts`. Mark `sourceStatus` as `'official'` only if the data comes directly from the game UI or developer communications.
- **Uncertain data** — If a value is uncertain or community-estimated, set `notes` accordingly. Do not present estimates as verified facts.

## Code contributions

1. Fork the repository and create a branch from `main`.
2. Run `npm install` to install dependencies.
3. Make changes and ensure `npm run verify` passes (format + lint + typecheck + test + build).
4. Open a pull request with a clear description of the change and its motivation.

### Code style

- TypeScript strict mode — no `any`, no `@ts-ignore` without comment.
- Prettier + ESLint are enforced via pre-commit hooks and CI.
- User-facing strings in **Japanese**. Code comments and developer docs in **English**.
- Keep components small and focused. Prefer editing existing files over creating new ones.

### Adding/modifying calculator mechanics

- Only add mechanics that are supportable from in-game observation or official sources.
- Community datamine formulas must be classified as `not-used-directly` or `unsupported` in `src/data/sources.ts` and **must not** be hard-coded into the calculator.
- Always add a corresponding warning in `calculateDistribution` when using an approximation model.

## Running tests

```bash
npm run test           # run once
npm run test:watch     # watch mode
npm run test:coverage  # coverage report
```

Tests live in `src/test/`. Add tests for any non-trivial calculation logic.

## Questions

Open a GitHub Discussion or issue.
