# N50 Strategy Lab v3

High-performance React trading dashboard for NIFTY-family indices, with strategy scanning, chart overlays, S/R intelligence, and backtest-style trade history.

## ⚠️ Disclaimer
This project is for educational and informational use only.  
The creator is not a SEBI-registered investment advisor. Trading involves risk, including capital loss.  
Do your own research and consult a licensed advisor before making financial decisions.

## ✨ Highlights
- ⚡ Fast React app (no iframe wrapper)
- 📈 Canvas chart with minimap, zoom, pan, crosshair, and tooltip
- 🧠 Multi-strategy signal engine + combo confidence scoring
- 📚 Trade History with WIN/LOSS/OPEN/MISSED outcomes
- 🎯 S/R analysis (Daily / Weekly / Monthly + confluence view)
- 🟢 Market-open aware live refresh (2s polling cadence)
- 🛡️ Startup disclaimer modal + portfolio FAB

## 🧩 Supported Symbols & Timeframes
- Symbols: `NIFTY 50`, `BANK NIFTY`, `SENSEX`, `FIN NIFTY`
- Timeframes: `1M`, `3M`, `5M`, `15M`, `30M`, `1H`, `1D`

## 📊 Chart Layers (Toolbar Toggles)
- `OB` - Order Blocks
- `FVG` - Fair Value Gaps
- `LS` - Liquidity Sweep markers (`LS↑`, `LS↓`)
- `LEVELS` - Session levels (Prev Close / Day OHLC / Prev HL)
- `SIGNAL` - Active best combo zone
- `EMA` - EMA fast & slow
- `VWAP` - Anchored VWAP + deviation bands
- `VP` - Volume Profile POC line

## 🧠 Strategies
- 📈 `EMA` - EMA Cross
- 🧱 `OB` - Order Block
- ⚡ `FVG` - Fair Value Gap
- 🌊 `OF*` - Order Flow (synthetic estimate)
- 💧 `LS` - Liquidity Sweep
- 📐 `VWAP` - Anchored VWAP
- 📦 `VP*` - Volume Profile (approximate POC/VAH/VAL)

Default enabled strategies:
- ✅ `EMA`, `OB`, `FVG`
- ⛔ `OF*`, `LS`, `VWAP`, `VP*` (user-controlled)

## 🧪 Signals, Combos, and History
- Each strategy emits direction + confidence (`C:1` to `C:3`)
- Engine builds agreement-based combos (`2+` strategies)
- History scan evaluates future bars and tags outcomes:
  - 🟢 `WIN`
  - 🔴 `LOSS`
  - 🔵 `OPEN`
  - 🟡 `MISSED`

## 🛰️ Live Update Model
- Auto-scan on symbol/timeframe change
- Live polling every `2 seconds` during IST market hours
- Fast poll cycles update live signals
- Full history refresh runs on lighter periodic cycles

## 🚀 Performance Improvements Included
- Debounced symbol/timeframe auto-scan
- Short-lived data/session caching
- Reduced candle payload size by timeframe
- Deferred/non-blocking backtest scheduling
- Guarded cancellation of stale async scans/backtests
- Precomputed LS markers (instead of heavy per-frame recompute)
- Theme-switch redraw responsiveness improvements

## 🏗️ Tech Stack
- React `18.2`
- Zustand `4.x`
- JavaScript (ES6+) + JSX
- HTML5 Canvas
- CSS3
- CRA + CRACO
- Tailwind/PostCSS (project configured)

## 📁 Project Structure
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
  N50-Strategy-Lab.html      (original source kept)

N50-Strategy-Lab.html        (original source kept)
```

## ⚙️ Setup
```bash
yarn install
```

## 🧑‍💻 Run (Development)
```bash
yarn start
```

## 📦 Production Build
```bash
yarn build
```

## 🌐 GitHub Pages Deployment
1. Install deploy helper:
```bash
yarn add -D gh-pages
```
2. Publish:
```bash
yarn deploy
```

Scripts:
- `predeploy` -> `yarn build`
- `deploy` -> publish `build/` to `gh-pages`

## 📝 Notes
- Original legacy HTML files are preserved and not deleted.
- `OF*` and `VP*` are heuristic/approximate by design and clearly labeled.
- Live behavior depends on data availability and market-open schedule checks.
