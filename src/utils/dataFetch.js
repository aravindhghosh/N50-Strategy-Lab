const YF_SYM = { 'NSEI': '^NSEI', 'NSEBANK': '^NSEBANK', 'BSESN': '^BSESN', 'CNXFIN.NS': 'CNXFIN.NS' };
const YF_CFG = { '1': {i:'1m',r:'7d'}, '3': {i:'5m',r:'7d'}, '5': {i:'5m',r:'60d'}, '15': {i:'15m',r:'60d'}, '30': {i:'30m',r:'60d'}, '60': {i:'60m',r:'730d'}, 'D': {i:'1d',r:'5y'} };

function simCandles(sym, tf) {
  const base = { NSEI: 24200, NSEBANK: 52000, BSESN: 80000, 'CNXFIN.NS': 23000 }[sym] || 24200;
  const iv = { '1':1,'3':3,'5':5,'15':15,'30':30,'60':60,'D':1440 }[tf] || 15;
  const n = 600, arr = []; let p = base + (Math.random() - 0.5) * 600, now = Date.now(), trend = 0;
  for (let i = n; i >= 0; i--) {
    if (i % 40 === 0) trend = (Math.random() - 0.48) * 0.004;
    const d = (Math.random() - 0.5 + trend) * p * 0.004;
    const o = p, c = +(p + d).toFixed(2), b = Math.abs(c - o);
    arr.push({ t: now - i * iv * 60000, o, h: +(Math.max(o, c) + b * Math.random() * 0.8).toFixed(2), l: +(Math.min(o, c) - b * Math.random() * 0.8).toFixed(2), c, v: Math.round(Math.random() * 9000 + 300) });
    p = c;
  }
  return arr;
}

export async function fetchYF(sym, tf, addLog) {
  const yfSym = YF_SYM[sym] || '^NSEI';
  const cfg = YF_CFG[tf] || YF_CFG['15'];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=${cfg.i}&range=${cfg.r}`;
  const proxy = 'https://corsproxy.io/?' + encodeURIComponent(url);
  try {
    const resp = await fetch(proxy, { headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const j = await resp.json();
    const res = j.chart.result[0];
    const ts = res.timestamp, q = res.indicators.quote[0];
    const arr = [];
    for (let i = 0; i < ts.length; i++) {
      if (!q.open[i] || !q.close[i] || !q.high[i] || !q.low[i]) continue;
      arr.push({ t: ts[i] * 1000, o: +q.open[i].toFixed(2), h: +q.high[i].toFixed(2), l: +q.low[i].toFixed(2), c: +q.close[i].toFixed(2), v: q.volume[i] || 0 });
    }
    if (addLog) addLog(`${arr.length} candles [${sym} ${cfg.i}]`, 'i');
    return arr;
  } catch (e) {
    if (addLog) addLog('Fetch failed: ' + e.message + ' — using sim', 'w');
    return simCandles(sym, tf);
  }
}

export async function fetchSession(sym) {
  const yfSym = YF_SYM[sym] || '^NSEI';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1d&range=5d`;
  const proxy = 'https://corsproxy.io/?' + encodeURIComponent(url);
  try {
    const resp = await fetch(proxy, { headers: { Accept: 'application/json' } });
    const j = await resp.json();
    const res = j.chart.result[0];
    const ts = res.timestamp, q = res.indicators.quote[0];
    const days = [];
    for (let i = 0; i < ts.length; i++) {
      if (!q.open[i]) continue;
      days.push({ o: +q.open[i].toFixed(2), h: +q.high[i].toFixed(2), l: +q.low[i].toFixed(2), c: +q.close[i].toFixed(2) });
    }
    if (days.length >= 2) {
      const pv = days[days.length - 2], td = days[days.length - 1];
      return { pc: pv.c, ph: pv.h, pl: pv.l, do_: td.o, dh: td.h, dl: td.l };
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function simSession(candles) {
  const pd = candles[Math.max(0, candles.length - 100)];
  return { pc: pd.c, ph: pd.h, pl: pd.l, do_: candles[Math.max(0, candles.length - 96)]?.o || candles[0].o, dh: candles[candles.length - 1].h, dl: candles[candles.length - 1].l };
}
