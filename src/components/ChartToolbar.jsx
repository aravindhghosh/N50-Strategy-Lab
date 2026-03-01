import React from 'react';
import useStore from '../store/useStore';

const TF_OPTIONS = [{ v: '1', l: '1M' }, { v: '3', l: '3M' }, { v: '5', l: '5M' }, { v: '15', l: '15M' }, { v: '30', l: '30M' }, { v: '60', l: '1H' }, { v: 'D', l: '1D' }];
const SYM_OPTIONS = [{ v: 'NSEI', l: 'NIFTY 50' }, { v: 'NSEBANK', l: 'BANK NIFTY' }, { v: 'BSESN', l: 'SENSEX' }, { v: 'CNXFIN.NS', l: 'FIN NIFTY' }];
const LAYERS = [
  { k: 'ob', l: 'OB', cls: 'on-b' }, { k: 'fvg', l: 'FVG', cls: 'on-p' }, { k: 'ifvg', l: 'IFVG', cls: 'on-p', extra: { color: '#f97316', borderColor: '#f97316' } }, { k: 'lvl', l: 'LEVELS', cls: 'on-y' },
  { k: 'ls', l: 'LS', cls: 'on-g', extra: { color: '#f7c59f', borderColor: '#f7c59f' } },
  { k: 'sig', l: 'SIGNAL', cls: 'on-g' }, { k: 'ema', l: 'EMA', cls: 'on' },
  { k: 'vwap', l: 'VWAP', cls: 'on-g', extra: { color: '#00bfae', borderColor: '#00bfae' } },
  { k: 'vp', l: 'VP', cls: 'on-g', extra: { color: '#a8d8ea', borderColor: '#a8d8ea' } },
];
const LEGEND = [
  ['EMA Fast', 'var(--yellow)', 'line'],
  ['EMA Slow', 'var(--blue)', 'line'],
  ['Bull OB', 'var(--ob-bull-fill)', 'box', 'var(--ob-bull-border)'],
  ['Bear OB', 'var(--ob-bear-fill)', 'box', 'var(--ob-bear-border)'],
  ['Bull FVG', 'var(--fvg-bull-fill)', 'box', 'var(--fvg-bull-border)'],
  ['Bear FVG', 'var(--fvg-bear-fill)', 'box', 'var(--fvg-bear-border)'],
  ['Bull iFVG', 'rgba(0,232,122,0.18)', 'box', 'var(--fvg-bull-border)'],
  ['Bear iFVG', 'rgba(249,115,22,0.18)', 'box', 'var(--fvg-bear-border)'],
  ['LS', '#f7c59f', 'line'],
  ['VWAP', '#00bfae', 'line'],
  ['POC', '#f97316', 'line']
];

export default function ChartToolbar({ navInfo }) {
  const { sym, setSym, tf, setTf, layers, toggleLayer } = useStore();
  return (
    <div className="chart-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '5px 10px', flexShrink: 0, background: 'var(--p1)', borderBottom: '1px solid var(--b1)' }}>
      <div className="chart-toolbar-row chart-toolbar-row-main" style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)' }}>SYM</span>
        <select className="tb-sym" value={sym} onChange={e => setSym(e.target.value)}>
          {SYM_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <div style={{ width: 1, height: 16, background: 'var(--b1)', margin: '0 2px', flexShrink: 0 }} />
        <span style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)' }}>TF</span>
        {TF_OPTIONS.map(o => <div key={o.v} className={`tfb ${tf === o.v ? 'on' : ''}`} onClick={() => setTf(o.v)}>{o.l}</div>)}
      </div>
      <div className="chart-toolbar-row chart-toolbar-row-layers" style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)' }}>LAYERS</span>
        {LAYERS.map(({ k, l, cls, extra }) => (
          <div key={k} className={`tfb ${layers[k] ? cls : ''}`} style={layers[k] && extra ? extra : {}} onClick={() => toggleLayer(k)}>{l}</div>
        ))}
      </div>
      <div className="chart-legend chart-toolbar-row chart-toolbar-row-legend" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {LEGEND.map(([l, c, t, bc]) => (
          <div key={l} className="chart-legend-item" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--t2)' }}>
            {t === 'line' ? <div style={{ width: 14, height: 2, borderRadius: 1, background: c }} /> : <div style={{ width: 10, height: 10, borderRadius: 2, background: c, border: `1px solid ${bc}` }} />}
            {l}
          </div>
        ))}
      </div>
      {navInfo && <span className="nav-info" style={{ fontSize: 8, color: 'var(--t3)' }}>{navInfo}</span>}
    </div>
  );
}
