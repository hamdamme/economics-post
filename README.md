# From Opportunity to Equilibrium

**How businesses profit, compete, and survive in the short run and long run**

An interactive field guide for students, educators and business owners. Follow a fictional repair shop, work through competitive-market experiments and evaluate a business using evidence and full costs. Every example is synthetic.

## Run locally

Requires Node.js 24 and npm. No accounts, database, server API, or secrets are required.

```sh
npm ci
npm run dev
npm run check
npm run lint
npm test
npm run build
npm run preview
```

For browser checks on the production bundle, run `npx playwright install chromium` and then `npm run test:browser`. The browser suite starts a local server under `/economics/`. Set `BROWSER_CHANNEL=chrome` to use an installed Chrome, or `PREVIEW_URL` to check an already running deployment. Development and preview URLs are printed when the server starts.

## Reproduce the benchmark

1. Open Market lab, then Competitive benchmark. At 20 firms the price is 53.33 MU/unit and an interior firm sells 16.67 units at economic operating profit of 177.78 MU/period.
2. Select 40 firms. The price is 40 MU/unit, firm output is 10, accounting operating profit is 30 and economic operating profit is zero.
3. Open Compare and select the entry experiment. Allowing integer entry stops at 39 firms under the strictly positive decision rule.
4. Open either arm in the lab, show the full path and export the JSON. Import it back or call `run(parseRecord(record))` from `src/model/simulation.ts`. The engine recomputes results from the validated configuration and deterministic founder order. The model ID is `competitive-adjustment` and its version is `0.1.0`.

See [MODEL_SPEC.md](MODEL_SPEC.md) for units, the period clock and assumptions. See [deployment](docs/deployment.md), [evidence register](research/claim-evidence.csv), [bibliography](research/bibliography.md) and [research questions](research/questions.md).

## Boundaries

Maya’s residual-demand illustration and the many-firm price-taking benchmark are separate. Forecast demand is assumed, and simulation projections omit liquidity, strategic pricing, uncertainty about announced commitments, adaptive innovation and networks. The comparison arms are mechanistic illustrations. A final period does not establish an economic long run or equilibrium. Human economics review and a learner pilot are planned.

Chapter progress and worksheet drafts stay in the browser. Each has a reset control. There is no participant data collection. Asset files include self-hosted open-source fonts. See [LICENSES.md](LICENSES.md) for scope and attribution.
