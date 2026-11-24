# Compound Interest Calculator

Compute the compound growth of savings and investments with recurring contributions, configurable compounding frequency, inflation adjustment, and a year-by-year growth table and chart.

**Live:** [compound-interest-calculator.itsjust.tools](https://compound-interest-calculator.itsjust.tools)

## Features

- Compound interest with configurable annual rate, term, and compounding frequency (daily, monthly, quarterly, annually)
- Recurring monthly contributions with an optional annual contribution increase
- Inflation-adjusted (real) value display alongside the nominal balance
- Year-by-year growth table with balance, real value, contributions and interest
- Growth chart visualizing the balance per year
- Final balance, total contributed and total interest breakdown
- Shareable URL state and `.itsjust.json` import/export plus image/PDF export
- Responsive dark/light UI
- 100% client-side — no data ever leaves your browser

## Edge cases handled

- Zero rate returns principal plus contributions with zero interest
- Zero term returns the principal with no growth rows
- Negative rates shrink the balance and can produce negative interest
- Fractional terms are floored to whole years

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-compound-interest-calculator .
docker run -p 3000:3000 itsjust-compound-interest-calculator
```

## License

MIT
