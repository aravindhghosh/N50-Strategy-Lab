import React from 'react';
import useStore from '../store/useStore';

function fmt(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}

function TradeTable({ trades }) {
  if (!trades?.length) return <tr><td colSpan={12} className="nodata">Run scan</td></tr>;
  return trades.map((t, i) => (
    <tr key={i}>
      <td style={{ color: 'var(--t3)' }}>{i + 1}</td>
      <td style={{ color: 'var(--t2)' }}>{fmt(t.time)}</td>
      <td style={{ color: 'var(--cyan)' }}>{t.label}</td>
      <td className={t.dir === 'LONG' ? 'tL' : 'tS'} style={{ color: t.dir === 'LONG' ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{t.dir}</td>
      <td>{t.entry}</td>
      <td style={{ color: 'var(--red)' }}>{t.sl}</td>
      <td style={{ color: 'var(--green)' }}>{t.target}</td>
      <td>{t.exitPrice ?? '--'}</td>
      <td style={{ color: t.pnl > 0 ? 'var(--green)' : t.pnl < 0 ? 'var(--red)' : 'var(--t3)' }}>{t.pnl != null ? (t.pnl > 0 ? '+' : '') + t.pnl : '--'}</td>
      <td style={{ color: 'var(--yellow)' }}>{t.rr}</td>
      <td><span className={`bdg ${t.outcome === 'WIN' ? 'bw' : t.outcome === 'LOSS' ? 'bl' : t.outcome === 'OPEN' ? 'bo' : 'bm'}`}>{t.outcome}</span></td>
      <td style={{ color: 'var(--t3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.reason?.slice(0, 60)}</td>
    </tr>
  ));
}

function ComboCard({ combo }) {
  const isLong = combo.dir === 'LONG';
  return (
    <div className={`cb ${isLong ? 'cl' : 'cs'}`} style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderBottom: '1px solid var(--b1)' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, letterSpacing: 2, color: isLong ? 'var(--green)' : 'var(--red)' }}>{combo.dir}</span>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {combo.strats.map(s => <span key={s} style={{ fontSize: 7, padding: '2px 5px', borderRadius: 10, background: 'rgba(0,204,245,0.09)', border: '1px solid rgba(0,204,245,0.2)', color: 'var(--cyan)' }}>{s}</span>)}
        </div>
        <span style={{ fontSize: 8, color: 'var(--yellow)' }}>C:{combo.conf}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--b1)' }}>
        {[['ENTRY', combo.entry, 'var(--cyan)'], ['SL', combo.sl, 'var(--red)'], ['TARGET', combo.target, 'var(--green)'], ['QTY', combo.qty, 'var(--yellow)']].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--bg)', padding: '6px 8px' }}>
            <div style={{ fontSize: 7, color: 'var(--t3)', marginBottom: 2, textTransform: 'uppercase' }}>{l}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '6px 10px', fontSize: 8, color: 'var(--t3)' }}>Max Loss: ₹{combo.maxLoss} | Max Profit: ₹{combo.maxProfit}</div>
    </div>
  );
}

function PerfGrid({ trades }) {
  if (!trades?.length) return <div className="nodata" style={{ gridColumn: '1/-1' }}>Run scan</div>;
  const wins = trades.filter(t => t.outcome === 'WIN').length;
  const losses = trades.filter(t => t.outcome === 'LOSS').length;
  const opens = trades.filter(t => t.outcome === 'OPEN').length;
  const wr = trades.filter(t => t.outcome !== 'OPEN').length ? ((wins / (wins + losses)) * 100).toFixed(1) : '--';
  const pnlPts = trades.reduce((s, t) => s + (t.pnl || 0), 0).toFixed(1);
  const avgW = wins ? (trades.filter(t => t.outcome === 'WIN').reduce((s, t) => s + (t.pnl || 0), 0) / wins).toFixed(1) : '--';
  const avgL = losses ? (trades.filter(t => t.outcome === 'LOSS').reduce((s, t) => s + (t.pnl || 0), 0) / losses).toFixed(1) : '--';
  const exp = wins && losses ? ((+avgW * (wins / (wins + losses))) + (+avgL * (losses / (wins + losses)))).toFixed(1) : '--';
  const stats = [['Total Trades', trades.length, 'var(--t1)'], ['Wins', wins, 'var(--green)'], ['Losses', losses, 'var(--red)'], ['Open', opens, 'var(--cyan)'], ['Win Rate', wr + '%', wr >= 50 ? 'var(--green)' : 'var(--red)'], ['Total PnL pts', pnlPts, +pnlPts >= 0 ? 'var(--green)' : 'var(--red)'], ['Avg Win', avgW, 'var(--green)'], ['Avg Loss', avgL, 'var(--red)'], ['Expectancy', exp, +exp >= 0 ? 'var(--green)' : 'var(--red)']];
  return stats.map(([l, v, c]) => (
    <div key={l} style={{ background: 'var(--bg)', border: '1px solid var(--b1)', borderRadius: 2, padding: 7 }}>
      <div style={{ fontSize: 7, color: 'var(--t3)', marginBottom: 2, textTransform: 'uppercase' }}>{l}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: c }}>{v}</div>
    </div>
  ));
}

export default function BottomPanel() {
  const { activeTab, setActiveTab, results, logs } = useStore();
  const trades = results?.trades;
  const combos = results?.combos;

  const tabs = [{ id: 'th', l: 'TRADE HISTORY' }, { id: 'cb', l: 'COMBOS' }, { id: 'pf', l: 'PERFORMANCE' }, { id: 'lg', l: 'LOG' }];
  const wins = trades?.filter(t => t.outcome === 'WIN').length || 0;
  const losses = trades?.filter(t => t.outcome === 'LOSS').length || 0;
  const wr = wins + losses ? ((wins / (wins + losses)) * 100).toFixed(0) : '--';

  return (
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', background: 'var(--p1)', borderTop: '1px solid var(--b1)', flexShrink: 0 }}>
        {tabs.map(({ id, l }) => (
          <div key={id} onClick={() => setActiveTab(id)} style={{ padding: '7px 13px', fontSize: 7, letterSpacing: '1.5px', color: activeTab === id ? 'var(--cyan)' : 'var(--t3)', cursor: 'pointer', borderBottom: `2px solid ${activeTab === id ? 'var(--cyan)' : 'transparent'}`, transition: 'all .12s', textTransform: 'uppercase' }}>{l}</div>
        ))}
        {trades && <div style={{ marginLeft: 'auto', padding: '7px 11px', fontSize: 8, color: 'var(--t3)' }}>Trades: {trades.length} | W:{wins} L:{losses} | WR:{wr}%</div>}
      </div>
      <div style={{ height: 200, flexShrink: 0, background: 'var(--p1)', borderTop: '1px solid var(--b1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', overflow: 'auto', display: activeTab === 'th' ? 'block' : 'none' }}>
          <table className="tt"><thead><tr><th>#</th><th>TIME</th><th>STRAT</th><th>DIR</th><th>ENTRY</th><th>SL</th><th>TARGET</th><th>EXIT</th><th>PNL pts</th><th>RR</th><th>STATUS</th><th>REASON</th></tr></thead>
            <tbody><TradeTable trades={trades} /></tbody>
          </table>
        </div>
        {activeTab === 'cb' && <div style={{ height: '100%', overflow: 'auto', padding: 8 }}>{combos?.length ? combos.slice(0, 10).map((c, i) => <ComboCard key={i} combo={c} />) : <div className="nodata">Run scan</div>}</div>}
        {activeTab === 'pf' && <div style={{ height: '100%', overflow: 'auto' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, padding: 8 }}><PerfGrid trades={trades} /></div></div>}
        {activeTab === 'lg' && <div style={{ height: '100%', overflow: 'auto', fontSize: 9, padding: 7, lineHeight: 1.8, color: 'var(--t3)' }}>{logs.map((l, i) => <span key={i} className={`ll ${l.type}`}>{l.msg}</span>)}</div>}
      </div>
    </div>
  );
}
