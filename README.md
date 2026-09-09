# Forecast accuracy tracker

Static tracker for monthly **forecast vs actual**. It scores a series with MAPE, WAPE, and signed bias, then renders a table of per-month errors. No build step; GitHub Pages can serve the repo root.

Sample data: **18 months** of unit-demand style figures in `data/forecast.json`.

## Open locally

Because the page loads JSON with `fetch`, serve the repo root over HTTP (opening `index.html` as a `file://` URL is blocked by most browsers):

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

Relative paths (`./data/forecast.json`, `./js/…`, `./css/…`) are used so the same files work on GitHub Pages from the repository root. `.nojekyll` is present so Pages does not run Jekyll.

Replace the sample series by editing `data/forecast.json`. Schema:

```json
[
  { "month": "2024-04", "forecast": 820, "actual": 790 }
]
```

`month` is ISO `YYYY-MM`. `forecast` and `actual` are finite numbers.

## Run tests

```bash
bash scripts/test.sh
```

Requires Node. The suite asserts MAPE / WAPE / bias on known fixtures, zero-actual handling, perfect forecasts, and the sample file. Capture should print one `PASS` line per assertion and a final `Summary: N passed, 0 failed`.

## Formulas

Let \(F_t\) be the forecast and \(A_t\) the actual for period \(t\).

### MAPE — mean absolute percentage error

\[
\mathrm{MAPE} = \frac{1}{n} \sum_{t \in \mathcal{N}} \frac{|F_t - A_t|}{|A_t|}
\]

\(\mathcal{N}\) is the set of periods with \(A_t \neq 0\), and \(n = |\mathcal{N}|\). Periods with a zero actual are **skipped** (APE is undefined). If \(n = 0\), MAPE is `null`.

### WAPE — weighted absolute percentage error

\[
\mathrm{WAPE} = \frac{\sum_t |F_t - A_t|}{\sum_t |A_t|}
\]

Every period is included. A zero actual still adds \(|F_t|\) to the numerator. If \(\sum |A_t| = 0\), WAPE is `null`.

### Signed bias (mean percentage error)

\[
\mathrm{bias} = \frac{1}{n} \sum_{t \in \mathcal{N}} \frac{F_t - A_t}{A_t}
\]

Same \(n\) / \(\mathcal{N}\) as MAPE (zero actuals skipped). Positive bias means the forecast was high on average. If \(n = 0\), bias is `null`.

Implementation: `js/accuracy.js` (browser global `ForecastAccuracy` and Node `require`). `evaluate(records)` returns `{ rows, summary }` with per-month `error`, `absError`, `ape`, and `signedPctError`.

The UI shows MAPE / WAPE / bias as percentages (`value * 100`).

## Suggested next improvements

- Chart forecast vs actual and a rolling MAPE/WAPE window.
- Accept CSV upload in addition to the committed JSON file.
- Split series by SKU / region and compare WAPE across groups.
- Add MASE (scale errors by in-sample seasonal naïve) for series with zeros or mixed scale.
- Persist history so newly closed months append instead of replacing the file.
