import React, { useState, useCallback, useEffect, useRef } from 'react';
import useStore from './store/useStore';
import { fetchYF, fetchSession, simSession } from './utils/dataFetch';
import {
  calcEMA, detectOBs, detectFVGs, detectIFVGs, calcAnchoredVWAP, calcVolumeProfile,
  stratEMA, stratOB, stratFVG, stratIFVG, stratOF, stratLS, stratVWAP, stratVP,
  buildCombos, scanTrades
} from './utils/indicators';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import ChartToolbar from './components/ChartToolbar';
import ChartCanvas from './components/ChartCanvas';
import BottomPanel from './components/BottomPanel';
import RightPanel from './components/RightPanel';
import GuideModal from './components/GuideModal';
import InsightsModal from './components/InsightsModal';
import PortfolioFab from './components/PortfolioFab';

export default function App() {
  const [showGuide, setShowGuide] = useState(false);
  const [insightType, setInsightType] = useState(null);
  const [navInfo, setNavInfo] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const { sym, tf, setData, setResults, setScanning, addLog, clearLog } = useStore();

  const runScanRef = useRef(null);
  const queuedScanRef = useRef(false);
  const lastAutoKeyRef = useRef('');
  const autoFullTimerRef = useRef(null);
  const autoDebounceTimerRef = useRef(null);
  const pollTickRef = useRef(0);
  const runTokenRef = useRef(0);
  const backtestTokenRef = useRef(0);
  const dataCacheRef = useRef(new Map());
  const sessionCacheRef = useRef(new Map());
  const isMarketOpenIST = () => {
    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const h = ist.getHours();
    const m = ist.getMinutes();
    const d = ist.getDay();
    return d >= 1 && d <= 5 && (h > 9 || (h === 9 && m >= 15)) && (h < 15 || (h === 15 && m <= 30));
  };

  const runScan = useCallback(async (mode = 'manual', options = {}) => {
    const fullHistory = options.fullHistory ?? (mode !== 'poll-fast');
    const isBackground = mode === 'poll-fast' || mode === 'poll-full';
    const runToken = ++runTokenRef.current;
    const st = useStore.getState();
    if (st.scanning) {
      if (isBackground) return;
      queuedScanRef.current = true;
      return;
    }

    const { sym: curSym, tf: curTf, rr, emaFast, emaSlow, capital, riskPct, lookback, stratOn } = st;

    const log = (msg, type = 'i') => {
      if (!isBackground || type === 'e') addLog(msg, type);
    };

    if (!isBackground) setScanning(true);
    if (mode === 'manual') clearLog();
    log(`Fetching ${curSym} [${curTf}m]...`, 'i');

    try {
      const cacheKey = `${curSym}|${curTf}`;
      const now = Date.now();
      const cachedData = dataCacheRef.current.get(cacheKey);
      const cachedSession = sessionCacheRef.current.get(curSym);
      const dataTTL = mode === 'manual' ? 3000 : 5000;
      const sessionTTL = 60000;
      const useCachedData = !!(cachedData && (now - cachedData.ts) < dataTTL);
      const useCachedSession = !!(cachedSession && (now - cachedSession.ts) < sessionTTL);

      const [candles, sess] = await Promise.all([
        useCachedData ? Promise.resolve(cachedData.value) : fetchYF(curSym, curTf, log),
        useCachedSession ? Promise.resolve(cachedSession.value) : fetchSession(curSym)
      ]);

      if (!useCachedData && candles?.length) dataCacheRef.current.set(cacheKey, { ts: Date.now(), value: candles });
      if (!useCachedSession && sess) sessionCacheRef.current.set(curSym, { ts: Date.now(), value: sess });
      if (runTokenRef.current !== runToken) {
        if (!isBackground) setScanning(false);
        return;
      }
      if (!candles.length) {
        log('No data', 'e');
        if (!isBackground) setScanning(false);
        return;
      }

      if (!fullHistory && st.candles?.length) {
        const prevLast = st.candles[st.candles.length - 1];
        const curLast = candles[candles.length - 1];
        if (prevLast && curLast && prevLast.t === curLast.t && prevLast.c === curLast.c && st.candles.length === candles.length) {
          if (!isBackground) setScanning(false);
          return;
        }
      }

      const closes = candles.map(c => c.c);
      const ema1 = calcEMA(closes, emaFast);
      const ema2 = calcEMA(closes, emaSlow);
      const obs = detectOBs(candles);
      const fvgs = detectFVGs(candles);
      const ifvgs = detectIFVGs(candles);
      const vwapData = calcAnchoredVWAP(candles);
      const vpData = calcVolumeProfile(candles.slice(-700));
      const session = sess || simSession(candles);

      setData(candles, ema1, ema2, obs, fvgs, ifvgs, session, vwapData, vpData);
      log(`OBs: ${obs.length} (${obs.filter(o => o.active).length} active) | FVGs: ${fvgs.length} (${fvgs.filter(f => !f.filled).length} unfilled)`, 'i');

      const rawSigs = {
        ema: stratEMA(candles, ema1, ema2, rr),
        ob: stratOB(candles, ema1, ema2, rr),
        fvg: stratFVG(candles, ema1, ema2, rr),
        ifvg: stratIFVG(candles, ema1, ema2, rr),
        of: stratOF(candles, ema1, ema2, rr),
        ls: stratLS(candles, ema1, ema2, rr),
        vwap: stratVWAP(candles, ema1, ema2, rr, vwapData),
        vp: stratVP(candles, ema1, ema2, rr, vpData),
      };

      const activeSigs = Object.entries(rawSigs)
        .filter(([k]) => stratOn[k] && rawSigs[k])
        .map(([, s]) => s);
      const combos = buildCombos(activeSigs, rr, capital, riskPct);

      const latestResults = useStore.getState().results;
      const sameCtx = latestResults?.sym === curSym && latestResults?.tf === curTf;
      const existingTrades = sameCtx ? (latestResults?.trades || []) : [];
      if (!fullHistory) log('Live refresh: signals updated (history unchanged)', 'i');
      setResults({ rawSigs, activeSigs, combos, trades: existingTrades, capital, riskPct, rr, sym: curSym, tf: curTf });
      log('Scan complete', 's');

      if (fullHistory) {
        const btLookback = mode === 'manual' ? Math.min(lookback, 120) : Math.min(lookback, 50);
        const btDelay = mode === 'manual' ? 80 : 700;
        const btToken = ++backtestTokenRef.current;
        if (!isBackground) log(`Scheduling history scan (${btLookback} bars)...`, 'i');
        const runBacktest = () => {
          if (backtestTokenRef.current !== btToken) return;
          const cur = useStore.getState();
          if (cur.sym !== curSym || cur.tf !== curTf) return;
          const trades = scanTrades(candles, ema1, ema2, rr, btLookback, stratOn);
          if (backtestTokenRef.current !== btToken) return;
          const wins = trades.filter(t => t.outcome === 'WIN').length;
          const losses = trades.filter(t => t.outcome === 'LOSS').length;
          const wr = wins + losses ? ((wins / (wins + losses)) * 100).toFixed(1) : '--';
          if (!isBackground) addLog(`Trades: ${trades.length} | W:${wins} L:${losses} | WR:${wr}%`, 's');
          setResults({ rawSigs, activeSigs, combos, trades, capital, riskPct, rr, sym: curSym, tf: curTf });
        };
        if (mode !== 'manual' && typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          setTimeout(() => window.requestIdleCallback(runBacktest, { timeout: 1200 }), btDelay);
        } else {
          setTimeout(runBacktest, btDelay);
        }
      }
    } catch (e) {
      addLog('Error: ' + e.message, 'e');
    } finally {
      if (!isBackground) setScanning(false);
      const cur = useStore.getState();
      if (queuedScanRef.current || cur.sym !== curSym || cur.tf !== curTf) {
        queuedScanRef.current = false;
        setTimeout(() => {
          if (runScanRef.current) runScanRef.current('queued', { fullHistory: true });
        }, 0);
      }
    }
  }, [setData, setResults, setScanning, addLog, clearLog]);

  useEffect(() => {
    runScanRef.current = runScan;
  }, [runScan]);

  useEffect(() => {
    const key = `${sym}|${tf}`;
    if (lastAutoKeyRef.current !== key) {
      lastAutoKeyRef.current = key;
      if (autoDebounceTimerRef.current) clearTimeout(autoDebounceTimerRef.current);
      if (autoFullTimerRef.current) clearTimeout(autoFullTimerRef.current);
      autoDebounceTimerRef.current = setTimeout(() => {
        if (runScanRef.current) runScanRef.current('auto', { fullHistory: false });
        autoFullTimerRef.current = setTimeout(() => {
          const cur = useStore.getState();
          if (`${cur.sym}|${cur.tf}` === key && runScanRef.current) {
            runScanRef.current('auto-full', { fullHistory: true });
          }
        }, 900);
      }, 220);
    }
    return () => {
      if (autoDebounceTimerRef.current) clearTimeout(autoDebounceTimerRef.current);
      if (autoFullTimerRef.current) clearTimeout(autoFullTimerRef.current);
    };
  }, [sym, tf]);

  useEffect(() => {
    const id = setTimeout(() => {
      const st = useStore.getState();
      if (!st.candles?.length && runScanRef.current) {
        runScanRef.current('auto-init', { fullHistory: false });
      }
    }, 1500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      const st = useStore.getState();
      const hasTrades = !!st.results?.trades?.length;
      if (st.candles?.length && !hasTrades && runScanRef.current) {
        runScanRef.current('auto-backfill', { fullHistory: true });
      }
    }, 3200);
    return () => clearTimeout(id);
  }, [sym, tf]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden && isMarketOpenIST() && runScanRef.current) {
        pollTickRef.current += 1;
        const isFullCycle = pollTickRef.current % 15 === 0;
        runScanRef.current(isFullCycle ? 'poll-full' : 'poll-fast', { fullHistory: isFullCycle });
      }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="app-root" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar onShowGuide={() => setShowGuide(true)} onShowWeek={() => setInsightType('week')} />

      <div className="app-main" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sidebar onRunScan={() => runScan('manual')} onShowSR={() => setInsightType('sr')} onShowSRAnalysis={() => setInsightType('sra')} />

        <div className="app-center" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <ChartToolbar navInfo={navInfo} />
          <ChartCanvas onNavInfo={setNavInfo} />
          <BottomPanel />
        </div>

        <RightPanel />
      </div>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      {insightType && <InsightsModal type={insightType} onClose={() => setInsightType(null)} />}
      {showDisclaimer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 640, background: 'rgba(70,0,10,0.95)', border: '1px solid rgba(255,45,85,0.55)', borderRadius: 10, boxShadow: '0 16px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            <div style={{ background: 'rgba(255,45,85,0.14)', borderBottom: '1px solid rgba(255,45,85,0.45)', padding: '14px 16px', fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#ffd7df', letterSpacing: 1 }}>
              Disclaimer
            </div>
            <div style={{ padding: 16, color: '#ffe9ee', fontSize: 12, lineHeight: 1.8 }}>
              This project is for educational and informational use only. The creator is not a SEBI-registered investment advisor. Trading involves risk, including capital loss. Do your own research and consult a licensed advisor before making financial decisions.
            </div>
            <div style={{ borderTop: '1px solid rgba(255,45,85,0.45)', padding: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-scan" style={{ width: 180, background: 'rgba(255,45,85,0.16)', borderColor: 'rgba(255,45,85,0.7)', color: '#ffd7df' }} onClick={() => setShowDisclaimer(false)}>I Understand</button>
            </div>
          </div>
        </div>
      )}
      <PortfolioFab />
    </div>
  );
}
