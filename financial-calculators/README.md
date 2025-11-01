This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
## Mortgage Calculator Suite

The mortgage workflow lives in `src/components/MortgageCalculator.tsx`, backed by helper widgets like `MortgageTimelineVisualization.tsx` and the dashboard container in `MortgageTrackingDashboard.tsx`. Calculations draw on formulas in `src/utils/financialCalculations.ts` and session-aware persistence helpers from `src/hooks/useMortgageData.ts`. When a signed-in user saves a scenario, the app calls the API routes under `src/app/api/mortgage*` to write into the SQLite database at `data/financial-calculators.db` via the queries in `src/lib/database.ts`.

Key capabilities:
- Model monthly amortization with optional extra payments and scheduled lump sums (each tracked with payoff impact metrics).
- Toggle amortization views (`summary`, `yearly`, or `full`) and visualize balance history with mortgage timeline markers.
- Auto-save the last working state to local storage and reload it when the user returns.

To explore the calculator locally:
1. Run `npm run dev` and open `http://localhost:3000/mortgage`.
2. Sign in with a test account (see `.env.example` for credential expectations) to unlock persistence.
3. Adjust mortgage inputs, then use **Save Scenario** to persist the plan; the entry will surface in the historical dropdown and in the tracking dashboard.

When editing or extending this feature set, keep related UI under `src/components`, persistence logic in `src/hooks` or the relevant API route, and update `FINANCIAL_CALCULATORS.md` with any user-visible behaviour changes.
