# N50 Strategy Lab

N50 Strategy Lab is a trading strategy scanner and chart analysis tool for NIFTY-family indices. It provides strategy signals, combo scoring, trade history scanning, and risk calculations in a browser-based interface.

## Disclaimer
This project is for educational and informational use only.
The creator is not a SEBI-registered investment advisor. Trading involves risk, including capital loss. Do your own research and consult a licensed advisor before making financial decisions.

## Current Architecture
- Main app runtime: React 19 + Vite
- Core strategy/chart engine: original `N50-Strategy-Lab.html` (kept intact)
- React integration approach: iframe wrapper that loads the original HTML and injects mobile responsive overrides

## Features
- Real-time strategy scanning (EMA Cross, OB, FVG, Order Flow, Liquidity Sweep, VWAP, Volume Profile)
- Interactive HTML5 canvas chart with zoom/pan/crosshair and layer toggles
- Historical signal scan and outcome tracking (WIN/LOSS/OPEN/MISSED)
- Multi-symbol and multi-timeframe support
- Built-in position sizing and risk controls
- Dark/light theme support
- Mobile-adaptive layout in React wrapper (design logic preserved)

## Tech Stack
- React.js 19
- JavaScript (ES6+)
- JSX
- HTML5
- CSS3 (custom animations and responsive overrides)
- Vite (dev/build tooling)
- Yahoo Finance chart API (via CORS proxy)

## Project Structure
- `src/`: React app shell (`App.jsx`, `main.jsx`, `styles.css`)
- `public/N50-Strategy-Lab.html`: legacy strategy app loaded by React
- `N50-Strategy-Lab.html` (root): original source kept as-is
- `index.html`: Vite entry file

## Getting Started
1. Install dependencies:
`yarn install`

2. Start development server:
`yarn dev`

3. Build production bundle:
`yarn build`

4. Preview production build:
`yarn preview`

## Deploy To GitHub Pages
1. Make sure the repo is pushed to:
`https://github.com/aravindhghosh/N50-Strategy-Lab`

2. Build and publish:
`yarn deploy`

3. In GitHub repo settings:
`Settings -> Pages -> Source: Deploy from a branch -> Branch: gh-pages`

## Notes
- Original files are preserved and not removed.
- UI design and trading logic are intentionally unchanged from the original app.
- Mobile adaptation is added through wrapper-level CSS overrides.

## User Guide (Quick)
1. Select symbol and timeframe.
2. Enable desired strategies from the left panel.
3. Click `SCAN STRATEGIES`.
4. Review current signals and best combo.
5. Use trade history to evaluate setup outcomes.

## Acknowledgements
Initial development assistance included AI tooling support.
