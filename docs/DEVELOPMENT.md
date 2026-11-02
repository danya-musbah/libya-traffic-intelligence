# Development and Verification

## Prerequisites

- A modern browser with JavaScript enabled.
- A static HTTP server for automatic CSV loading. Python 3 is one option.

There is no package manifest, dependency installation, transpilation, build, linter, automated test runner, or CI workflow configured in this repository.

## Run locally

From the repository root:

```sh
python -m http.server 8080
```

Then open <http://localhost:8080/>. On Windows, `py -m http.server 8080` is an alternative. If using VS Code Live Server, serve the repository root so the relative `data/accidents.csv` URL resolves.

Opening `index.html` through `file://` may block `fetch()`. In that case, use the dashboard's **Load CSV File** control and choose `data/accidents.csv`.

## Source conventions

- Preserve the plain static-file architecture unless a change explicitly introduces another runtime.
- Keep classic script dependencies in the order used by `index.html`.
- Use DOM text nodes for untrusted record values; escape any values that must appear in HTML strings.
- Keep the synthetic-data and heuristic-model limitations visible in the UI and documentation.
- Avoid adding dependencies for behavior that native browser APIs already support.

## Manual verification checklist

| ID | Check | Expected result |
|---|---|---|
| M-01 | Serve the repository root and load the home page. | Dashboard loads without an error and shows 2,000 records for the supplied CSV. |
| M-02 | Open the Accidents page, sort a column, change pages, and apply/reset filters. | Rows, counts, and active filter chips reflect the selected state. |
| M-03 | Search for a known record ID and open the result. | Search result opens the matching accident details. |
| M-04 | Filter to records with one severity or risk level. | Donut renders the full-circle single-category case and reports its count. |
| M-05 | Open and close an accident detail modal using keyboard controls. | Focus moves into the dialog, remains within it while tabbing, Escape closes it, and focus returns to the opener when available. |
| M-06 | Change map mode and use zoom controls. | Point/heatmap mode and view controls update the map. |
| M-07 | Generate a report with valid and reversed date ranges, then export. | Valid scope is summarized and exported; an end date before the start is rejected. |
| M-08 | Load a malformed CSV or one with inconsistent fields. | The file is rejected with a visible error; previously loaded data is not replaced. |
| M-09 | Use the application at narrow viewport widths and with keyboard navigation. | Content remains usable without requiring pointer-only actions for primary navigation and controls. |

These are recommended repeatable checks, not a claim that every browser or item has been verified. No automated test cases currently exist.

## Change verification

For changes to JavaScript, run `node --check` against each changed `.js` file if Node.js is available, then exercise the relevant manual checks above. For HTML/CSS or documentation changes, review affected pages at desktop and narrow widths and verify links and relative paths. No build, lint, or markdown-validation command is configured.

## Data format notes

The header names are defined in `REQUIRED_FIELDS` in `js/data.js`. The application requires unique `accident_id` values; date, year, month, and weekday values must agree; Friday and Saturday are treated as weekend days; rush-hour flags are set for hour values 07–09, 13–16, and 19–21. A closed road must have a positive closure duration; an open road must have zero duration.
