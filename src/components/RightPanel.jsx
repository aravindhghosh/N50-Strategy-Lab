import React from 'react';
import useStore from '../store/useStore';

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--b1)' }}>
      <div style={{ fontSize: 7, letterSpacing: '1.5px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: color || 'var(--t1)' }}>{value || '--'}</div>
    </div>
  );
}

export default function RightPanel() {
  const { results, ema1, ema2, candles, obs, fvgs, vpData } = useStore();
  const n = candles.length;
  const e1 = n ? ema1[n - 1] : null, e2 = n ? ema2[n - 1] : null;
  const actOBs = obs.filter(o => o.active).length;
  const actFVGs = fvgs.filter(f => !f.filled).length;
  const raw = results?.rawSigs;
  const trades = results?.trades;
  const wins = trades?.filter(t => t.outcome === 'WIN').length || 0;
  const losses = trades?.filter(t => t.outcome === 'LOSS').length || 0;
  const wr = wins + losses ? ((wins / (wins + losses)) * 100).toFixed(1) + '%' : '--';
  const pnl = trades?.reduce((s, t) => s + (t.pnl || 0), 0).toFixed(1);
  const exp = wins && losses ? ((wins / (wins + losses)) * (trades.filter(t => t.outcome === 'WIN').reduce((s, t) => s + (t.pnl || 0), 0) / wins) + (losses / (wins + losses)) * (trades.filter(t => t.outcome === 'LOSS').reduce((s, t) => s + (t.pnl || 0), 0) / losses)).toFixed(1) : '--';
  const bestCombo = results?.combos?.[0];

  function sigText(s) {
    if (!s || s.dir === 'WAIT') return null;
    return { text: `${s.dir} (C:${s.conf})`, color: s.dir === 'LONG' ? 'var(--green)' : 'var(--red)' };
  }

  const sigKeys = ['ema', 'ob', 'fvg', 'of', 'ls', 'vwap', 'vp'];
  const sigLabels = { ema: 'EMA Signal', ob: 'OB Signal', fvg: 'FVG Signal', of: 'Order Flow', ls: 'Liq. Sweep', vwap: 'VWAP Signal', vp: 'Vol. Profile' };

  return (
    <div style={{ width: 210, flexShrink: 0, background: 'var(--p1)', borderLeft: '1px solid var(--b1)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '7px 11px', fontSize: 7, letterSpacing: 2, color: 'var(--t3)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--p2)', borderBottom: '1px solid var(--b1)' }}>
        <div className="dot" />LIVE STATS
      </div>
      <Stat label="EMA Fast" value={e1?.toFixed(2)} color="var(--yellow)" />
      <Stat label="EMA Slow" value={e2?.toFixed(2)} color="var(--blue)" />
      {sigKeys.map(k => { const s = raw?.[k]; const st = sigText(s); return <Stat key={k} label={sigLabels[k]} value={st ? st.text : 'WAIT'} color={st ? st.color : 'var(--t3)'} />; })}
      <Stat label="POC Level" value={vpData ? `POC:${vpData.poc?.toFixed(0)} VAH:${vpData.vah?.toFixed(0)} VAL:${vpData.val?.toFixed(0)}` : '--'} color="var(--orange)" />
      <Stat label="Active Signals" value={results ? results.activeSigs?.filter(s => s?.dir !== 'WAIT').length + ' / ' + results.activeSigs?.length : '--'} color="var(--cyan)" />
      <Stat label="Best Combo" value={bestCombo ? `${bestCombo.label} ${bestCombo.dir}` : '--'} color={bestCombo?.dir === 'LONG' ? 'var(--green)' : bestCombo?.dir === 'SHORT' ? 'var(--red)' : 'var(--t3)'} />
      <Stat label="Trades Found" value={trades?.length} color="var(--yellow)" />
      <Stat label="Win Rate" value={wr} color={wr !== '--' && parseFloat(wr) >= 50 ? 'var(--green)' : 'var(--red)'} />
      <Stat label="Expectancy" value={exp} color={exp !== '--' && +exp >= 0 ? 'var(--green)' : 'var(--red)'} />
      <Stat label="Total PnL pts" value={pnl} color={pnl && +pnl >= 0 ? 'var(--green)' : 'var(--red)'} />
      <Stat label="Active OBs" value={`${actOBs} active / ${obs.length}`} color="var(--blue)" />
      <Stat label="Unfilled FVGs" value={`${actFVGs} unfilled / ${fvgs.length}`} color="var(--purple)" />
    </div>
  );
}
