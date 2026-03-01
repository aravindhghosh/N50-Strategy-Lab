// Indicators and Strategies

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function calcEMA(cls, p) {
  if (!cls.length) return [];
  const k = 2 / (p + 1);
  const r = new Array(cls.length);
  r[0] = cls[0];
  for (let i = 1; i < cls.length; i++) r[i] = cls[i] * k + r[i - 1] * (1 - k);
  return r;
}

export function calcTR(candles, i) {
  const c = candles[i];
  if (!c) return 0;
  if (i === 0) return Math.max(0, c.h - c.l);
  const pc = candles[i - 1]?.c ?? c.c;
  return Math.max(c.h - c.l, Math.abs(c.h - pc), Math.abs(c.l - pc));
}

export function calcATR(candles, period = 14) {
  if (!candles.length) return 0;
  const tr = [];
  for (let i = 0; i < candles.length; i++) tr.push(calcTR(candles, i));
  const n = Math.min(period, tr.length);
  const tail = tr.slice(-n);
  return tail.reduce((a, b) => a + b, 0) / Math.max(1, tail.length);
}

function isSameISTDay(t1, t2) {
  const d1 = new Date(new Date(t1).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const d2 = new Date(new Date(t2).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export function detectOBs(candles) {
  const obs = [];
  const n = candles.length;
  for (let i = 1; i < n - 1; i++) {
    const c = candles[i], nx = candles[i + 1];
    const bc = Math.abs(c.c - c.o), bn = Math.abs(nx.c - nx.o);
    if (c.c < c.o && nx.c > nx.o && bn > bc * 0.6 && nx.c > c.h) {
      obs.push({ type: 'bull', h: c.h, l: c.l, idx: i, mid: (c.h + c.l) / 2, endIdx: null, active: true });
    }
    if (c.c > c.o && nx.c < nx.o && bn > bc * 0.6 && nx.c < c.l) {
      obs.push({ type: 'bear', h: c.h, l: c.l, idx: i, mid: (c.h + c.l) / 2, endIdx: null, active: true });
    }
  }

  obs.forEach(ob => {
    for (let j = ob.idx + 2; j < n; j++) {
      const c = candles[j];
      if (ob.type === 'bull') {
        if (c.l <= ob.l) { ob.active = false; ob.endIdx = j; break; }
        if (c.l <= ob.h && c.l >= ob.l) ob.endIdx = j;
      } else {
        if (c.h >= ob.h) { ob.active = false; ob.endIdx = j; break; }
        if (c.h >= ob.l && c.h <= ob.h) ob.endIdx = j;
      }
    }
  });
  return obs;
}

export function detectFVGs(candles) {
  const fvgs = [];
  const n = candles.length;
  const atrSeries = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const seg = candles.slice(Math.max(0, i - 13), i + 1);
    atrSeries[i] = calcATR(seg, 14);
  }

  for (let i = 1; i < n - 1; i++) {
    const pv = candles[i - 1], nx = candles[i + 1], cur = candles[i];
    const minGap = Math.max((atrSeries[i] || 0) * 0.12, (cur.c || 0) * 0.00008);
    if (nx.l > pv.h + minGap) fvgs.push({ type: 'bull', top: nx.l, bot: pv.h, idx: i, filled: false, fillIdx: null });
    if (nx.h < pv.l - minGap) fvgs.push({ type: 'bear', top: pv.l, bot: nx.h, idx: i, filled: false, fillIdx: null });
  }

  fvgs.forEach(f => {
    for (let j = f.idx + 2; j < n; j++) {
      const c = candles[j];
      if (f.type === 'bull' && c.l <= f.bot) { f.filled = true; f.fillIdx = j; break; }
      if (f.type === 'bear' && c.h >= f.top) { f.filled = true; f.fillIdx = j; break; }
    }
  });
  return fvgs;
}

export function detectIFVGs(candles) {
  const ifvgs = [];
  const n = candles.length;

  for (let i = 1; i < n - 1; i++) {
    const pv = candles[i - 1];
    const nx = candles[i + 1];

    // Bear FVG (gap below) -> Bull iFVG when filled and rejected.
    if (pv.l > nx.h + 0.3) {
      const gapTop = pv.l;
      const gapBot = nx.h;
      for (let j = i + 2; j < n; j++) {
        const c = candles[j];
        if (c.h >= gapBot) {
          if (c.c >= gapBot) {
            if (j + 1 < n && candles[j + 1].c < gapTop) {
              ifvgs.push({
                type: 'bull',
                top: gapTop,
                bot: gapBot,
                idx: i,
                fillIdx: j,
                invIdx: j,
                invalidIdx: null,
                endIdx: null,
                active: true,
                retested: true,
                origin: 'bearFVG'
              });
            }
          }
          break;
        }
      }
    }

    // Bull FVG (gap above) -> Bear iFVG when filled and rejected.
    if (nx.l > pv.h + 0.3) {
      const gapTop = nx.l;
      const gapBot = pv.h;
      for (let j = i + 2; j < n; j++) {
        const c = candles[j];
        if (c.l <= gapTop) {
          if (c.c <= gapTop) {
            if (j + 1 < n && candles[j + 1].c > gapBot) {
              ifvgs.push({
                type: 'bear',
                top: gapTop,
                bot: gapBot,
                idx: i,
                fillIdx: j,
                invIdx: j,
                invalidIdx: null,
                endIdx: null,
                active: true,
                retested: true,
                origin: 'bullFVG'
              });
            }
          }
          break;
        }
      }
    }
  }

  ifvgs.forEach(f => {
    for (let j = (f.fillIdx ?? f.invIdx ?? f.idx) + 2; j < n; j++) {
      const c = candles[j];
      if (f.type === 'bull' && c.c < f.bot) { f.active = false; f.invalidIdx = j; f.endIdx = j; break; }
      if (f.type === 'bear' && c.c > f.top) { f.active = false; f.invalidIdx = j; f.endIdx = j; break; }
    }
  });

  return ifvgs;
}

export function calcAnchoredVWAP(candles) {
  const n = candles.length;
  const vwap = new Array(n).fill(null);
  const sd1up = new Array(n).fill(null), sd1dn = new Array(n).fill(null);
  const sd2up = new Array(n).fill(null), sd2dn = new Array(n).fill(null);
  let cumPV = 0, cumV = 0, cumPV2 = 0;

  for (let i = 0; i < n; i++) {
    if (i > 0 && !isSameISTDay(candles[i - 1].t, candles[i].t)) {
      cumPV = 0; cumV = 0; cumPV2 = 0;
    }
    const c = candles[i], tp = (c.h + c.l + c.c) / 3, vol = c.v || 1;
    cumPV += tp * vol; cumV += vol; cumPV2 += tp * tp * vol;
    const v = cumPV / cumV;
    const sd = Math.sqrt(Math.max(0, cumPV2 / cumV - v * v));
    vwap[i] = +v.toFixed(2);
    sd1up[i] = +(v + sd).toFixed(2); sd1dn[i] = +(v - sd).toFixed(2);
    sd2up[i] = +(v + 2 * sd).toFixed(2); sd2dn[i] = +(v - 2 * sd).toFixed(2);
  }
  return { vwap, sd1up, sd1dn, sd2up, sd2dn };
}

export function calcVolumeProfile(candles) {
  const bins = 50;
  let lo = Infinity, hi = -Infinity;
  candles.forEach(c => { if (c.l < lo) lo = c.l; if (c.h > hi) hi = c.h; });
  const binSize = (hi - lo) / bins || 1;
  const profile = new Array(bins).fill(0);
  candles.forEach(c => {
    const vol = c.v || 100;
    const bLo = Math.floor((c.l - lo) / binSize), bHi = Math.ceil((c.h - lo) / binSize);
    for (let b = Math.max(0, bLo); b < Math.min(bins, bHi); b++) profile[b] += vol / (bHi - bLo || 1);
  });
  const totalVol = profile.reduce((a, b) => a + b, 0);
  const pocBin = profile.indexOf(Math.max(...profile));
  const poc = +(lo + pocBin * binSize + binSize / 2).toFixed(2);
  let vaVol = profile[pocBin], loB = pocBin, hiB = pocBin;
  const target = totalVol * 0.7;
  while (vaVol < target && (loB > 0 || hiB < bins - 1)) {
    const addLo = loB > 0 ? profile[loB - 1] : 0, addHi = hiB < bins - 1 ? profile[hiB + 1] : 0;
    if (addLo > addHi && loB > 0) { vaVol += addLo; loB--; }
    else if (hiB < bins - 1) { vaVol += addHi; hiB++; }
    else break;
  }
  return { poc, vah: +(lo + hiB * binSize + binSize).toFixed(2), val: +(lo + loB * binSize).toFixed(2), profile, lo, hi, binSize };
}

export function stratEMA(can, e1, e2, rr) {
  const n = can.length;
  if (n < 3) return { dir: 'WAIT', conf: 0, reason: 'Not enough data', strat: 'EMA' };
  const L = can[n - 1], ef = e1[n - 1], es = e2[n - 1], pfef = e1[n - 2], pfes = e2[n - 2];
  const atr = calcATR(can, 14);
  let dir = null, conf = 0, reason = '';
  if (pfef <= pfes && ef > es && L.c > ef && L.c > es) { dir = 'LONG'; conf = 3; reason = `EMA: Fresh cross up (${ef.toFixed(0)} > ${es.toFixed(0)})`; }
  else if (pfef >= pfes && ef < es && L.c < ef && L.c < es) { dir = 'SHORT'; conf = 3; reason = `EMA: Fresh cross down (${ef.toFixed(0)} < ${es.toFixed(0)})`; }
  else if (ef > es && L.c > ef) { dir = 'LONG'; conf = 2; reason = 'EMA: Uptrend sustained'; }
  else if (ef < es && L.c < ef) { dir = 'SHORT'; conf = 2; reason = 'EMA: Downtrend sustained'; }
  else if (ef > es && L.c > es) { dir = 'LONG'; conf = 1; reason = 'EMA: Weak long'; }
  else if (ef < es && L.c < es) { dir = 'SHORT'; conf = 1; reason = 'EMA: Weak short'; }
  if (!dir) return { dir: 'WAIT', conf: 0, reason: 'EMA: No signal', strat: 'EMA' };
  const sl = dir === 'LONG' ? +(L.c - atr * 1.5).toFixed(2) : +(L.c + atr * 1.5).toFixed(2);
  const risk = Math.abs(L.c - sl);
  return { dir, entry: +L.c.toFixed(2), sl, target: +(dir === 'LONG' ? L.c + risk * rr : L.c - risk * rr).toFixed(2), risk: +risk.toFixed(2), rr, conf, reason, strat: 'EMA' };
}

export function stratOB(can, e1, e2, rr) {
  const n = can.length;
  if (n < 5) return { dir: 'WAIT', conf: 0, reason: 'Not enough data', strat: 'OB' };
  const obs = detectOBs(can), L = can[n - 1], atr = calcATR(can, 14);
  const emaBull = e1[n - 1] > e2[n - 1];
  let best = null;
  for (const ob of obs.filter(o => o.active)) {
    if (ob.type === 'bull' && L.l <= ob.h && L.c >= ob.l) {
      const conf = emaBull ? 3 : 2;
      if (!best || conf > best.conf) best = { ...ob, conf };
    }
    if (ob.type === 'bear' && L.h >= ob.l && L.c <= ob.h) {
      const conf = !emaBull ? 3 : 2;
      if (!best || conf > best.conf) best = { ...ob, conf };
    }
  }
  if (!best) return { dir: 'WAIT', conf: 0, reason: 'OB: No retest signal', strat: 'OB' };
  const dir = best.type === 'bull' ? 'LONG' : 'SHORT';
  const sl = dir === 'LONG' ? +(best.l - atr * 0.3).toFixed(2) : +(best.h + atr * 0.3).toFixed(2);
  const risk = Math.abs(L.c - sl);
  return { dir, entry: +L.c.toFixed(2), sl, target: +(dir === 'LONG' ? L.c + risk * rr : L.c - risk * rr).toFixed(2), risk: +risk.toFixed(2), rr, conf: best.conf, reason: `OB: ${dir === 'LONG' ? 'Bull' : 'Bear'} OB retest (${best.l.toFixed(0)}-${best.h.toFixed(0)})`, strat: 'OB' };
}

export function stratFVG(can, e1, e2, rr) {
  const n = can.length;
  if (n < 5) return { dir: 'WAIT', conf: 0, reason: 'Not enough data', strat: 'FVG' };
  const fvgs = detectFVGs(can), L = can[n - 1], atr = calcATR(can, 14);
  const emaBull = e1[n - 1] > e2[n - 1], buf = atr * 0.3;
  let best = null;
  for (const f of fvgs.filter(v => !v.filled && n - v.idx < 50)) {
    if (f.type === 'bull' && L.l <= f.top + buf && L.l >= f.bot - buf) {
      const conf = emaBull ? 3 : 2;
      if (!best || conf > best.conf) best = { ...f, conf };
    }
    if (f.type === 'bear' && L.h >= f.bot - buf && L.h <= f.top + buf) {
      const conf = !emaBull ? 3 : 2;
      if (!best || conf > best.conf) best = { ...f, conf };
    }
  }
  if (!best) return { dir: 'WAIT', conf: 0, reason: 'FVG: No active gap retest', strat: 'FVG' };
  const dir = best.type === 'bull' ? 'LONG' : 'SHORT';
  const sl = dir === 'LONG' ? +(best.bot - atr * 0.3).toFixed(2) : +(best.top + atr * 0.3).toFixed(2);
  const risk = Math.abs(L.c - sl);
  return { dir, entry: +L.c.toFixed(2), sl, target: +(dir === 'LONG' ? L.c + risk * rr : L.c - risk * rr).toFixed(2), risk: +risk.toFixed(2), rr, conf: best.conf, reason: `FVG: ${dir === 'LONG' ? 'Bull' : 'Bear'} FVG (${best.bot.toFixed(0)}-${best.top.toFixed(0)})`, strat: 'FVG' };
}

export function stratIFVG(can, e1, e2, rr) {
  const n = can.length;
  if (n < 12) return { dir: 'WAIT', conf: 0, reason: 'Not enough data', strat: 'iFVG' };
  const ifvgs = detectIFVGs(can);
  const L = can[n - 1];
  const atr = calcATR(can, 14);
  const emaBull = e1[n - 1] > e2[n - 1];
  let bf = null;
  let sf = null;

  for (const f of ifvgs.filter(v => v.type === 'bull' && v.active && (v.fillIdx ?? 0) > n - 80).reverse()) {
    if (L.c >= f.bot - atr && L.c <= f.top + atr) { bf = f; break; }
  }
  for (const f of ifvgs.filter(v => v.type === 'bear' && v.active && (v.fillIdx ?? 0) > n - 80).reverse()) {
    if (L.c >= f.bot - atr && L.c <= f.top + atr) { sf = f; break; }
  }

  let dir = null;
  let best = null;
  let conf = 0;
  let reason = '';
  if (bf && !sf) {
    dir = 'LONG';
    best = bf;
    conf = emaBull ? 3 : 2;
    reason = `iFVG Bull [${best.bot.toFixed(0)}-${best.top.toFixed(0)}] flipped support${emaBull ? ' +EMA' : ''}`;
  } else if (sf && !bf) {
    dir = 'SHORT';
    best = sf;
    conf = !emaBull ? 3 : 2;
    reason = `iFVG Bear [${best.bot.toFixed(0)}-${best.top.toFixed(0)}] flipped resistance${!emaBull ? ' +EMA' : ''}`;
  } else if (bf && sf) {
    const db = Math.abs(L.c - (bf.bot + bf.top) / 2);
    const ds = Math.abs(L.c - (sf.bot + sf.top) / 2);
    if (db < ds) { dir = 'LONG'; best = bf; conf = 1; }
    else { dir = 'SHORT'; best = sf; conf = 1; }
    reason = 'Nearest iFVG';
  }

  if (!dir || !best) return { dir: 'WAIT', conf: 0, reason: 'No iFVG in range', strat: 'iFVG' };
  const sl = dir === 'LONG' ? +(best.bot - atr * 0.3).toFixed(2) : +(best.top + atr * 0.3).toFixed(2);
  const risk = Math.abs(L.c - sl);
  if (risk < 0.1) return { dir: 'WAIT', conf: 0, reason: 'iFVG risk too small', strat: 'iFVG' };
  return {
    dir,
    entry: +L.c.toFixed(2),
    sl,
    target: +(dir === 'LONG' ? L.c + risk * rr : L.c - risk * rr).toFixed(2),
    risk: +risk.toFixed(2),
    rr,
    conf,
    reason,
    strat: 'iFVG'
  };
}

export function stratOF(can, e1, e2, rr) {
  const n = can.length;
  if (n < 10) return { dir: 'WAIT', conf: 0, reason: 'Not enough data', strat: 'OF*' };
  const recent = can.slice(-5);
  const deltas = recent.map(c => {
    const rng = c.h - c.l || 1;
    const ratio = Math.abs(c.c - c.o) / rng;
    return c.c >= c.o ? ratio * (c.v || 100) : -ratio * (c.v || 100);
  });
  const sumD = deltas.reduce((a, b) => a + b, 0);
  const emaBull = e1[n - 1] > e2[n - 1], L = can[n - 1], atr = calcATR(can, 14);
  const threshold = (can.slice(-5).reduce((s, c) => s + (c.v || 100), 0) / 5) * 0.3;
  let dir = null, conf = 0, reason = '';
  if (sumD > threshold && emaBull) { dir = 'LONG'; conf = sumD > threshold * 2 ? 3 : 2; reason = 'OF*: Synthetic bullish pressure + EMA up'; }
  else if (sumD < -threshold && !emaBull) { dir = 'SHORT'; conf = sumD < -threshold * 2 ? 3 : 2; reason = 'OF*: Synthetic bearish pressure + EMA down'; }
  if (!dir) return { dir: 'WAIT', conf: 0, reason: `OF*: Synthetic delta ${sumD.toFixed(0)} - no edge`, strat: 'OF*' };
  const sl = dir === 'LONG' ? +(L.c - atr * 1.5).toFixed(2) : +(L.c + atr * 1.5).toFixed(2);
  const risk = Math.abs(L.c - sl);
  return { dir, entry: +L.c.toFixed(2), sl, target: +(dir === 'LONG' ? L.c + risk * rr : L.c - risk * rr).toFixed(2), risk: +risk.toFixed(2), rr, conf, reason, strat: 'OF*' };
}

export function stratLS(can, e1, e2, rr) {
  const n = can.length;
  if (n < 15) return { dir: 'WAIT', conf: 0, reason: 'Not enough data', strat: 'LS' };
  const L = can[n - 1], pv = can[n - 2], lookback = can.slice(-15, -1);
  const swingHi = Math.max(...lookback.map(c => c.h)), swingLo = Math.min(...lookback.map(c => c.l));
  const atr = calcATR(can, 14), emaBull = e1[n - 1] > e2[n - 1];
  let dir = null, conf = 0, reason = '';
  if (pv.l < swingLo && L.c > swingLo && emaBull) { dir = 'LONG'; conf = 3; reason = `LS: Sweep below swing low ${swingLo.toFixed(0)}`; }
  else if (pv.h > swingHi && L.c < swingHi && !emaBull) { dir = 'SHORT'; conf = 3; reason = `LS: Sweep above swing high ${swingHi.toFixed(0)}`; }
  if (!dir) return { dir: 'WAIT', conf: 0, reason: 'LS: No sweep', strat: 'LS' };
  const sl = dir === 'LONG' ? +(pv.l - atr * 0.2).toFixed(2) : +(pv.h + atr * 0.2).toFixed(2);
  const risk = Math.abs(L.c - sl);
  return { dir, entry: +L.c.toFixed(2), sl, target: +(dir === 'LONG' ? L.c + risk * rr : L.c - risk * rr).toFixed(2), risk: +risk.toFixed(2), rr, conf, reason, strat: 'LS' };
}

export function stratVWAP(can, e1, e2, rr, vwapData) {
  if (!vwapData || !vwapData.vwap) return { dir: 'WAIT', conf: 0, reason: 'VWAP not calculated', strat: 'VWAP' };
  const n = can.length;
  if (n < 3) return { dir: 'WAIT', conf: 0, reason: 'Not enough data', strat: 'VWAP' };
  const L = can[n - 1], vw = vwapData.vwap[n - 1], sd1u = vwapData.sd1up[n - 1], sd1d = vwapData.sd1dn[n - 1];
  const emaBull = e1[n - 1] > e2[n - 1], atr = calcATR(can, 14), buf = atr * 0.3;
  let dir = null, conf = 0, reason = '';
  if (L.c > vw && Math.abs(L.l - sd1u) < buf && emaBull) { dir = 'LONG'; conf = 3; reason = 'VWAP: +1SD bounce'; }
  else if (L.c < vw && Math.abs(L.h - sd1d) < buf && !emaBull) { dir = 'SHORT'; conf = 3; reason = 'VWAP: -1SD bounce'; }
  else if (L.c > vw && Math.abs(L.l - vw) < buf && emaBull) { dir = 'LONG'; conf = 2; reason = 'VWAP: Retest from above'; }
  else if (L.c < vw && Math.abs(L.h - vw) < buf && !emaBull) { dir = 'SHORT'; conf = 2; reason = 'VWAP: Retest from below'; }
  if (!dir) return { dir: 'WAIT', conf: 0, reason: `VWAP: ${vw ? vw.toFixed(0) : '--'}`, strat: 'VWAP' };
  const sl = dir === 'LONG' ? +(L.c - atr * 1.5).toFixed(2) : +(L.c + atr * 1.5).toFixed(2);
  const risk = Math.abs(L.c - sl);
  return { dir, entry: +L.c.toFixed(2), sl, target: +(dir === 'LONG' ? L.c + risk * rr : L.c - risk * rr).toFixed(2), risk: +risk.toFixed(2), rr, conf, reason, strat: 'VWAP' };
}

export function stratVP(can, e1, e2, rr, vpData) {
  if (!vpData || !vpData.poc) return { dir: 'WAIT', conf: 0, reason: 'Building profile...', strat: 'VP*' };
  const n = can.length, L = can[n - 1], pv = can[n - 2], { poc, vah, val } = vpData;
  const emaBull = e1[n - 1] > e2[n - 1], atr = calcATR(can, 14), buf = atr * 0.3;
  let dir = null, conf = 0, reason = '';
  if (pv.c < poc && L.c > poc + buf && emaBull) { dir = 'LONG'; conf = 3; reason = `VP*: Approx broke above POC ${poc.toFixed(0)}`; }
  else if (pv.c > poc && L.c < poc - buf && !emaBull) { dir = 'SHORT'; conf = 3; reason = `VP*: Approx broke below POC ${poc.toFixed(0)}`; }
  else if (Math.abs(L.c - val) < buf && emaBull) { dir = 'LONG'; conf = 2; reason = `VP*: Approx VAL bounce ${val.toFixed(0)}`; }
  else if (Math.abs(L.c - vah) < buf && !emaBull) { dir = 'SHORT'; conf = 2; reason = `VP*: Approx VAH rejection ${vah.toFixed(0)}`; }
  if (!dir) return { dir: 'WAIT', conf: 0, reason: `VP*: Approx POC ${poc.toFixed(0)} VAH ${vah.toFixed(0)} VAL ${val.toFixed(0)}`, strat: 'VP*' };
  const sl = dir === 'LONG' ? +(poc - atr * 1.0).toFixed(2) : +(poc + atr * 1.0).toFixed(2);
  const risk = Math.abs(L.c - sl);
  return { dir, entry: +L.c.toFixed(2), sl, target: +(dir === 'LONG' ? L.c + risk * rr : L.c - risk * rr).toFixed(2), risk: +risk.toFixed(2), rr, conf, reason, strat: 'VP*' };
}

export function buildCombos(sigs, rr, capital, riskPct) {
  const active = sigs.filter(s => s && s.dir !== 'WAIT');
  const combos = [];
  for (let mask = 3; mask < (1 << active.length); mask++) {
    const sub = active.filter((_, i) => mask & (1 << i));
    if (sub.length < 2) continue;
    const dirs = [...new Set(sub.map(s => s.dir))];
    if (dirs.length > 1) continue;
    const dir = dirs[0];
    const entry = sub.reduce((a, s) => a + s.entry, 0) / sub.length;
    const sl = dir === 'LONG' ? Math.min(...sub.map(s => s.sl)) : Math.max(...sub.map(s => s.sl));
    const risk = Math.abs(entry - sl);
    if (risk < 0.1) continue;
    const target = dir === 'LONG' ? entry + risk * rr : entry - risk * rr;
    const qty = Math.max(1, Math.floor((capital * riskPct / 100) / risk));
    combos.push({
      dir,
      entry: +entry.toFixed(2),
      sl: +sl.toFixed(2),
      target: +target.toFixed(2),
      risk: +risk.toFixed(2),
      rr,
      conf: sub.reduce((a, s) => a + s.conf, 0),
      strats: sub.map(s => s.strat),
      qty,
      maxLoss: +(qty * risk).toFixed(0),
      maxProfit: +(qty * risk * rr).toFixed(0),
      label: sub.map(s => s.strat).join('+'),
      reason: sub.map(s => s.reason).join(' | '),
    });
  }
  return combos.sort((a, b) => b.conf - a.conf || b.strats.length - a.strats.length);
}

export function scanTrades(candles, ema1, ema2, rr, lookback, stratOn) {
  const trades = [];
  const n = candles.length;
  const start = Math.max(50, n - lookback);
  const seen = new Set();

  for (let i = start; i < n - 3; i++) {
    const sl = candles.slice(0, i + 1), e1 = ema1.slice(0, i + 1), e2 = ema2.slice(0, i + 1);
    const sigs = [];
    if (stratOn.ema) { const s = stratEMA(sl, e1, e2, rr); if (s.dir !== 'WAIT') sigs.push(s); }
    if (stratOn.ob) { const s = stratOB(sl, e1, e2, rr); if (s.dir !== 'WAIT') sigs.push(s); }
    if (stratOn.fvg) { const s = stratFVG(sl, e1, e2, rr); if (s.dir !== 'WAIT') sigs.push(s); }
    if (stratOn.ifvg) { const s = stratIFVG(sl, e1, e2, rr); if (s.dir !== 'WAIT') sigs.push(s); }
    if (stratOn.of) { const s = stratOF(sl, e1, e2, rr); if (s.dir !== 'WAIT') sigs.push(s); }
    if (stratOn.ls) { const s = stratLS(sl, e1, e2, rr); if (s.dir !== 'WAIT') sigs.push(s); }
    if (stratOn.vwap) { const vd = calcAnchoredVWAP(sl); const s = stratVWAP(sl, e1, e2, rr, vd); if (s.dir !== 'WAIT') sigs.push(s); }
    if (stratOn.vp) { const vd = calcVolumeProfile(sl); const s = stratVP(sl, e1, e2, rr, vd); if (s.dir !== 'WAIT') sigs.push(s); }
    if (!sigs.length) continue;

    const allSigs = [...sigs.map(s => ({ ...s, strats: [s.strat] }))];
    for (let mask = 3; mask < (1 << sigs.length); mask++) {
      const sub = sigs.filter((_, j) => mask & (1 << j));
      if (sub.length < 2) continue;
      const dirs = [...new Set(sub.map(s => s.dir))];
      if (dirs.length > 1) continue;
      const dir = dirs[0], entry = sub.reduce((a, s) => a + s.entry, 0) / sub.length;
      const sl2 = dir === 'LONG' ? Math.min(...sub.map(s => s.sl)) : Math.max(...sub.map(s => s.sl));
      const risk = Math.abs(entry - sl2);
      if (risk < 0.1) continue;
      allSigs.push({
        dir,
        strats: sub.map(s => s.strat),
        entry: +entry.toFixed(2),
        sl: +sl2.toFixed(2),
        target: +(dir === 'LONG' ? entry + risk * rr : entry - risk * rr).toFixed(2),
        risk: +risk.toFixed(2),
        rr,
        conf: sub.reduce((a, s) => a + s.conf, 0),
        reason: sub.map(s => s.reason).join(' | '),
      });
    }

    for (const sig of allSigs) {
      const key = i + '|' + sig.strats.join('+');
      if (seen.has(key)) continue;
      seen.add(key);
      let outcome = 'OPEN', exitPrice = null;
      for (const fc of candles.slice(i + 1, i + 61)) {
        if (sig.dir === 'LONG') {
          if (fc.l <= sig.sl) { outcome = 'LOSS'; exitPrice = sig.sl; break; }
          if (fc.h >= sig.target) { outcome = 'WIN'; exitPrice = sig.target; break; }
        } else {
          if (fc.h >= sig.sl) { outcome = 'LOSS'; exitPrice = sig.sl; break; }
          if (fc.l <= sig.target) { outcome = 'WIN'; exitPrice = sig.target; break; }
        }
      }
      const pnl = exitPrice != null ? (sig.dir === 'LONG' ? exitPrice - sig.entry : sig.entry - exitPrice) : null;
      trades.push({
        barIdx: i,
        time: candles[i].t,
        strats: sig.strats,
        label: sig.strats.join('+'),
        dir: sig.dir,
        entry: sig.entry,
        sl: sig.sl,
        target: sig.target,
        risk: sig.risk,
        rr,
        conf: sig.conf,
        outcome,
        exitPrice,
        pnl: pnl ? +pnl.toFixed(2) : null,
        reason: sig.reason || '',
        missed: sig.strats.length >= 2 && sig.conf >= 4 && outcome === 'WIN',
      });
    }
  }
  return trades.sort((a, b) => b.time - a.time).slice(0, 300);
}
