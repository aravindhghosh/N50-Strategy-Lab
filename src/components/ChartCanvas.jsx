import React, { useRef, useEffect } from 'react';
import useStore from '../store/useStore';
import { cssVar } from '../utils/indicators';

const PAD = { t: 12, r: 70, b: 34, l: 6 };

// View state (mutable, not in React state for perf)
const V = { s: 0, e: 0, pLo: null, pHi: null, drag: false, dtype: '', dx: 0, dy: 0, dvs: 0, dve: 0, dpLo: 0, dpHi: 0, mmDrag: false, mmStartX: 0, mmStartS: 0, mmStartE: 0 };
let G_ref = { candles: [], ema1: [], ema2: [], obs: [], fvgs: [], session: {}, vwapData: null, vpData: null, layers: {}, results: null, hoverIdx: -1, emaFast: 9, emaSlow: 21, tf: '15', _vis: null, _vs: 0, _xOf: null, _yOf: null, _pLo: 0, _pHi: 1, _cW: 0, _cH: 0, _barCount: 0, lsMarks: [] };

export default function ChartCanvas({ onNavInfo }) {
  const canvasRef = useRef(null);
  const mmCanvasRef = useRef(null);
  const mmWrapRef = useRef(null);
  const mmVpRef = useRef(null);
  const wrapRef = useRef(null);
  const tooltipRef = useRef(null);
  const drawScheduled = useRef(false);

  const store = useStore();

  // Sync G_ref from store
  useEffect(() => {
    G_ref = { ...G_ref, candles: store.candles, ema1: store.ema1, ema2: store.ema2, obs: store.obs, fvgs: store.fvgs, session: store.session, vwapData: store.vwapData, vpData: store.vpData, layers: store.layers, results: store.results, emaFast: store.emaFast, emaSlow: store.emaSlow, tf: store.tf };
  }, [store.candles, store.ema1, store.ema2, store.obs, store.fvgs, store.session, store.vwapData, store.vpData, store.layers, store.results, store.emaFast, store.emaSlow, store.tf]);

  useEffect(() => {
    const can = store.candles || [];
    if (!can.length) {
      G_ref = { ...G_ref, lsMarks: [] };
      return;
    }
    const marks = [];
    for (let i = 16; i < can.length; i++) {
      const L = can[i];
      const pv = can[i - 1];
      if (!L || !pv) continue;
      const lookback = can.slice(i - 15, i - 1);
      if (lookback.length < 8) continue;
      const swingHi = Math.max(...lookback.map(c => c.h));
      const swingLo = Math.min(...lookback.map(c => c.l));
      if (pv.l < swingLo && L.c > swingLo) marks.push({ idx: i, dir: 'LONG', p: Math.min(pv.l, L.l) });
      if (pv.h > swingHi && L.c < swingHi) marks.push({ idx: i, dir: 'SHORT', p: Math.max(pv.h, L.h) });
    }
    G_ref = { ...G_ref, lsMarks: marks };
  }, [store.candles]);

  function scheduleDraw() {
    if (!drawScheduled.current) {
      drawScheduled.current = true;
      requestAnimationFrame(() => { drawScheduled.current = false; drawChart(); drawMini(); });
    }
  }

  function initView() {
    const n = G_ref.candles.length; if (!n) return;
    V.s = Math.max(0, n - 110); V.e = n; V.pLo = null; V.pHi = null;
  }

  function clampView() {
    const n = G_ref.candles.length; if (!n) return;
    let { s, e } = V, sp = e - s;
    if (sp < 8) e = s + 8;
    if (sp > n) { s = 0; e = n; }
    if (s < 0) { e += -s; s = 0; }
    if (e > n) { s -= e - n; e = n; }
    V.s = Math.max(0, Math.round(s)); V.e = Math.min(n, Math.round(e));
  }

  function zoomView(factor, pivotFrac) {
    if (!G_ref.candles.length) return;
    const frac = pivotFrac ?? 0.9, span = V.e - V.s;
    const newSpan = Math.max(8, Math.min(G_ref.candles.length, Math.round(span / factor)));
    const anchor = V.s + span * frac;
    V.s = anchor - newSpan * frac; V.e = anchor + newSpan * (1 - frac);
    V.pLo = null; V.pHi = null;
    clampView(); scheduleDraw();
  }

  function drawChart() {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const W = wrap.offsetWidth || 800, H = wrap.offsetHeight || 400, chartH = H - 32;
    canvas.width = W; canvas.height = chartH;
    const ctx = canvas.getContext('2d');

    if (!G_ref.candles.length) {
      ctx.fillStyle = cssVar('--chart-bg'); ctx.fillRect(0, 0, W, chartH);
      ctx.fillStyle = cssVar('--t3'); ctx.font = "12px 'JetBrains Mono',monospace"; ctx.textAlign = 'center';
      ctx.fillText('Click ▶ SCAN STRATEGIES to load chart', W / 2, chartH / 2);
      return;
    }

    clampView(); updateNavInfo();
    const cW = W - PAD.l - PAD.r, cH = chartH - PAD.t - PAD.b;
    const vs = V.s, ve = V.e, vis = G_ref.candles.slice(vs, ve);
    if (!vis.length) return;
    const e1v = G_ref.ema1.slice(vs, ve), e2v = G_ref.ema2.slice(vs, ve);
    const vwap = G_ref.vwapData ? G_ref.vwapData.vwap.slice(vs, ve) : [];
    const sd1u = G_ref.vwapData ? G_ref.vwapData.sd1up.slice(vs, ve) : [];
    const sd1d = G_ref.vwapData ? G_ref.vwapData.sd1dn.slice(vs, ve) : [];

    let pLo = V.pLo, pHi = V.pHi;
    if (pLo === null) {
      let lo = Infinity, hi = -Infinity;
      vis.forEach(c => { if (c.l < lo) lo = c.l; if (c.h > hi) hi = c.h; });
      const s = G_ref.session;
      [s.pc, s.ph, s.pl, s.do_, s.dh, s.dl].forEach(v => { if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } });
      const best = G_ref.results?.combos?.[0];
      if (best && best.dir !== 'WAIT') { if (best.sl < lo) lo = best.sl; if (best.target > hi) hi = best.target; }
      const pad = (hi - lo) * 0.06; pLo = lo - pad; pHi = hi + pad;
    }
    const pRng = pHi - pLo || 1;
    const barCount = vis.length;
    const xOf = i => PAD.l + (barCount <= 1 ? cW / 2 : (i / (barCount - 1)) * cW);
    const yOf = p => PAD.t + (1 - (p - pLo) / pRng) * cH;
    const barW = Math.max(1, (cW / barCount) * 0.6);
    G_ref._vis = vis; G_ref._vs = vs; G_ref._xOf = xOf; G_ref._yOf = yOf;
    G_ref._pLo = pLo; G_ref._pHi = pHi; G_ref._cW = cW; G_ref._cH = cH; G_ref._barCount = barCount;

    ctx.fillStyle = cssVar('--chart-bg'); ctx.fillRect(0, 0, W, chartH);
    ctx.strokeStyle = cssVar('--grid'); ctx.lineWidth = 1;
    for (let g = 0; g <= 6; g++) { const y = PAD.t + (cH / 6) * g; ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + cW, y); ctx.stroke(); }
    const tStep = Math.max(1, Math.floor(barCount / 8));
    for (let i = 0; i < barCount; i += tStep) { const x = xOf(i); ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, PAD.t + cH); ctx.stroke(); }

    ctx.save(); ctx.beginPath(); ctx.rect(PAD.l - 1, PAD.t - 1, cW + 2, cH + 2); ctx.clip();

    // Session Levels
    if (G_ref.layers.lvl) {
      const s = G_ref.session;
      [{ v: s.pc, color: 'rgba(90,122,154,0.7)', dash: [6, 4] }, { v: s.do_, color: 'rgba(249,115,22,0.8)', dash: [6, 4] }, { v: s.dh, color: 'rgba(0,232,122,0.6)', dash: [4, 4] }, { v: s.dl, color: 'rgba(255,45,85,0.6)', dash: [4, 4] }, { v: s.ph, color: 'rgba(255,200,50,0.7)', dash: [8, 4] }, { v: s.pl, color: 'rgba(249,115,22,0.6)', dash: [8, 4] }]
        .forEach(lv => { if (lv.v == null) return; const y = yOf(lv.v); if (y < PAD.t - 2 || y > PAD.t + cH + 2) return; ctx.save(); ctx.strokeStyle = lv.color; ctx.lineWidth = 1; ctx.setLineDash(lv.dash); ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + cW, y); ctx.stroke(); ctx.restore(); });
    }

    // FVGs
    if (G_ref.layers.fvg) {
      G_ref.fvgs.filter(f => f.idx >= vs - 2 && f.idx <= ve && !(f.filled && f.fillIdx && f.fillIdx < vs)).forEach(f => {
        const isBull = f.type === 'bull', y1 = yOf(f.top), y2 = yOf(f.bot), h = y2 - y1;
        if (h < 0.5) return;
        const fi = f.idx - vs, endBar = f.filled && f.fillIdx ? Math.min(f.fillIdx - vs, fi + 20) : fi + 15;
        const cappedEnd = Math.min(endBar, barCount - 1);
        const x1 = fi >= 0 ? xOf(Math.max(0, fi - 1)) : PAD.l, x2 = cappedEnd >= 0 ? xOf(Math.max(0, cappedEnd)) + barW / 2 : PAD.l + 4;
        if (x2 <= x1) return;
        ctx.save(); ctx.globalAlpha = f.filled ? 0.3 : 0.85;
        ctx.fillStyle = isBull ? cssVar('--fvg-bull-fill') : cssVar('--fvg-bear-fill'); ctx.fillRect(x1, y1, x2 - x1, h);
        const bc = isBull ? cssVar('--fvg-bull-border') : cssVar('--fvg-bear-border');
        ctx.strokeStyle = bc; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, y2); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1, y2); ctx.stroke();
        if (h > 10) { ctx.globalAlpha = f.filled ? 0.4 : 1; ctx.fillStyle = bc; ctx.font = "bold 7px 'JetBrains Mono',monospace"; ctx.textAlign = 'left'; ctx.fillText((isBull ? 'FVG+' : 'FVG-') + (f.filled ? ' ✓' : ''), x1 + 4, (y1 + y2) / 2 + 3); }
        ctx.restore();
      });
    }

    // OBs
    if (G_ref.layers.ob) {
      G_ref.obs.filter(o => o.idx <= ve && (o.endIdx === null ? true : o.endIdx >= vs)).forEach(o => {
        const isBull = o.type === 'bull', y1 = yOf(o.h), y2 = yOf(o.l), h = y2 - y1;
        if (h < 0.5) return;
        const oi = o.idx - vs;
        const endBarVis = o.active ? barCount - 1 : o.endIdx !== null ? Math.min(o.endIdx - vs, oi + 20) : oi + 20;
        const x1 = oi >= 0 ? xOf(Math.max(0, oi)) - barW / 2 : PAD.l, x2 = xOf(Math.max(0, Math.min(endBarVis, barCount - 1))) + barW / 2;
        if (x2 <= x1) return;
        ctx.save(); ctx.globalAlpha = o.active ? 0.9 : 0.4;
        ctx.fillStyle = isBull ? cssVar('--ob-bull-fill') : cssVar('--ob-bear-fill'); ctx.fillRect(x1, y1, x2 - x1, h);
        const bc = isBull ? cssVar('--ob-bull-border') : cssVar('--ob-bear-border');
        ctx.fillStyle = bc; ctx.fillRect(x1, y1, 3, h);
        ctx.strokeStyle = bc; ctx.lineWidth = o.active ? 1.5 : 1; ctx.setLineDash(o.active ? [] : [5, 3]); ctx.strokeRect(x1, y1, x2 - x1, h); ctx.setLineDash([]);
        if (h > 6 || o.active) { const lbl = (isBull ? 'B-OB' : 'S-OB') + (o.active ? '' : ' ✗'); ctx.globalAlpha = o.active ? 1 : 0.6; ctx.fillStyle = bc; ctx.font = "bold 8px 'JetBrains Mono',monospace"; ctx.textAlign = 'left'; ctx.fillText(lbl, Math.max(x1 + 4, PAD.l + 2), Math.max(y1 - 4, PAD.t + 10)); }
        ctx.restore();
      });
    }

    // Liquidity Sweep markers
    if (G_ref.layers.ls) {
      const marks = (G_ref.lsMarks || []).filter(m => m.idx >= vs && m.idx < ve);
      marks.forEach(m => {
        const li = m.idx - vs;
        if (li < 0 || li >= barCount) return;
        const x = xOf(li);
        const y = m.dir === 'LONG' ? yOf(m.p) + 9 : yOf(m.p) - 9;
        const color = m.dir === 'LONG' ? cssVar('--green') : cssVar('--red');
        const lbl = m.dir === 'LONG' ? 'LS↑' : 'LS↓';
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(10,15,26,0.7)';
        ctx.lineWidth = 2;
        ctx.font = "bold 9px 'JetBrains Mono',monospace";
        ctx.textAlign = 'center';
        ctx.strokeText(lbl, x, y);
        ctx.fillText(lbl, x, y);
        ctx.restore();
      });
    }

    // VWAP
    if (G_ref.layers.vwap && vwap.length) {
      const drawLine = (arr, color, lw, dash = []) => {
        ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath(); let started = false;
        arr.forEach((v, i) => {
          if (v == null) return;
          const x = xOf(i), y = yOf(v);
          if (started) ctx.lineTo(x, y);
          else { ctx.moveTo(x, y); started = true; }
        });
        ctx.stroke(); ctx.setLineDash([]);
      };
      drawLine(vwap, '#00bfae', 1.5); drawLine(sd1u, 'rgba(0,191,174,0.4)', 1, [4, 3]); drawLine(sd1d, 'rgba(0,191,174,0.4)', 1, [4, 3]);
    }

    // VP POC
    if (G_ref.layers.vp && G_ref.vpData?.poc) {
      const y = yOf(G_ref.vpData.poc);
      if (y >= PAD.t && y <= PAD.t + cH) { ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 3]); ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + cW, y); ctx.stroke(); ctx.setLineDash([]); }
    }

    // EMA lines
    if (G_ref.layers.ema) {
      const drawEMA = (arr, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let s2 = false;
        arr.forEach((v, i) => {
          if (v == null) return;
          const x = xOf(i), y = yOf(v);
          if (s2) ctx.lineTo(x, y);
          else { ctx.moveTo(x, y); s2 = true; }
        });
        ctx.stroke();
      };
      drawEMA(e1v, cssVar('--yellow')); drawEMA(e2v, cssVar('--blue'));
    }

    // Signal overlay
    const best = G_ref.results?.combos?.[0];
    if (G_ref.layers.sig && best && best.dir !== 'WAIT') {
      const ep = yOf(best.entry), sp = yOf(best.sl), tp = yOf(best.target);
      const isLong = best.dir === 'LONG';
      const [y1s, y2s] = isLong ? [sp, ep] : [ep, sp]; const [y1t, y2t] = isLong ? [ep, tp] : [tp, ep];
      ctx.fillStyle = 'rgba(255,45,85,0.06)'; ctx.fillRect(PAD.l, y1s, cW, y2s - y1s);
      ctx.fillStyle = 'rgba(0,232,122,0.06)'; ctx.fillRect(PAD.l, y1t, cW, y2t - y1t);
      [{ y: ep, c: '#00ccf5', w: 1.5, d: [] }, { y: sp, c: '#ff2d55', w: 1, d: [4, 3] }, { y: tp, c: '#00e87a', w: 1, d: [4, 3] }].forEach(lv => { ctx.strokeStyle = lv.c; ctx.lineWidth = lv.w; ctx.setLineDash(lv.d); ctx.beginPath(); ctx.moveTo(PAD.l, lv.y); ctx.lineTo(PAD.l + cW, lv.y); ctx.stroke(); ctx.setLineDash([]); });
    }

    // Candles
    vis.forEach((c, i) => {
      const x = xOf(i), bull = c.c >= c.o;
      const col = bull ? cssVar('--candle-up') : cssVar('--candle-dn');
      const top = yOf(Math.max(c.o, c.c)), bot = yOf(Math.min(c.o, c.c)), candH = Math.max(1, bot - top);
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, yOf(c.h)); ctx.lineTo(x, yOf(c.l)); ctx.stroke();
      ctx.fillStyle = col; ctx.fillRect(x - barW / 2, top, barW, candH);
    });

    // Hover crosshair
    if (G_ref.hoverIdx >= 0 && G_ref.hoverIdx < barCount) {
      const hx = xOf(G_ref.hoverIdx), c = vis[G_ref.hoverIdx], hy = yOf(c.c);
      ctx.strokeStyle = 'rgba(90,122,154,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(hx, PAD.t); ctx.lineTo(hx, PAD.t + cH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD.l, hy); ctx.lineTo(PAD.l + cW, hy); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = '#00ccf5'; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Right axis
    ctx.textAlign = 'left'; ctx.font = "9px 'JetBrains Mono',monospace";
    for (let g = 0; g <= 6; g++) { const y = PAD.t + (cH / 6) * g, pv = pHi - (pRng / 6) * g; ctx.fillStyle = cssVar('--t3'); ctx.fillText(pv.toFixed(0), PAD.l + cW + 4, y + 3); }
    if (G_ref.layers.sig && best && best.dir !== 'WAIT') {
      [{ p: best.sl, c: '#ff2d55', l: 'SL' }, { p: best.entry, c: '#00ccf5', l: 'E' }, { p: best.target, c: '#00e87a', l: 'T' }].forEach(lv => { const y = yOf(lv.p); if (y < PAD.t || y > PAD.t + cH) return; ctx.fillStyle = lv.c; ctx.font = "bold 9px 'JetBrains Mono',monospace"; ctx.fillText(lv.l + ' ' + lv.p.toFixed(0), PAD.l + cW + 4, y + 3); });
    }
    if (G_ref.layers.lvl) {
      const s = G_ref.session;
      [{ v: s.pc, c: 'rgba(90,122,154,0.9)', l: 'PC' }, { v: s.do_, c: 'rgba(249,115,22,0.9)', l: 'DO' }, { v: s.dh, c: 'rgba(0,232,122,0.9)', l: 'DH' }, { v: s.dl, c: 'rgba(255,45,85,0.9)', l: 'DL' }, { v: s.ph, c: 'rgba(255,200,50,0.9)', l: 'PH' }, { v: s.pl, c: 'rgba(249,115,22,0.8)', l: 'PL' }].forEach(lv => { if (lv.v == null) return; const y = yOf(lv.v); if (y < PAD.t || y > PAD.t + cH) return; ctx.fillStyle = lv.c; ctx.font = "8px 'JetBrains Mono',monospace"; ctx.fillText(lv.l + ' ' + lv.v.toFixed(0), PAD.l + cW + 4, y + 3); });
    }
    if (G_ref.layers.ema) {
      const lv1 = e1v.filter(v => v != null).pop(), lv2 = e2v.filter(v => v != null).pop();
      if (lv1 != null) { const y = yOf(lv1); if (y > PAD.t && y < PAD.t + cH) { ctx.fillStyle = cssVar('--yellow'); ctx.font = "bold 9px 'JetBrains Mono',monospace"; ctx.fillText('E' + G_ref.emaFast, PAD.l + cW + 4, y - 2); } }
      if (lv2 != null) { const y = yOf(lv2); if (y > PAD.t && y < PAD.t + cH) { ctx.fillStyle = cssVar('--blue'); ctx.font = "bold 9px 'JetBrains Mono',monospace"; ctx.fillText('E' + G_ref.emaSlow, PAD.l + cW + 4, y + 11); } }
    }
    ctx.textAlign = 'center'; ctx.fillStyle = cssVar('--t3'); ctx.font = "8px 'JetBrains Mono',monospace";
    for (let i = 0; i < barCount; i += tStep) { const d = new Date(vis[i].t); const lbl = G_ref.tf === 'D' ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }); ctx.fillText(lbl, xOf(i), chartH - 34 + 10); }
  }

  function drawMini() {
    const mm = mmCanvasRef.current, wrap = mmWrapRef.current, vp = mmVpRef.current;
    if (!mm || !wrap || !vp) return;
    const W = wrap.offsetWidth || 400, H = 32;
    mm.width = W; mm.height = H;
    const ctx = mm.getContext('2d');
    ctx.fillStyle = cssVar('--p2'); ctx.fillRect(0, 0, W, H);
    const can = G_ref.candles; if (!can.length) return;
    const n = can.length; let lo = Infinity, hi = -Infinity;
    can.forEach(c => { if (c.l < lo) lo = c.l; if (c.h > hi) hi = c.h; });
    const pRng = hi - lo || 1;
    const xOf = i => (i / Math.max(1, n - 1)) * W, yOf = p => H - 2 - ((p - lo) / pRng) * (H - 4);
    ctx.strokeStyle = cssVar('--cyan'); ctx.lineWidth = 1; ctx.beginPath();
    can.forEach((c, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(c.c)) : ctx.lineTo(xOf(i), yOf(c.c)); });
    ctx.stroke();
    vp.style.left = (V.s / n) * W + 'px';
    vp.style.width = Math.max(4, ((V.e - V.s) / n) * W) + 'px';
    updateNavInfo();
  }

  function updateNavInfo() {
    const n = G_ref.candles.length; if (!n || !onNavInfo) return;
    const vs = G_ref.candles[V.s], ve = G_ref.candles[Math.min(V.e - 1, n - 1)];
    if (!vs || !ve) return;
    const fmt = d => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    onNavInfo(fmt(new Date(vs.t)) + ' → ' + fmt(new Date(ve.t)) + ' [' + (V.e - V.s) + ' bars]');
  }

  function showTooltip(e, idx) {
    const tip = tooltipRef.current; if (!tip || idx < 0 || !G_ref._vis) return;
    const c = G_ref._vis[idx], fi = G_ref._vs + idx;
    const e1v = G_ref.ema1[fi], e2v = G_ref.ema2[fi];
    const d = new Date(c.t);
    const ts = G_ref.tf === 'D' ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
    const bull = c.c >= c.o;
    tip.innerHTML = `<div style="font-size:8px;color:var(--t3);margin-bottom:3px;border-bottom:1px solid var(--b1);padding-bottom:3px">${ts}</div>
      <span style="display:flex;justify-content:space-between;gap:12px"><b style="color:${bull ? 'var(--green)' : 'var(--red)'}">${bull ? '▲' : '▼'} ${c.c.toFixed(2)}</b></span>
      <span style="display:flex;justify-content:space-between;gap:12px"><b>O</b><b>${c.o.toFixed(2)}</b></span>
      <span style="display:flex;justify-content:space-between;gap:12px"><b>H</b><b style="color:var(--green)">${c.h.toFixed(2)}</b></span>
      <span style="display:flex;justify-content:space-between;gap:12px"><b>L</b><b style="color:var(--red)">${c.l.toFixed(2)}</b></span>
      <span style="display:flex;justify-content:space-between;gap:12px"><b>V</b><b>${c.v >= 1000 ? (c.v / 1000).toFixed(1) + 'K' : c.v}</b></span>
      <span style="display:flex;justify-content:space-between;gap:12px"><b style="color:var(--yellow)">E${G_ref.emaFast}</b><b>${e1v != null ? e1v.toFixed(1) : '--'}</b></span>
      <span style="display:flex;justify-content:space-between;gap:12px"><b style="color:var(--blue)">E${G_ref.emaSlow}</b><b>${e2v != null ? e2v.toFixed(1) : '--'}</b></span>`;
    tip.style.display = 'block';
    const wr = wrapRef.current?.getBoundingClientRect();
    if (!wr) return;
    let x = e.clientX - wr.left + 14, y = e.clientY - wr.top - 20;
    if (x + 160 > wr.width) x = e.clientX - wr.left - 175;
    if (y < 0) y = 5;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  // Interaction setup
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current, mmWrap = mmWrapRef.current, vp = mmVpRef.current;
    if (!canvas || !wrap) return;
    function inCanvas(e) {
      const r = canvas.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    }
    function onWheel(e) {
      if (!inCanvas(e) || !G_ref.candles.length) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - r.left - PAD.l) / Math.max(1, canvas.offsetWidth - PAD.l - PAD.r)));
      zoomView(e.deltaY < 0 ? 1.25 : 0.8, frac);
    }
    function onMouseDown(e) {
      if (!inCanvas(e) || !G_ref.candles.length || e.button !== 0) return;
      V.drag = true; V.dtype = e.shiftKey ? 'price' : 'pan';
      V.dx = e.clientX; V.dy = e.clientY; V.dvs = V.s; V.dve = V.e;
      V.dpLo = V.pLo !== null ? V.pLo : G_ref._pLo || 0;
      V.dpHi = V.pHi !== null ? V.pHi : G_ref._pHi || 1;
      canvas.style.cursor = V.dtype === 'price' ? 'ns-resize' : 'grabbing';
    }
    function onMouseMove(e) {
      if (V.mmDrag) return;
      if (V.drag) {
        if (V.dtype === 'pan') {
          const cW = canvas.offsetWidth - PAD.l - PAD.r, span = V.dve - V.dvs;
          const delta = Math.round(-(e.clientX - V.dx) * (span / Math.max(1, cW)));
          V.s = V.dvs + delta; V.e = V.dve + delta; V.pLo = null; V.pHi = null;
          clampView(); scheduleDraw();
        } else {
          const cH = canvas.offsetHeight - PAD.t - PAD.b;
          const ratio = Math.max(0.1, 1 + (e.clientY - V.dy) / Math.max(1, cH));
          const mid = (V.dpLo + V.dpHi) / 2, half = (V.dpHi - V.dpLo) / 2;
          V.pLo = mid - half * ratio; V.pHi = mid + half * ratio;
          requestAnimationFrame(drawChart);
        }
        return;
      }
      if (!G_ref._vis?.length) return;
      if (!inCanvas(e)) { if (tooltipRef.current) tooltipRef.current.style.display = 'none'; return; }
      const r = canvas.getBoundingClientRect(), cW = canvas.offsetWidth - PAD.l - PAD.r;
      const frac = Math.max(0, Math.min(1, (e.clientX - r.left - PAD.l) / Math.max(1, cW)));
      const idx = Math.round(frac * (G_ref._barCount - 1));
      if (idx !== G_ref.hoverIdx) { G_ref.hoverIdx = idx; requestAnimationFrame(drawChart); }
      showTooltip(e, idx);
    }
    function onMouseUp() { V.drag = false; canvas.style.cursor = 'crosshair'; }
    function onMouseLeave() { if (G_ref.hoverIdx !== -1) { G_ref.hoverIdx = -1; if (tooltipRef.current) tooltipRef.current.style.display = 'none'; requestAnimationFrame(drawChart); } }
    function onDblClick(e) { if (!inCanvas(e) || !G_ref.candles.length) return; initView(); V.pLo = null; V.pHi = null; scheduleDraw(); }
    function onResize() { if (G_ref.candles.length) scheduleDraw(); }

    // Minimap drag
    function onMmMouseDown(e) { if (!G_ref.candles.length) return; e.stopPropagation(); V.mmDrag = true; V.mmStartX = e.clientX; V.mmStartS = V.s; V.mmStartE = V.e; }
    function onMmMouseMove(e) {
      if (!V.mmDrag || !G_ref.candles.length) return;
      const mmW = mmWrap?.offsetWidth || 400, n = G_ref.candles.length;
      const delta = Math.round((e.clientX - V.mmStartX) / mmW * n);
      V.s = V.mmStartS + delta; V.e = V.mmStartE + delta; V.pLo = null; V.pHi = null; clampView(); scheduleDraw();
    }
    function onMmMouseUp() { V.mmDrag = false; }
    function onMmClick(e) {
      if (!G_ref.candles.length || V.mmDrag) return;
      const mmW = mmWrap?.offsetWidth || 400, n = G_ref.candles.length, span = V.e - V.s;
      const frac = e.offsetX / mmW; V.s = Math.round(frac * n - span / 2); V.e = V.s + span;
      V.pLo = null; V.pHi = null; clampView(); scheduleDraw();
    }

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('dblclick', onDblClick);
    window.addEventListener('resize', onResize);
    if (vp) { vp.addEventListener('mousedown', onMmMouseDown); window.addEventListener('mousemove', onMmMouseMove); window.addEventListener('mouseup', onMmMouseUp); }
    if (mmWrap) mmWrap.addEventListener('click', onMmClick);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('resize', onResize);
      if (vp) { vp.removeEventListener('mousedown', onMmMouseDown); window.removeEventListener('mousemove', onMmMouseMove); window.removeEventListener('mouseup', onMmMouseUp); }
      if (mmWrap) mmWrap.removeEventListener('click', onMmClick);
    };
  }, []);

  // Redraw on data change
  useEffect(() => {
    if (store.candles.length) { initView(); }
    scheduleDraw();
  }, [store.candles, store.ema1, store.ema2, store.obs, store.fvgs, store.session, store.vwapData, store.vpData, store.layers, store.results, store.emaFast, store.emaSlow, store.darkMode]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const navStep = delta => { if (!G_ref.candles.length) return; V.s += delta; V.e += delta; V.pLo = null; V.pHi = null; clampView(); scheduleDraw(); };
  const navJump = where => { if (!G_ref.candles.length) return; const n = G_ref.candles.length, span = V.e - V.s; if (where === 'start') { V.s = 0; V.e = span; } else { V.s = n - span; V.e = n; } V.pLo = null; V.pHi = null; clampView(); scheduleDraw(); };

  return (
    <div ref={wrapRef} style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden', background: 'var(--chart-bg)' }}>
      <canvas ref={canvasRef} style={{ display: 'block', cursor: 'crosshair' }} />

      {/* Legend */}
      <div style={{ position: 'absolute', top: 8, left: 10, display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none', zIndex: 5, flexWrap: 'wrap' }}>
        {[['EMA Fast', 'var(--yellow)', 'line'], ['EMA Slow', 'var(--blue)', 'line'], ['Bull OB', 'var(--ob-bull-fill)', 'box', 'var(--ob-bull-border)'], ['Bear OB', 'var(--ob-bear-fill)', 'box', 'var(--ob-bear-border)'], ['Bull FVG', 'var(--fvg-bull-fill)', 'box', 'var(--fvg-bull-border)'], ['Bear FVG', 'var(--fvg-bear-fill)', 'box', 'var(--fvg-bear-border)'], ['LS', '#f7c59f', 'line'], ['VWAP', '#00bfae', 'line'], ['POC', '#f97316', 'line']].map(([l, c, t, bc]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--t2)' }}>
            {t === 'line' ? <div style={{ width: 14, height: 2, borderRadius: 1, background: c }} /> : <div style={{ width: 10, height: 10, borderRadius: 2, background: c, border: `1px solid ${bc}` }} />}
            {l}
          </div>
        ))}
      </div>

      <div id="chart-tooltip" ref={tooltipRef} />

      {/* Date navigator */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, background: 'var(--p1)', borderTop: '1px solid var(--b1)', display: 'flex', alignItems: 'center', zIndex: 10 }}>
        {[['◀◀', () => navStep(-50)], ['◀', () => navStep(-10)]].map(([l, fn]) => (
          <div key={l} onClick={fn} style={{ width: 28, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--p2)', borderRight: '1px solid var(--b1)', color: 'var(--t2)', cursor: 'pointer', fontSize: 12, flexShrink: 0, userSelect: 'none' }}>{l}</div>
        ))}
        <div ref={mmWrapRef} style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
          <canvas ref={mmCanvasRef} style={{ display: 'block' }} />
          <div id="mm-viewport" ref={mmVpRef} />
        </div>
        {[['▶', () => navStep(10)], ['▶▶', () => navStep(50)], ['⏮', () => navJump('start')], ['⏭', () => navJump('end')]].map(([l, fn]) => (
          <div key={l} onClick={fn} style={{ width: 28, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--p2)', borderLeft: '1px solid var(--b1)', color: 'var(--t2)', cursor: 'pointer', fontSize: 12, flexShrink: 0, userSelect: 'none' }}>{l}</div>
        ))}
      </div>
    </div>
  );
}
