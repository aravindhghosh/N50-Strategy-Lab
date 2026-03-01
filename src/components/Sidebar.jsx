import React from 'react';
import useStore from '../store/useStore';

const STRATEGIES = [
  { key: 'ema', icon: '📈', cls: 'rgba(255,200,50,0.08)', name: 'EMA CROSS', sub: '9/21 momentum' },
  { key: 'ob', icon: '🧱', cls: 'rgba(74,144,226,0.08)', name: 'ORDER BLOCK', sub: 'Supply/demand zones' },
  { key: 'fvg', icon: '⚡', cls: 'rgba(159,122,234,0.08)', name: 'FAIR VALUE GAP', sub: 'Price imbalance' },
  { key: 'ifvg', icon: '♻️', cls: 'rgba(118,177,255,0.10)', name: 'INVERSE FVG', sub: 'Inversion gap retest' },
  { key: 'of', icon: '🌊', cls: 'rgba(255,107,53,0.08)', name: 'ORDER FLOW*', sub: 'Synthetic delta momentum' },
  { key: 'ls', icon: '💧', cls: 'rgba(247,197,159,0.08)', name: 'LIQUIDITY SWEEP', sub: 'Stop hunt reversal' },
  { key: 'vwap', icon: '📐', cls: 'rgba(0,191,174,0.08)', name: 'ANCHORED VWAP', sub: 'Volume fair value' },
  { key: 'vp', icon: '📦', cls: 'rgba(168,216,234,0.08)', name: 'VOLUME PROFILE*', sub: 'Approx POC / VAH / VAL' },
];

const RR_OPTIONS = [1.5, 2, 3, 4, 5];

function SessionBox({ label, value, cls }) {
  const style = cls === 'up' ? { color: 'var(--green)' } : cls === 'dn' ? { color: 'var(--red)' } : cls === 'ye' ? { color: 'var(--yellow)' } : cls === 'or' ? { color: 'var(--orange)' } : { color: 'var(--t1)' };
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--b1)', borderRadius: 3, padding: '6px 8px' }}>
      <div style={{ fontSize: 7, letterSpacing: 0.5, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, ...style }}>{value || '--'}</div>
    </div>
  );
}

function SignalCard({ sig }) {
  const isLong = sig.dir === 'LONG';
  return (
    <div className={`sc ${isLong ? 'sl' : 'ss'}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 9px', borderBottom: '1px solid var(--b1)' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--t1)' }}>{sig.strat}</span>
        <span className={`dp ${isLong ? 'dL' : 'dS'}`} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 2, letterSpacing: 1, background: isLong ? 'rgba(0,232,122,0.09)' : 'rgba(255,45,85,0.09)', border: `1px solid ${isLong ? 'rgba(0,232,122,0.25)' : 'rgba(255,45,85,0.25)'}`, color: isLong ? 'var(--green)' : 'var(--red)' }}>{sig.dir} C:{sig.conf}</span>
      </div>
      <div style={{ padding: '7px 9px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, marginBottom: 5 }}>
          {[['ENTRY', sig.entry, 'var(--cyan)'], ['SL', sig.sl, 'var(--red)'], ['TARGET', sig.target, 'var(--green)'], ['RISK', sig.risk, 'var(--yellow)']].map(([l, v, c]) => (
            <div key={l} style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 2, padding: '5px 6px' }}>
              <div style={{ fontSize: 7, color: 'var(--t3)', marginBottom: 2, textTransform: 'uppercase' }}>{l}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: c }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 8, color: 'var(--t3)', lineHeight: 1.5, borderTop: '1px solid var(--b1)', paddingTop: 5 }}>{sig.reason}</div>
      </div>
    </div>
  );
}

function BestComboCard({ combo }) {
  const isLong = combo.dir === 'LONG';
  const chipColors = { EMA: { bg: 'rgba(255,200,50,0.09)', border: 'rgba(255,200,50,0.2)', color: 'var(--yellow)' }, OB: { bg: 'rgba(74,144,226,0.09)', border: 'rgba(74,144,226,0.2)', color: 'var(--blue)' }, FVG: { bg: 'rgba(159,122,234,0.09)', border: 'rgba(159,122,234,0.2)', color: 'var(--purple)' } };
  const getChip = s => chipColors[s] || { bg: 'rgba(0,204,245,0.09)', border: 'rgba(0,204,245,0.2)', color: 'var(--cyan)' };
  return (
    <div className={`cb ${isLong ? 'cl' : 'cs'}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderBottom: '1px solid var(--b1)' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, letterSpacing: 2, color: isLong ? 'var(--green)' : 'var(--red)' }}>{combo.dir}</span>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {combo.strats.map(s => { const ch = getChip(s); return <span key={s} style={{ fontSize: 7, padding: '2px 5px', borderRadius: 10, background: ch.bg, border: `1px solid ${ch.border}`, color: ch.color }}>{s}</span>; })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--b1)' }}>
        {[['ENTRY', combo.entry.toFixed(2), 'var(--t1)'], ['SL', combo.sl.toFixed(2), 'var(--t1)'], ['TARGET', combo.target.toFixed(2), 'var(--t1)'], ['CONF', combo.conf, 'var(--cyan)']].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--bg)', padding: '6px 8px' }}>
            <div style={{ fontSize: 7, color: 'var(--t3)', marginBottom: 2, textTransform: 'uppercase' }}>{l}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: c }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ onRunScan, onShowSR, onShowSRAnalysis }) {
  const { stratOn, toggleStrat, rr, setRR, emaFast, setEmaFast, emaSlow, setEmaSlow, capital, setCapital, riskPct, setRiskPct, lookback, setLookback, scanning, session, results } = useStore();

  const activeSigs = results?.activeSigs?.filter(s => s && s.dir !== 'WAIT') || [];
  const bestCombo = results?.combos?.[0];

  return (
    <div className="sidebar-panel" style={{ width: 248, flexShrink: 0, background: 'var(--p1)', borderRight: '1px solid var(--b1)', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Scan buttons */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--b1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="btn-scan" onClick={onRunScan} disabled={scanning}>
          {scanning ? '⏳ SCANNING...' : '▶ SCAN STRATEGIES'}
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          <button className="btn-scan" onClick={onShowSR} style={{ fontSize: 8, letterSpacing: '1.5px', background: 'rgba(255,200,50,0.05)', borderColor: 'var(--yellow)', color: 'var(--yellow)', padding: 7 }}>📊 S/R LEVELS</button>
          <button className="btn-scan" onClick={onShowSRAnalysis} style={{ fontSize: 8, letterSpacing: '1.5px', background: 'rgba(0,232,122,0.05)', borderColor: 'var(--green)', color: 'var(--green)', padding: 7 }}>🎯 SR ANALYSIS</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'visible' }}>
        {/* Strategies */}
        <div style={{ borderBottom: '1px solid var(--b1)' }}>
          <div style={{ padding: '7px 11px', fontSize: 7, letterSpacing: 2, color: 'var(--t3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--p2)', borderBottom: '1px solid var(--b1)' }}>
            <div className="dot" />STRATEGIES
          </div>
          <div style={{ padding: '9px 10px' }}>
            {STRATEGIES.map(({ key, icon, cls, name, sub }) => (
              <div key={key} className={`stog ${stratOn[key] ? 'on' : ''}`} onClick={() => toggleStrat(key)}>
                <div style={{ width: 22, height: 22, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, background: cls }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t1)' }}>{name}</div>
                  <div style={{ fontSize: 8, color: 'var(--t3)', marginTop: 1 }}>{sub}</div>
                </div>
                <div className="sw" />
              </div>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div style={{ borderBottom: '1px solid var(--b1)' }}>
          <div style={{ padding: '7px 11px', fontSize: 7, letterSpacing: 2, color: 'var(--t3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--p2)', borderBottom: '1px solid var(--b1)' }}>
            <div className="dot" />PARAMETERS
          </div>
          <div style={{ padding: '9px 10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 7 }}>
              <div><label style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>EMA Fast</label><input type="number" value={emaFast} min="2" max="50" onChange={e => setEmaFast(+e.target.value)} /></div>
              <div><label style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>EMA Slow</label><input type="number" value={emaSlow} min="5" max="200" onChange={e => setEmaSlow(+e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: 7 }}>
              <label style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Risk : Reward</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3 }}>
                {RR_OPTIONS.map(v => <div key={v} className={`rr-b ${rr === v ? 'on' : ''}`} onClick={() => setRR(v)}>{v}</div>)}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 7 }}>
              <div><label style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Capital ₹</label><input type="number" value={capital} step="10000" onChange={e => setCapital(+e.target.value)} /></div>
              <div><label style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Risk %</label><input type="number" value={riskPct} step="0.5" min="0.1" max="10" onChange={e => setRiskPct(+e.target.value)} /></div>
            </div>
            <div><label style={{ fontSize: 7, letterSpacing: 1, color: 'var(--t3)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Lookback Bars</label><input type="number" value={lookback} min="30" max="500" onChange={e => setLookback(+e.target.value)} /></div>
          </div>
        </div>

        {/* Session Levels */}
        <div style={{ borderBottom: '1px solid var(--b1)' }}>
          <div style={{ padding: '7px 11px', fontSize: 7, letterSpacing: 2, color: 'var(--t3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--p2)', borderBottom: '1px solid var(--b1)' }}>
            <div className="dot" />SESSION LEVELS
          </div>
          <div style={{ padding: '9px 10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              <SessionBox label="Prev Close" value={session.pc?.toFixed(2)} />
              <SessionBox label="Day Open" value={session.do_?.toFixed(2)} cls="or" />
              <SessionBox label="Day High" value={session.dh?.toFixed(2)} cls="up" />
              <SessionBox label="Day Low" value={session.dl?.toFixed(2)} cls="dn" />
              <SessionBox label="Prev High" value={session.ph?.toFixed(2)} cls="ye" />
              <SessionBox label="Prev Low" value={session.pl?.toFixed(2)} cls="or" />
            </div>
          </div>
        </div>

        {/* Current Signals */}
        <div style={{ borderBottom: '1px solid var(--b1)' }}>
          <div style={{ padding: '7px 11px', fontSize: 7, letterSpacing: 2, color: 'var(--t3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--p2)', borderBottom: '1px solid var(--b1)' }}>
            <div className="dot" />CURRENT SIGNALS
          </div>
          <div style={{ padding: '9px 10px' }}>
            {activeSigs.length ? activeSigs.map((s, i) => <SignalCard key={i} sig={s} />) : <div className="nodata">Run scan first</div>}
          </div>
        </div>

        {/* Best Combo */}
        <div>
          <div style={{ padding: '7px 11px', fontSize: 7, letterSpacing: 2, color: 'var(--t3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--p2)', borderBottom: '1px solid var(--b1)' }}>
            <div className="dot" />BEST COMBO
          </div>
          <div style={{ padding: '9px 10px' }}>
            {bestCombo ? <BestComboCard combo={bestCombo} /> : <div className="nodata">Run scan first</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
