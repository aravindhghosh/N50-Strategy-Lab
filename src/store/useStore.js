import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Settings
  sym: 'NSEI',
  tf: '15',
  rr: 2,
  emaFast: 9,
  emaSlow: 21,
  capital: 100000,
  riskPct: 1,
  lookback: 150,
  darkMode: false,

  // Strategy toggles
  stratOn: { ema: true, ob: true, fvg: true, ifvg: false, of: false, ls: false, vwap: false, vp: false },

  // Layer toggles
  layers: { ob: false, fvg: false, ifvg: false, ls: false, lvl: false, sig: false, ema: true, vwap: false, vp: false },

  // Data
  candles: [],
  ema1: [],
  ema2: [],
  obs: [],
  fvgs: [],
  ifvgs: [],
  session: { pc: null, ph: null, pl: null, do_: null, dh: null, dl: null },
  vwapData: null,
  vpData: null,

  // Results
  results: null,
  scanning: false,

  // Log
  logs: [{ type: 'ld', msg: '// ready' }],

  // Active tab
  activeTab: 'th',

  // Chart hover
  hoverIdx: -1,

  // Actions
  setSym: sym => set({ sym }),
  setTf: tf => set({ tf }),
  setRR: rr => set({ rr }),
  setEmaFast: v => set({ emaFast: v }),
  setEmaSlow: v => set({ emaSlow: v }),
  setCapital: v => set({ capital: v }),
  setRiskPct: v => set({ riskPct: v }),
  setLookback: v => set({ lookback: v }),
  toggleDarkMode: () => {
    const next = !get().darkMode;
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    set({ darkMode: next });
  },
  toggleStrat: key => set(s => ({ stratOn: { ...s.stratOn, [key]: !s.stratOn[key] } })),
  toggleLayer: key => set(s => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
  setActiveTab: tab => set({ activeTab: tab }),
  setHoverIdx: idx => set({ hoverIdx: idx }),

  addLog: (msg, type = 'm') => set(s => ({ logs: [...s.logs.slice(-200), { type: 'l' + type, msg }] })),
  clearLog: () => set({ logs: [] }),

  setData: (candles, ema1, ema2, obs, fvgs, ifvgs, session, vwapData, vpData) =>
    set({ candles, ema1, ema2, obs, fvgs, ifvgs, session: session || { pc: null, ph: null, pl: null, do_: null, dh: null, dl: null }, vwapData, vpData }),

  setResults: results => set({ results }),
  setScanning: scanning => set({ scanning }),
}));

export default useStore;
