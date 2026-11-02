# Libya Traffic Intelligence

A data-driven road accident analytics and risk analysis platform for Libya, built as a graduation-style software engineering project. The entire application — CSV parsing, statistics, charts, and a stylized map — runs client-side in vanilla HTML, CSS, and JavaScript. No frameworks, no build step, no backend.

## Overview

Libya Traffic Intelligence processes a synthetic 2,000-record accident dataset and turns it into an interactive dashboard: KPIs, trend and distribution charts, a filterable accident table, a stylized SVG map with a heatmap mode, hotspot rankings, a transparent risk-scoring model, a rule-based prediction demo, and an exportable report builder.

> **Demo Dataset** — The accident records included in this project are synthetic data generated for demonstration and software-testing purposes. They do not represent official Libyan government statistics.

## Features

- **Dashboard** — dynamically calculated KPIs (total accidents, severe/critical count, injuries, fatalities, road closures, average emergency response time), a monthly trend line, severity donut, accident-type bar chart, top-cities chart, 24-hour distribution, recent accidents, and an at-a-glance risk summary.
- **Accidents** — a full filter panel (city, district, road, type, severity, cause, weather, road condition, traffic level, year, month, day of week, time range), a global search bar, and a sortable, paginated data table with a detail modal per record.
- **Analytics** — automatically generated key insights plus temporal, geographic, severity, and cause breakdowns, all recalculated from the current filter selection.
- **Hotspots** — an interactive pan/zoom SVG map of Libya (points or density-heatmap mode) plus ranked hotspot lists for cities and roads, severity concentration, and time-of-day concentration.
- **Risk Analysis** — a transparent, weighted 0–100 risk score with a visible factor breakdown, a risk-level distribution donut, and an "Accident Risk Prediction" tool that runs a rule-based demo model in the browser.
- **Reports** — build a scoped summary (date range, city, severity, type), then export it as CSV or print it (the browser's native print-to-PDF).
- Fully responsive from 320px mobile through 1920px desktop, with keyboard-accessible navigation, visible focus states, and loading/empty/error states throughout.

## Technology Stack

- HTML5, CSS3, vanilla JavaScript (ES6+)
- Hand-written SVG charts and map (no Chart.js, no Leaflet/Mapbox)
- A quoted-field-aware CSV parser written from scratch
- No frameworks, no npm packages, no build tooling required to run it

## Project Structure

```text
libya-traffic-intelligence/
├── index.html
├── css/
│   ├── style.css          # design tokens, resets, base components
│   ├── dashboard.css       # sidebar, header, KPIs, charts, table, map layout
│   ├── components.css      # mobile drawer, upload panel, print styles
│   └── responsive.css      # breakpoints from 320px to 1920px
├── js/
│   ├── utils.js             # CSV parser, formatting, toasts, tooltips
│   ├── data.js               # CSV loading (server + file fallback), filtering
│   ├── analytics.js          # KPIs, distributions, hotspots, risk score, insights
│   ├── charts.js              # SVG line/donut/bar/h-bar/hour chart renderers
│   ├── map.js                  # stylized SVG map, pan/zoom, heatmap mode
│   ├── filters.js               # filter panel construction and chips
│   ├── prediction.js             # rule-based predictRisk(features) demo model
│   ├── reports.js                 # report scoping, CSV export, print
│   └── app.js                      # page orchestration and DOM wiring
├── data/
│   └── accidents.csv        # 2,000 synthetic accident records
└── README.md
```

## Dataset

`data/accidents.csv` contains 2,000 synthetic accident records spanning 2022–2026 across 20 Libyan cities (Tripoli, Benghazi, Misrata, Sabha, Zawiya, Bayda, Derna, Tobruk, Sirte, Gharyan, Zliten, Khoms, Ajdabiya, Bani Walid, Tarhuna, Nalut, Ghadames, Ubari, Murzuq, and Darnah), each with its own set of realistic road names. Fields include date/time, location and coordinates, accident type, severity, vehicles/injuries/fatalities, estimated damage, weather, road condition, traffic level, lighting, possible cause, road closures, emergency response time, and a derived risk level.

Distributions are intentionally uneven and cross-correlated rather than uniform — for example, poor weather and poor road conditions increase the likelihood of a "Weather Conditions" or "Poor Road Condition" cause, night-time low-visibility hours skew toward higher severity, and larger cities (Tripoli, Benghazi) carry proportionally more records — but nothing is perfectly deterministic.

**The included accident dataset is synthetic and intended for demonstration, testing, and educational purposes. It is not official Libyan government data.**

## How to Run

### Option 1 — VS Code Live Server (recommended)

1. Open the project folder in VS Code.
2. Install the "Live Server" extension if you don't already have it.
3. Right-click `index.html` → **Open with Live Server**.

### Option 2 — Any simple static server

From the project folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser. Any static file server works equally well (e.g. `npx serve`).

### Option 3 — Direct file (with manual CSV load)

Some browsers block `fetch()` for local files opened via `file://`. If you open `index.html` directly and see a loading error, use the **Load CSV File** button on the dashboard and select `data/accidents.csv` from the project folder — the rest of the app works exactly the same way once the data is loaded.

## Data Science Notes

- **Preprocessing** — a hand-written CSV parser (quote/comma/newline aware) converts raw rows into typed records; numeric fields are coerced, and derived fields (hour, weekend flag, rush-hour flag) are computed once at load time.
- **Feature engineering** — the risk-scoring and prediction layers both work from lightweight derived signals: severity share, fatalities per 100 accidents, poor-road share, heavy-traffic share, night/low-visibility share, adverse-weather share, and rush-hour share.
- **Statistical analysis** — every chart and KPI is a pure function over whatever record list is currently in scope (full dataset or filtered subset), so filtering, searching, and reporting all reuse the same analytics functions.
- **Risk scoring** — a transparent weighted sum, normalized to 0–100 and bucketed into Low/Medium/High. It is explicitly labeled throughout the UI as a data-driven heuristic, not a validated road-safety model.
- **Visualization** — all charts (line, donut, bar, horizontal bar, 24-hour distribution) and the Libya map are rendered as raw SVG generated in JavaScript, with no charting or mapping library.
- **Future ML integration** — `js/prediction.js` exposes a single `predictRisk(features)` function. A real trained model (served via an API) could replace its internal logic without any changes to the UI code that calls it.

## Future Development

- Integration with real government traffic datasets
- Real-time traffic and weather API feeds
- GPS and traffic-camera data ingestion
- Computer vision for incident detection
- A trained machine-learning severity/risk model behind `predictRisk()`
- Deep learning and time-series forecasting for accident volume
- Real-time alerts and a companion mobile application
- Government / municipal system integration
