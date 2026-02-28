import React, { useState, useCallback, useEffect, useRef } from 'react';
import useStore from './store/useStore';
import { fetchYF, fetchSession, simSession } from './utils/dataFetch';
import {
  calcEMA, detectOBs, detectFVGs, calcAnchoredVWAP, calcVolumeProfile,
  stratEMA, stratOB, stratFVG, stratOF, stratLS, stratVWAP, stratVP,
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
  const pollTickRef = useRef(0);
  const runTokenRef = useRef(0);
  const backtestTokenRef = useRef(0);
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
      const [candles, sess] = await Promise.all([fetchYF(curSym, curTf, log), fetchSession(curSym)]);
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
      const vwapData = calcAnchoredVWAP(candles);
      const vpData = calcVolumeProfile(candles);
      const session = sess || simSession(candles);

      setData(candles, ema1, ema2, obs, fvgs, session, vwapData, vpData);
      log(`OBs: ${obs.length} (${obs.filter(o => o.active).length} active) | FVGs: ${fvgs.length} (${fvgs.filter(f => !f.filled).length} unfilled)`, 'i');

      const rawSigs = {
        ema: stratEMA(candles, ema1, ema2, rr),
        ob: stratOB(candles, ema1, ema2, rr),
        fvg: stratFVG(candles, ema1, ema2, rr),
        of: stratOF(candles, ema1, ema2, rr),
        ls: stratLS(candles, ema1, ema2, rr),
        vwap: stratVWAP(candles, ema1, ema2, rr, vwapData),
        vp: stratVP(candles, ema1, ema2, rr, vpData),
      };

      const activeSigs = Object.entries(rawSigs)
        .filter(([k]) => stratOn[k] && rawSigs[k])
        .map(([, s]) => s);
      const combos = buildCombos(activeSigs, rr, capital, riskPct);

      const sameCtx = st.results?.sym === curSym && st.results?.tf === curTf;
      const existingTrades = sameCtx ? (st.results?.trades || []) : [];
      if (!fullHistory) log('Live refresh: signals updated (history unchanged)', 'i');
      setResults({ rawSigs, activeSigs, combos, trades: existingTrades, capital, riskPct, rr, sym: curSym, tf: curTf });
      log('Scan complete', 's');

      if (fullHistory) {
        const btLookback = mode === 'manual' ? lookback : Math.min(lookback, 60);
        const btDelay = mode === 'manual' ? 80 : 700;
        const btToken = ++backtestTokenRef.current;
        if (!isBackground) log(`Scheduling history scan (${btLookback} bars)...`, 'i');
        const runBacktest = () => {
          if (backtestTokenRef.current !== btToken) return;
          const cur = useStore.getState();
          if (cur.sym !== curSym || cur.tf !== curTf || runTokenRef.current !== runToken) return;
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
      if (autoFullTimerRef.current) clearTimeout(autoFullTimerRef.current);
      runScan('auto', { fullHistory: false });
      autoFullTimerRef.current = setTimeout(() => {
        const cur = useStore.getState();
        if (`${cur.sym}|${cur.tf}` === key && runScanRef.current) {
          runScanRef.current('auto-full', { fullHistory: true });
        }
      }, 1200);
    }
    return () => {
      if (autoFullTimerRef.current) clearTimeout(autoFullTimerRef.current);
    };
  }, [sym, tf, runScan]);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar onShowGuide={() => setShowGuide(true)} onShowWeek={() => setInsightType('week')} />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Sidebar onRunScan={() => runScan('manual')} onShowSR={() => setInsightType('sr')} onShowSRAnalysis={() => setInsightType('sra')} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
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
          <div style={{ width: '100%', maxWidth: 640, background: 'var(--p1)', border: '1px solid var(--b2)', borderRadius: 10, boxShadow: '0 16px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ background: 'var(--p2)', borderBottom: '1px solid var(--b1)', padding: '14px 16px', fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--t1)', letterSpacing: 1 }}>
              Disclaimer
            </div>
            <div style={{ padding: 16, color: 'var(--t2)', fontSize: 12, lineHeight: 1.8 }}>
              This project is for educational and informational use only. The creator is not a SEBI-registered investment advisor. Trading involves risk, including capital loss. Do your own research and consult a licensed advisor before making financial decisions.
            </div>
            <div style={{ borderTop: '1px solid var(--b1)', padding: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-scan" style={{ width: 180 }} onClick={() => setShowDisclaimer(false)}>I Understand</button>
            </div>
          </div>
        </div>
      )}
      <PortfolioFab />
    </div>
  );
}
