import React, { useMemo, useState } from 'react';
import useStore from '../store/useStore';
import { calcATR } from '../utils/indicators';

function fmtNum(v) {
  return Number.isFinite(v) ? v.toFixed(2) : '--';
}

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekKey(ts) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `W-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthKey(ts) {
  const d = new Date(ts);
  return `M-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function aggregateOHLC(candles, mode) {
  const keyFn = mode === 'week' ? weekKey : mode === 'month' ? monthKey : dayKey;
  const map = new Map();
  candles.forEach(c => {
    const k = keyFn(c.t);
    const prev = map.get(k);
    if (!prev) map.set(k, { t: c.t, o: c.o, h: c.h, l: c.l, c: c.c });
    else {
      prev.h = Math.max(prev.h, c.h);
      prev.l = Math.min(prev.l, c.l);
      prev.c = c.c;
    }
  });
  return Array.from(map.values()).sort((a, b) => a.t - b.t);
}

function getSwings(candles, n = 2) {
  const out = [];
  for (let i = n; i < candles.length - n; i += 1) {
    const cur = candles[i];
    let isHi = true;
    let isLo = true;
    for (let k = i - n; k < i; k += 1) {
      if (candles[k].h > cur.h) isHi = false;
      if (candles[k].l < cur.l) isLo = false;
    }
    for (let k = i + 1; k <= i + n; k += 1) {
      if (candles[k].h > cur.h) isHi = false;
      if (candles[k].l < cur.l) isLo = false;
    }
    if (isHi) out.push({ price: cur.h, type: 'R', label: 'R', strength: 1 });
    if (isLo) out.push({ price: cur.l, type: 'S', label: 'S', strength: 1 });
  }
  return out;
}

function getPivots(candles) {
  if (candles.length < 2) return [];
  const pv = candles[candles.length - 2];
  const pp = (pv.h + pv.l + pv.c) / 3;
  const r1 = 2 * pp - pv.l;
  const r2 = pp + (pv.h - pv.l);
  const r3 = pv.h + 2 * (pp - pv.l);
  const s1 = 2 * pp - pv.h;
  const s2 = pp - (pv.h - pv.l);
  const s3 = pv.l - 2 * (pv.h - pp);
  return [
    { price: +r3.toFixed(2), type: 'R', label: 'R3', strength: 1 },
    { price: +r2.toFixed(2), type: 'R', label: 'R2', strength: 2 },
    { price: +r1.toFixed(2), type: 'R', label: 'R1', strength: 3 },
    { price: +pp.toFixed(2), type: 'P', label: 'PP', strength: 3 },
    { price: +s1.toFixed(2), type: 'S', label: 'S1', strength: 3 },
    { price: +s2.toFixed(2), type: 'S', label: 'S2', strength: 2 },
    { price: +s3.toFixed(2), type: 'S', label: 'S3', strength: 1 },
  ];
}

function cluster(levels, pct = 0.002) {
  const sorted = [...levels].sort((a, b) => a.price - b.price);
  const clusters = [];
  sorted.forEach(lv => {
    const existing = clusters.find(c => Math.abs(c.price - lv.price) / lv.price < pct);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.strength = Math.max(existing.strength || 1, lv.strength || 1);
    } else {
      clusters.push({ ...lv, count: 1, strength: lv.strength || 1 });
    }
  });
  return clusters.sort((a, b) => b.price - a.price);
}

function clusterConfluence(srLevels, pct = 0.002) {
  const merged = [];
  srLevels.daily.forEach(lv => merged.push({ ...lv, tf: 'Daily' }));
  srLevels.weekly.forEach(lv => merged.push({ ...lv, tf: 'Weekly' }));
  srLevels.monthly.forEach(lv => merged.push({ ...lv, tf: 'Monthly' }));

  const sorted = merged.sort((a, b) => a.price - b.price);
  const groups = [];

  sorted.forEach(lv => {
    const hit = groups.find(g => Math.abs(g.price - lv.price) / Math.max(1, lv.price) < pct);
    if (!hit) {
      groups.push({
        price: lv.price,
        count: 1,
        strength: lv.strength || 1,
        tfs: new Set([lv.tf]),
        labels: new Set([lv.label || lv.type]),
        rVotes: lv.type === 'R' ? 1 : 0,
        sVotes: lv.type === 'S' ? 1 : 0,
      });
      return;
    }
    const nextCount = hit.count + 1;
    hit.price = (hit.price * hit.count + lv.price) / nextCount;
    hit.count = nextCount;
    hit.strength = Math.max(hit.strength || 1, lv.strength || 1);
    hit.tfs.add(lv.tf);
    hit.labels.add(lv.label || lv.type);
    if (lv.type === 'R') hit.rVotes += 1;
    if (lv.type === 'S') hit.sVotes += 1;
  });

  return groups
    .map(g => ({
      price: +g.price.toFixed(2),
      count: g.count,
      strength: g.strength,
      tfCount: g.tfs.size,
      tf: [...g.tfs].join(' / '),
      labels: [...g.labels].slice(0, 3).join(', '),
      type: g.rVotes > g.sVotes ? 'R' : g.sVotes > g.rVotes ? 'S' : 'P',
    }))
    .sort((a, b) => a.price - b.price);
}

function buildSRLevels(candles) {
  const dailyCandles = aggregateOHLC(candles, 'day').slice(-90);
  const weeklyCandles = aggregateOHLC(candles, 'week').slice(-52);
  const monthlyCandles = aggregateOHLC(candles, 'month').slice(-36);
  return {
    daily: cluster([...getSwings(dailyCandles, 2), ...getPivots(dailyCandles)]).slice(0, 12),
    weekly: cluster([...getSwings(weeklyCandles, 2), ...getPivots(weeklyCandles)]).slice(0, 12),
    monthly: cluster([...getSwings(monthlyCandles, 1), ...getPivots(monthlyCandles)]).slice(0, 12),
  };
}

function srTypeColor(type) {
  if (type === 'R') return 'var(--red)';
  if (type === 'S') return 'var(--green)';
  return 'var(--cyan)';
}

function strengthDots(n) {
  const active = '●'.repeat(Math.min(n || 1, 3));
  const inactive = '○'.repeat(Math.max(0, 3 - (n || 1)));
  return `${active}${inactive}`;
}

function SRTable({ levels, lastPrice, color }) {
  if (!levels.length) return <div style={{ color: 'var(--t3)', textAlign: 'center', padding: 14 }}>No data</div>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
      <thead>
        <tr style={{ background: 'var(--p2)' }}>
          <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--t3)', fontSize: 8, letterSpacing: 1 }}>TYPE</th>
          <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--t3)' }}>PRICE</th>
          <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--t3)' }}>DIST%</th>
          <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--t3)' }}>STRENGTH</th>
        </tr>
      </thead>
      <tbody>
        {levels.map((lv, idx) => {
          const dist = lastPrice ? ((lv.price - lastPrice) / lastPrice) * 100 : null;
          const above = lastPrice ? lv.price > lastPrice : false;
          return (
            <tr key={`${lv.label}-${lv.price}-${idx}`} style={{ borderBottom: '1px solid var(--b1)' }}>
              <td style={{ padding: '5px 8px', color: srTypeColor(lv.type), fontWeight: 700 }}>{lv.label || lv.type}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--t1)', fontWeight: 600 }}>{fmtNum(lv.price)}</td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color: dist == null ? 'var(--t3)' : (above ? 'var(--red)' : 'var(--green)') }}>
                {dist == null ? '--' : `${dist > 0 ? '+' : ''}${dist.toFixed(2)}%`}
              </td>
              <td style={{ padding: '5px 8px', textAlign: 'right', color, fontSize: 9 }}>{strengthDots(lv.strength)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function InsightsModal({ type, onClose }) {
  const { candles, ema1, ema2 } = useStore();
  const [refreshTick, setRefreshTick] = useState(0);

  const dailyRows = useMemo(() => aggregateOHLC(candles, 'day'), [candles]);
  const weekRows = useMemo(() => dailyRows.slice(-7), [dailyRows]);
  const last = candles.length ? candles[candles.length - 1] : null;
  const srLevels = useMemo(() => {
    void refreshTick;
    return buildSRLevels(candles);
  }, [candles, refreshTick]);

  const sra = useMemo(() => {
    if (!last) return null;
    const px = last.c;
    const n = candles.length;
    const ef = n ? ema1[n - 1] : null;
    const es = n ? ema2[n - 1] : null;
    const trend = ef != null && es != null && ef > es ? 'BULLISH' : 'BEARISH';

    const allLevels = clusterConfluence(srLevels, 0.002);

    const supports = allLevels.filter(lv => lv.price < px).sort((a, b) => b.price - a.price);
    const resistances = allLevels.filter(lv => lv.price > px).sort((a, b) => a.price - b.price);

    const nearS1 = supports[0];
    const nearS2 = supports[1];
    const nearR1 = resistances[0];
    const nearR2 = resistances[1];

    const strongS = allLevels
      .filter(lv => lv.price < px && ((lv.tfCount || 1) >= 2 || (lv.count || 1) >= 3 || (lv.strength || 1) >= 3))
      .sort((a, b) => b.price - a.price)[0];
    const strongR = allLevels
      .filter(lv => lv.price > px && ((lv.tfCount || 1) >= 2 || (lv.count || 1) >= 3 || (lv.strength || 1) >= 3))
      .sort((a, b) => a.price - b.price)[0];

    const atr = calcATR(candles, 14);
    const minRisk = Math.max(atr * 0.25, px * 0.0005, 1);

    const longEntry = nearS1 ? nearS1.price + atr * 0.2 : px;
    const longSL = nearS2 ? nearS2.price - atr * 0.3 : px - atr * 2;
    const longRisk = Math.max(0.01, longEntry - longSL);
    const longT1 = nearR1 ? nearR1.price - atr * 0.1 : longEntry + longRisk * 2;
    const longT2 = nearR2 ? nearR2.price - atr * 0.1 : longEntry + longRisk * 3;

    const shortEntry = nearR1 ? nearR1.price - atr * 0.2 : px;
    const shortSL = nearR2 ? nearR2.price + atr * 0.3 : px + atr * 2;
    const shortRisk = Math.max(0.01, shortSL - shortEntry);
    const shortT1 = nearS1 ? nearS1.price + atr * 0.1 : shortEntry - shortRisk * 2;
    const shortT2 = nearS2 ? nearS2.price + atr * 0.1 : shortEntry - shortRisk * 3;

    const longValid = Number.isFinite(longEntry)
      && Number.isFinite(longSL)
      && Number.isFinite(longT1)
      && Number.isFinite(longT2)
      && longSL < longEntry
      && longEntry < longT1
      && longT1 < longT2
      && longRisk >= minRisk;

    const shortValid = Number.isFinite(shortEntry)
      && Number.isFinite(shortSL)
      && Number.isFinite(shortT1)
      && Number.isFinite(shortT2)
      && shortT2 < shortT1
      && shortT1 < shortEntry
      && shortEntry < shortSL
      && shortRisk >= minRisk;

    return {
      px,
      trend,
      atr,
      nearS1,
      nearS2,
      nearR1,
      nearR2,
      strongS,
      strongR,
      bestDir: trend === 'BULLISH' ? 'LONG' : 'SHORT',
      longEntry,
      longSL,
      longT1,
      longT2,
      longRisk,
      longValid,
      shortEntry,
      shortSL,
      shortT1,
      shortT2,
      shortRisk,
      shortValid,
      minRisk,
    };
  }, [last, candles, ema1, ema2, srLevels]);

  const title = type === 'week'
    ? 'LAST 7 DAYS - OHLCV'
    : type === 'sr'
      ? 'SUPPORT & RESISTANCE - Daily / Weekly / Monthly'
      : 'S/R TRADE ANALYSIS';

  const subtitle = type === 'week'
    ? 'Daily Open - High - Low - Close - Change'
    : type === 'sr'
      ? 'Swing highs/lows + Pivot Points - last 3 months'
      : 'Entry / Exit / Stop Loss based on D/W/M support & resistance';

  const maxWidth = type === 'sr' ? 900 : type === 'sra' ? 700 : 680;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 16 }}>
      <div style={{ width: '100%', maxWidth, margin: '0 auto', background: 'var(--p1)', border: '1px solid var(--b2)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 16px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'var(--p2)', padding: '14px 20px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
            <div style={{ fontSize: 8, color: 'var(--t3)', letterSpacing: 2, marginTop: 2 }}>{subtitle}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(type === 'sr' || type === 'sra') && (
              <button className="btn-icon" onClick={() => setRefreshTick(v => v + 1)} style={{ fontSize: 9, padding: '5px 10px' }}>REFRESH</button>
            )}
            <button onClick={onClose} style={{ background: 'var(--red)', border: 'none', color: '#fff', fontSize: 14, width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontWeight: 700 }}>X</button>
          </div>
        </div>

        <div style={{ padding: type === 'week' ? 0 : 16, overflowY: 'auto', maxHeight: '80vh' }}>
          {type === 'week' && (
            <>
              {!weekRows.length ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>No data. Run scan first.</div>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: 'var(--p2)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--t3)', fontSize: 8, letterSpacing: '1.5px' }}>DATE</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--t3)' }}>OPEN</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--green)' }}>HIGH</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--red)' }}>LOW</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--t3)' }}>CLOSE</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--t3)' }}>CHANGE</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--t3)' }}>RANGE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekRows.map((d, i) => {
                        const date = new Date(d.t).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
                        const chg = d.c - d.o;
                        const chgP = d.o ? (chg / d.o) * 100 : 0;
                        const bull = d.c >= d.o;
                        const isToday = i === weekRows.length - 1;
                        return (
                          <tr key={d.t} style={{ borderBottom: '1px solid var(--b1)', background: isToday ? 'var(--p2)' : 'transparent' }}>
                            <td style={{ padding: '7px 10px', color: 'var(--t2)', fontWeight: isToday ? 700 : 400 }}>{date}{isToday ? ' <' : ''}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--orange)' }}>{fmtNum(d.o)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{fmtNum(d.h)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--red)', fontWeight: 600 }}>{fmtNum(d.l)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--t1)', fontWeight: 600 }}>{fmtNum(d.c)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: bull ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{bull ? '+' : ''}{chg.toFixed(2)} ({chgP.toFixed(2)}%)</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--yellow)' }}>{(d.h - d.l).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, padding: 12, background: 'var(--p2)', borderTop: '1px solid var(--b1)' }}>
                    {[
                      ['5D High', Math.max(...weekRows.map(d => d.h)).toFixed(2), 'var(--green)'],
                      ['5D Low', Math.min(...weekRows.map(d => d.l)).toFixed(2), 'var(--red)'],
                      ['5D Range', (Math.max(...weekRows.map(d => d.h)) - Math.min(...weekRows.map(d => d.l))).toFixed(2), 'var(--yellow)'],
                      ['Avg Range', (weekRows.reduce((a, d) => a + (d.h - d.l), 0) / weekRows.length).toFixed(1), 'var(--cyan)'],
                    ].map(([l, v, c]) => (
                      <div key={l} style={{ textAlign: 'center', padding: 6 }}>
                        <div style={{ fontSize: 7, color: 'var(--t3)', letterSpacing: 1 }}>{l}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {type === 'sr' && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--yellow)', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)', display: 'inline-block' }} />DAILY S/R
                </div>
                <div style={{ border: '1px solid var(--b1)', borderRadius: 5, overflow: 'hidden' }}>
                  <SRTable levels={srLevels.daily} lastPrice={last?.c} color="var(--yellow)" />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block' }} />WEEKLY S/R
                </div>
                <div style={{ border: '1px solid var(--b1)', borderRadius: 5, overflow: 'hidden' }}>
                  <SRTable levels={srLevels.weekly} lastPrice={last?.c} color="var(--cyan)" />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple)', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)', display: 'inline-block' }} />MONTHLY S/R
                </div>
                <div style={{ border: '1px solid var(--b1)', borderRadius: 5, overflow: 'hidden' }}>
                  <SRTable levels={srLevels.monthly} lastPrice={last?.c} color="var(--purple)" />
                </div>
              </div>
            </div>
          )}

          {type === 'sra' && (
            <>
              {!sra ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Run scan first</div>
              ) : (
                <>
                  <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 6, padding: '12px 14px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: 1 }}>CURRENT PRICE</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'Syne, sans-serif' }}>Rs{sra.px.toFixed(2)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: 1 }}>EMA TREND</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: sra.trend === 'BULLISH' ? 'var(--green)' : 'var(--red)' }}>{sra.trend}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: 1 }}>ATR (14)</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{sra.atr.toFixed(1)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: 1 }}>BIAS</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: sra.trend === 'BULLISH' ? 'var(--green)' : 'var(--red)' }}>PREFER {sra.bestDir}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 6, padding: '12px 14px', marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t1)', letterSpacing: 1, marginBottom: 10 }}>KEY LEVELS NEAR PRICE</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {sra.nearR2 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,45,85,0.07)', border: '1px solid rgba(255,45,85,0.2)', borderRadius: 3 }}>
                          <span><b style={{ color: 'var(--red)' }}>R2</b> <span style={{ fontSize: 8, color: 'var(--t3)' }}>{sra.nearR2.tf}</span></span>
                          <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{sra.nearR2.price.toFixed(2)} <span style={{ color: 'var(--red)', fontSize: 9 }}>(+{((sra.nearR2.price - sra.px) / sra.px * 100).toFixed(2)}%)</span></span>
                        </div>
                      )}
                      {sra.nearR1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,45,85,0.10)', border: '1px solid rgba(255,45,85,0.3)', borderRadius: 3 }}>
                          <span><b style={{ color: 'var(--red)' }}>R1</b> <span style={{ fontSize: 8, color: 'var(--t3)' }}>{sra.nearR1.tf}</span></span>
                          <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{sra.nearR1.price.toFixed(2)} <span style={{ color: 'var(--red)', fontSize: 9 }}>(+{((sra.nearR1.price - sra.px) / sra.px * 100).toFixed(2)}%)</span></span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(0,204,245,0.10)', border: '1.5px solid var(--cyan)', borderRadius: 3 }}>
                        <span><b style={{ color: 'var(--cyan)' }}>PRICE</b></span>
                        <span style={{ color: 'var(--cyan)', fontWeight: 700, fontSize: 14 }}>Rs{sra.px.toFixed(2)}</span>
                      </div>
                      {sra.nearS1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(0,232,122,0.10)', border: '1px solid rgba(0,232,122,0.3)', borderRadius: 3 }}>
                          <span><b style={{ color: 'var(--green)' }}>S1</b> <span style={{ fontSize: 8, color: 'var(--t3)' }}>{sra.nearS1.tf}</span></span>
                          <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{sra.nearS1.price.toFixed(2)} <span style={{ color: 'var(--green)', fontSize: 9 }}>({((sra.nearS1.price - sra.px) / sra.px * 100).toFixed(2)}%)</span></span>
                        </div>
                      )}
                      {sra.nearS2 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(0,232,122,0.07)', border: '1px solid rgba(0,232,122,0.2)', borderRadius: 3 }}>
                          <span><b style={{ color: 'var(--green)' }}>S2</b> <span style={{ fontSize: 8, color: 'var(--t3)' }}>{sra.nearS2.tf}</span></span>
                          <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{sra.nearS2.price.toFixed(2)} <span style={{ color: 'var(--green)', fontSize: 9 }}>({((sra.nearS2.price - sra.px) / sra.px * 100).toFixed(2)}%)</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 260, background: 'rgba(0,232,122,0.04)', border: `1px solid rgba(0,232,122,${sra.trend === 'BULLISH' ? '0.45' : '0.25'})`, borderRadius: 6, padding: 12, opacity: sra.trend === 'BULLISH' ? 1 : 0.7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>LONG</div>
                        {sra.trend === 'BULLISH' && <span style={{ fontSize: 7, padding: '2px 6px', background: 'rgba(0,232,122,0.15)', border: '1px solid rgba(0,232,122,0.3)', borderRadius: 10, color: 'var(--green)' }}>PREFERRED</span>}
                      </div>
                      {sra.longValid ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--b1)' }}><span style={{ color: 'var(--t3)' }}>Entry at S1+buffer</span><span style={{ color: 'var(--cyan)', fontWeight: 700 }}>Rs{sra.longEntry.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--b1)' }}><span style={{ color: 'var(--t3)' }}>Stop Loss (S2)</span><span style={{ color: 'var(--red)', fontWeight: 700 }}>Rs{sra.longSL.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--b1)' }}><span style={{ color: 'var(--t3)' }}>Target 1 (R1)</span><span style={{ color: 'var(--green)', fontWeight: 700 }}>Rs{sra.longT1.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--b1)' }}><span style={{ color: 'var(--t3)' }}>Target 2 (R2)</span><span style={{ color: 'var(--green)', fontWeight: 700 }}>Rs{sra.longT2.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--b1)' }}><span style={{ color: 'var(--t3)' }}>Risk / Trade</span><span style={{ color: 'var(--yellow)', fontWeight: 700 }}>{sra.longRisk.toFixed(1)} pts</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span style={{ color: 'var(--t3)' }}>R:R to T1</span><span style={{ color: 'var(--t1)', fontWeight: 700 }}>1:{((sra.longT1 - sra.longEntry) / Math.max(sra.longRisk, 0.01)).toFixed(1)}</span></div>
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(255,200,50,0.08)', border: '1px solid rgba(255,200,50,0.3)', borderRadius: 4, padding: '8px 10px', color: 'var(--yellow)', fontSize: 10 }}>
                          No valid LONG setup. Risk is too small or levels are not in valid order.
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 260, background: 'rgba(255,45,85,0.04)', border: `1px solid rgba(255,45,85,${sra.trend === 'BEARISH' ? '0.45' : '0.25'})`, borderRadius: 6, padding: 12, opacity: sra.trend === 'BEARISH' ? 1 : 0.7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)', fontFamily: 'Syne, sans-serif' }}>SHORT</div>
                        {sra.trend === 'BEARISH' && <span style={{ fontSize: 7, padding: '2px 6px', background: 'rgba(255,45,85,0.15)', border: '1px solid rgba(255,45,85,0.3)', borderRadius: 10, color: 'var(--red)' }}>PREFERRED</span>}
                      </div>
                      {sra.shortValid ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--b1)' }}><span style={{ color: 'var(--t3)' }}>Entry at R1-buffer</span><span style={{ color: 'var(--cyan)', fontWeight: 700 }}>Rs{sra.shortEntry.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--b1)' }}><span style={{ color: 'var(--t3)' }}>Stop Loss (R2)</span><span style={{ color: 'var(--red)', fontWeight: 700 }}>Rs{sra.shortSL.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--b1)' }}><span style={{ color: 'var(--t3)' }}>Target 1 (S1)</span><span style={{ color: 'var(--green)', fontWeight: 700 }}>Rs{sra.shortT1.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--b1)' }}><span style={{ color: 'var(--t3)' }}>Target 2 (S2)</span><span style={{ color: 'var(--green)', fontWeight: 700 }}>Rs{sra.shortT2.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--b1)' }}><span style={{ color: 'var(--t3)' }}>Risk / Trade</span><span style={{ color: 'var(--yellow)', fontWeight: 700 }}>{sra.shortRisk.toFixed(1)} pts</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span style={{ color: 'var(--t3)' }}>R:R to T1</span><span style={{ color: 'var(--t1)', fontWeight: 700 }}>1:{((sra.shortEntry - sra.shortT1) / Math.max(sra.shortRisk, 0.01)).toFixed(1)}</span></div>
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(255,200,50,0.08)', border: '1px solid rgba(255,200,50,0.3)', borderRadius: 4, padding: '8px 10px', color: 'var(--yellow)', fontSize: 10 }}>
                          No valid SHORT setup. Risk is too small or levels are not in valid order.
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 8, color: 'var(--t3)', marginTop: -8, marginBottom: 12 }}>
                    Minimum setup risk filter: {sra.minRisk.toFixed(2)} pts
                  </div>

                  {(sra.strongS || sra.strongR) && (
                    <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 6, padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t1)', letterSpacing: 1, marginBottom: 8 }}>HIGH-CONFLUENCE ZONES (multi-TF agreement)</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {sra.strongR && (
                          <div style={{ flex: 1, minWidth: 140, background: 'rgba(255,45,85,0.08)', border: '1px solid rgba(255,45,85,0.3)', borderRadius: 4, padding: 8 }}>
                            <div style={{ fontSize: 8, color: 'var(--t3)' }}>STRONG RESISTANCE</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)' }}>{sra.strongR.price.toFixed(2)}</div>
                            <div style={{ fontSize: 8, color: 'var(--t3)' }}>{sra.strongR.tf} - TF:{sra.strongR.tfCount || 1} Count:{sra.strongR.count || 1}</div>
                          </div>
                        )}
                        {sra.strongS && (
                          <div style={{ flex: 1, minWidth: 140, background: 'rgba(0,232,122,0.08)', border: '1px solid rgba(0,232,122,0.3)', borderRadius: 4, padding: 8 }}>
                            <div style={{ fontSize: 8, color: 'var(--t3)' }}>STRONG SUPPORT</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{sra.strongS.price.toFixed(2)}</div>
                            <div style={{ fontSize: 8, color: 'var(--t3)' }}>{sra.strongS.tf} - TF:{sra.strongS.tfCount || 1} Count:{sra.strongS.count || 1}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
