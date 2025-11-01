# Repository Guidelines

## Project Structure & Module Organization
This Next.js project keeps application code under `src`. Key directories:
- `src/app`: route handlers, layouts, and page-level logic.
- `src/components`: calculator UIs and shared widgets; mirror tests live in `src/components/__tests__`.
- `src/utils` and `src/lib`: financial formulas, data access, and helper modules consumed across calculators.
- `src/__tests__`: integration-style suites that exercise multi-component flows.
- `public` holds static assets, while `data` stores seed JSON used by the asset and mortgage trackers.

## Build, Test, and Development Commands
Use npm scripts from the repo root:
- `npm run dev` – starts the Turbopack dev server at http://localhost:3000.
- `npm run build` / `npm run start` – production compile and serve.
- `npm run lint` – ESLint (Next.js core-web-vitals profile) for TypeScript and JSX.
- `npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run test:ci` – Jest suites, watch mode, coverage reports, and CI-friendly runs respectively.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation, single quotes, and `const`-first declarations. Export React components in PascalCase (`AssetTracker.tsx`), hooks in camelCase (`usePortfolioFilters.ts`), and utility modules as camelCase files in `src/utils`. Tailwind classes belong inline; extract shared styles into component-level helpers instead of global CSS. Run `npm run lint` before opening a pull request to satisfy the enforced Next.js/TypeScript lint rules.

## Testing Guidelines
Jest with `@testing-library/react` underpins all tests (`*.test.tsx`). Place unit specs beside the component or in `src/__tests__` when they span multiple modules. Keep mocks in the same folder as the spec for discoverability. Maintain the configured global coverage threshold of 80% branches/functions/lines/statements; review HTML reports in `coverage/` when iterating. Run `npm run test:coverage` before submission and include new test cases for every regression fix or feature flag.

## Commit & Pull Request Guidelines
Commits in this repo use short, imperative subject lines (e.g., "Fix asset tracker dollar input fields"), no trailing period, and stay under ~72 characters. Scope each commit to one logical change and prefer splitting refactors from behaviour changes. For pull requests, provide a concise summary, link related issues, attach screenshots or GIFs for UI-impacting work, and note any environment variable updates. Confirm `npm run lint` and relevant Jest commands pass locally before requesting review.

## Security & Configuration Tips
Clone `.env.example` to `.env.local` and fill only the variables you need; never commit secrets. SQLite files and other generated artifacts belong under `data/` and should not leave the workspace. When introducing new third-party services, document required keys in `.env.example` and update `FINANCIAL_CALCULATORS.md` with integration details.
