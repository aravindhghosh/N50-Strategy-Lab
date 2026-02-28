# N50 Strategy Lab (React)

N50 Strategy Lab is a React-based intraday strategy scanner and charting dashboard for NIFTY-family indices.

## Disclaimer
This project is for educational and informational use only. The creator is not a SEBI-registered investment advisor. Trading involves risk, including capital loss. Do your own research and consult a licensed advisor before making financial decisions.

## What This Version Includes
- Full React app (no iframe wrapper)
- Interactive canvas chart with:
  - zoom, pan, minimap, crosshair, tooltip
  - layer toggles: `OB`, `FVG`, `LS`, `LEVELS`, `SIGNAL`, `EMA`, `VWAP`, `VP`
- Strategies:
  - EMA Cross
  - Order Block
  - Fair Value Gap
  - Order Flow* (synthetic)
  - Liquidity Sweep
  - Anchored VWAP
  - Volume Profile* (approximate POC/VAH/VAL)
- Combo engine with confidence scoring
- Trade history backtest (WIN/LOSS/OPEN/MISSED)
- S/R Insights modals:
  - Last 7 days OHLC
  - Daily/Weekly/Monthly S/R table
  - S/R trade analysis with multi-timeframe confluence
- Startup disclaimer modal
- Portfolio floating action button

## Recent Enhancements Applied
- Symbol/timeframe switch auto-scan
- Live polling every `2s` during market hours (IST), with lighter fast refresh cycles
- Performance tuning to reduce hangs:
  - deferred/non-blocking history scan scheduling
  - stale async scan/backtest cancellation guards
  - lighter backtest window in auto cycles
  - LS marker precompute instead of per-frame recalculation
- S/R analysis improvements:
  - true cross-timeframe clustering (D/W/M)
  - setup validity guards (risk + level ordering checks)
- UI labeling clarity for heuristic strategies (`OF*`, `VP*`)

## Tech Stack
- React `18.2`
- Zustand `4.x`
- JavaScript (ES6+), JSX
- HTML5 Canvas
- CSS3
- CRA + CRACO
- Tailwind/PostCSS configured in project

## Project Structure
```text
src/
  App.jsx
  index.js
  index.css
  components/
    Topbar.jsx
    Sidebar.jsx
    ChartToolbar.jsx
    ChartCanvas.jsx
    BottomPanel.jsx
    RightPanel.jsx
    GuideModal.jsx
    InsightsModal.jsx
    PortfolioFab.jsx
  store/
    useStore.js
  utils/
    dataFetch.js
    indicators.js
public/
  index.html
  N50-Strategy-Lab.html   (original source kept)
N50-Strategy-Lab.html     (original source kept)
```

## Setup
```bash
yarn install
```

## Run
```bash
yarn start
```

## Build
```bash
yarn build
```

## Deploy to GitHub Pages
1. Ensure `gh-pages` is installed:
```bash
yarn add -D gh-pages
```
2. Deploy:
```bash
yarn deploy
```

Current script behavior:
- `predeploy` runs `yarn build`
- `deploy` publishes `build/` to `gh-pages` branch

## Notes
- Original legacy HTML files are preserved and not deleted.
- Some strategy modules are heuristic approximations (`OF*`, `VP*`) and are labeled accordingly.
- Live updates depend on data availability and market-open schedule checks.
