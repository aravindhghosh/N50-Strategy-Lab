import React from 'react';
import useStore from '../store/useStore';

const TF_OPTIONS = [{ v: '1', l: '1M' }, { v: '3', l: '3M' }, { v: '5', l: '5M' }, { v: '15', l: '15M' }, { v: '30', l: '30M' }, { v: '60', l: '1H' }, { v: 'D', l: '1D' }];
const SYM_OPTIONS = [{ v: 'NSEI', l: 'NIFTY 50' }, { v: 'NSEBANK', l: 'BANK NIFTY' }, { v: 'BSESN', l: 'SENSEX' }, { v: 'CNXFIN.NS', l: 'FIN NIFTY' }];
const LAYERS = [
  { k: 'ob', l: 'OB', cls: 'on-b' }, { k: 'fvg', l: 'FVG', cls: 'on-p' }, { k: 'lvl', l: 'LEVELS', cls: 'on-y' },
  { k: 'ls', l: 'LS', cls: 'on-g', extra: { color: '#f7c59f', borderColor: '#f7c59f' } },
  { k: 'sig', l: 'SIGNAL', cls: 'on-g' }, { k: 'ema', l: 'EMA', cls: 'on' },
  { k: 'vwap', l: 'VWAP', cls: 'on-g', extra: { color: '#00bfae', borderColor: '#00bfae' } },
  { k: 'vp', l: 'VP', cls: 'on-g', extra: { color: '#a8d8ea', borderColor: '#a8d8ea' } },
];

export default function ChartToolbar({ navInfo }) {
  const { sym, setSym, tf, setTf, layers, toggleLayer } = useStore();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', flexShrink: 0, background: 'var(--p1)', borderBottom: '1px solid var(--b1)', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)' }}>SYM</span>
      <select className="tb-sym" value={sym} onChange={e => setSym(e.target.value)}>
        {SYM_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <div style={{ width: 1, height: 16, background: 'var(--b1)', margin: '0 2px', flexShrink: 0 }} />
      <span style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)' }}>TF</span>
      {TF_OPTIONS.map(o => <div key={o.v} className={`tfb ${tf === o.v ? 'on' : ''}`} onClick={() => setTf(o.v)}>{o.l}</div>)}
      <div style={{ width: 1, height: 16, background: 'var(--b1)', margin: '0 2px', flexShrink: 0 }} />
      <span style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)' }}>LAYERS</span>
      {LAYERS.map(({ k, l, cls, extra }) => (
        <div key={k} className={`tfb ${layers[k] ? cls : ''}`} style={layers[k] && extra ? extra : {}} onClick={() => toggleLayer(k)}>{l}</div>
      ))}
      <div style={{ width: 1, height: 16, background: 'var(--b1)', margin: '0 2px', flexShrink: 0 }} />
      {navInfo && <span style={{ fontSize: 8, color: 'var(--t3)' }}>{navInfo}</span>}
    </div>
  );
}
