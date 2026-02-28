import React from 'react';
import useStore from '../store/useStore';

export default function Topbar({ onShowGuide, onShowWeek }) {
  const { darkMode, toggleDarkMode, results } = useStore();
  const session = useStore(s => s.session);
  const candles = useStore(s => s.candles);

  const n = candles.length;
  const last = n > 0 ? candles[n - 1] : null;
  const prev = n > 1 ? candles[n - 2] : null;
  const chg = last && prev ? last.c - prev.c : 0;
  const chgP = prev ? (chg / prev.c * 100).toFixed(2) : '0.00';
  const bestCombo = results?.combos?.[0];

  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const h = nowIST.getHours();
  const m = nowIST.getMinutes();
  const d = nowIST.getDay();
  const marketOpen = d >= 1 && d <= 5 && (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30));

  const ticker = [
    { l: 'LTP', v: last ? `Rs${last.c.toFixed(2)}` : '--', cls: 'cy' },
    { l: 'CHANGE', v: last && prev ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)} (${chgP}%)` : '--', cls: chg >= 0 ? 'up' : 'dn' },
    { l: 'DAY OPEN', v: session.do_ ? session.do_.toFixed(2) : '--', cls: 'or' },
    { l: 'DAY HIGH', v: session.dh ? session.dh.toFixed(2) : '--', cls: 'up' },
    { l: 'DAY LOW', v: session.dl ? session.dl.toFixed(2) : '--', cls: 'dn' },
    { l: 'DAY CLOSE', v: last ? `Rs${last.c.toFixed(2)}` : '--', cls: chg >= 0 ? 'up' : 'dn' },
    { l: 'PREV CLOSE', v: session.pc ? session.pc.toFixed(2) : '--', cls: '' },
    { l: 'PREV HIGH', v: session.ph ? session.ph.toFixed(2) : '--', cls: 'ye' },
    { l: 'PREV LOW', v: session.pl ? session.pl.toFixed(2) : '--', cls: 'or' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 46, flexShrink: 0, background: 'var(--p1)', borderBottom: '1px solid var(--b1)', padding: '0 12px', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 14, borderRight: '1px solid var(--b1)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--t1)', letterSpacing: 1 }}>
          <span style={{ color: 'var(--cyan)' }}>N50</span> STRATEGY LAB
        </div>
        <div style={{ fontSize: 7, letterSpacing: 2, color: 'var(--t3)', padding: '2px 5px', border: '1px solid var(--b2)', borderRadius: 2 }}>v3</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
        {ticker.map(({ l, v, cls }) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', padding: '0 12px', borderRight: '1px solid var(--b1)', flexShrink: 0 }}>
            <div style={{ fontSize: 7, letterSpacing: '1.5px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: cls === 'cy' ? 'var(--cyan)' : cls === 'up' ? 'var(--green)' : cls === 'dn' ? 'var(--red)' : cls === 'ye' ? 'var(--yellow)' : cls === 'or' ? 'var(--orange)' : 'var(--t1)', whiteSpace: 'nowrap' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, paddingLeft: 10 }}>
        {bestCombo ? (
          <span className={`pill ${bestCombo.dir === 'LONG' ? 'pill-g' : 'pill-r'}`}>{bestCombo.label} {bestCombo.dir}</span>
        ) : (
          <span className="pill pill-c">NO SIGNAL</span>
        )}
        <button className="btn-icon" style={{ fontSize: 9 }} onClick={onShowWeek} title="Last 7 days OHLC">WEEK</button>
        <button className="btn-icon" onClick={toggleDarkMode}>{darkMode ? 'DARK' : 'LIGHT'}</button>
        <button className="btn-icon" onClick={onShowGuide} style={{ background: 'rgba(0,204,245,0.08)', borderColor: 'var(--cyan)', color: 'var(--cyan)' }}>? GUIDE</button>
        <span className={`pill ${marketOpen ? 'pill-g' : 'pill-r'}`} style={{ fontSize: 8, letterSpacing: '1.5px' }}>{marketOpen ? 'MARKET OPEN' : 'CLOSED'}</span>
      </div>
    </div>
  );
}
