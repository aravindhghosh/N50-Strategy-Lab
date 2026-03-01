import React from 'react';

export default function GuideModal({ onClose }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ display: 'block', position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 820, margin: '32px auto', background: 'var(--p1)', border: '1px solid var(--b2)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 16px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'var(--p2)', padding: '18px 24px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--t1)', letterSpacing: 1 }}>N50 STRATEGY LAB - USER GUIDE</div>
            <div style={{ fontSize: 9, color: 'var(--t3)', letterSpacing: 2, marginTop: 2 }}>Complete reference for all tools and strategies</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--red)', border: 'none', color: '#fff', fontSize: 14, width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontWeight: 700 }}>X</button>
        </div>

        <div style={{ padding: 24, fontSize: 11, color: 'var(--t2)', lineHeight: 1.9, overflowY: 'auto', maxHeight: '80vh' }}>
          <div style={{ background: 'rgba(0,204,245,0.06)', border: '1px solid rgba(0,204,245,0.2)', borderRadius: 6, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', letterSpacing: 1, marginBottom: 8 }}>⚡ QUICK START</div>
            <div>1. Select <b style={{ color: 'var(--t1)' }}>Symbol</b> (NIFTY / BANK NIFTY / SENSEX / FIN NIFTY) and <b style={{ color: 'var(--t1)' }}>Timeframe</b></div>
            <div>2. Enable the strategies you want using the toggles in the left sidebar</div>
            <div>3. Click <b style={{ color: 'var(--cyan)' }}>SCAN STRATEGIES</b> - chart loads, signals appear, history scans automatically</div>
            <div>4. Review <b style={{ color: 'var(--t1)' }}>Current Signals</b> and <b style={{ color: 'var(--t1)' }}>Best Combo</b> in the sidebar</div>
            <div>5. Use <b style={{ color: 'var(--t1)' }}>Trade History</b> tab to study past setups and win/loss patterns</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '1.5px', borderBottom: '1px solid var(--b1)', paddingBottom: 5, marginBottom: 10 }}>📊 CHART CONTROLS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 4, padding: '8px 10px' }}><b style={{ color: 'var(--t1)' }}>Scroll wheel</b><br />Zoom in/out at cursor position</div>
              <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 4, padding: '8px 10px' }}><b style={{ color: 'var(--t1)' }}>Drag (left button)</b><br />Pan chart left/right through history</div>
              <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 4, padding: '8px 10px' }}><b style={{ color: 'var(--t1)' }}>Shift + Drag</b><br />Stretch / compress price scale</div>
              <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 4, padding: '8px 10px' }}><b style={{ color: 'var(--t1)' }}>Double-click</b><br />Reset zoom to default view</div>
              <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 4, padding: '8px 10px' }}><b style={{ color: 'var(--t1)' }}>◀◀ ◀ ▶ ▶▶ buttons</b><br />Step back/forward 50 or 10 bars</div>
              <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 4, padding: '8px 10px' }}><b style={{ color: 'var(--t1)' }}>Minimap drag</b><br />Drag the blue viewport window to jump</div>
              <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 4, padding: '8px 10px' }}><b style={{ color: 'var(--t1)' }}>Hover</b><br />Tooltip shows OHLCV + EMA values</div>
              <div style={{ background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 4, padding: '8px 10px' }}><b style={{ color: 'var(--t1)' }}>⏮ ⏭ buttons</b><br />Jump to oldest / most recent bar</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '1.5px', borderBottom: '1px solid var(--b1)', paddingBottom: 5, marginBottom: 10 }}>🎛️ CHART LAYERS (toolbar buttons)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ padding: '6px 10px', background: 'rgba(74,144,226,0.07)', border: '1px solid rgba(74,144,226,0.2)', borderRadius: 3 }}><b style={{ color: 'var(--blue)' }}>OB</b> - Order Block rectangles (blue=bull, red=bear)</div>
              <div style={{ padding: '6px 10px', background: 'rgba(159,122,234,0.07)', border: '1px solid rgba(159,122,234,0.2)', borderRadius: 3 }}><b style={{ color: 'var(--purple)' }}>FVG</b> - Fair Value Gap bands (green=bull, orange=bear)</div>
              <div style={{ padding: '6px 10px', background: 'rgba(255,200,50,0.07)', border: '1px solid rgba(255,200,50,0.2)', borderRadius: 3 }}><b style={{ color: 'var(--yellow)' }}>LEVELS</b> - Session levels (Prev Close, Day Open/High/Low, Prev High/Low)</div>
              <div style={{ padding: '6px 10px', background: 'rgba(0,232,122,0.07)', border: '1px solid rgba(0,232,122,0.2)', borderRadius: 3 }}><b style={{ color: 'var(--green)' }}>SIGNAL</b> - Current best combo signal (Entry/SL/Target shading)</div>
              <div style={{ padding: '6px 10px', background: 'rgba(0,204,245,0.07)', border: '1px solid rgba(0,204,245,0.2)', borderRadius: 3 }}><b style={{ color: 'var(--cyan)' }}>EMA</b> - EMA Fast (yellow) and EMA Slow (blue) lines</div>
              <div style={{ padding: '6px 10px', background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 3 }}><b style={{ color: 'var(--t1)' }}>VWAP</b> - Anchored VWAP line (teal) + standard deviations</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '1.5px', borderBottom: '1px solid var(--b1)', paddingBottom: 5, marginBottom: 10 }}>📈 STRATEGIES - How Each One Works</div>

            {[
              ['var(--yellow)', '📈 EMA CROSS (9/21)', 'Signals when the fast EMA (9) crosses the slow EMA (21). LONG when fast crosses above slow and price is above both; SHORT when fast crosses below. Confidence is highest on a fresh cross (C:3), lower during sustained trend (C:2) or weak separation (C:1). Stop is 1.5x ATR from entry.'], 
              ['var(--blue)', '🧱 ORDER BLOCK (OB)', 'Identifies the last bearish candle before a strong bullish impulse (Bull OB) or last bullish candle before a strong bearish push (Bear OB). A signal fires when price returns to retest the OB. Active OBs show in solid boxes; broken ones fade with X. Confidence is boosted when EMA agrees.'], 
              ['var(--purple)', '⚡ FAIR VALUE GAP (FVG)', 'A 3-candle pattern where the body of candle 1 and candle 3 do not overlap, leaving a gap that markets tend to fill. Bull FVG = gap above, Bear FVG = gap below. Signal fires when price approaches an unfilled FVG.'], 
              ['#f505b9', '🔄 INVERSE FVG (iFVG)', (
                <>
                  An iFVG forms when a regular FVG gets <b style={{ color: 'var(--t1)' }}>filled and then rejected</b> — the gap zone flips polarity and acts as the opposite structure. 
                  A Bear FVG that gets filled and rejected becomes a <b style={{ color: '#ff6496' }}>Bull iFVG</b> (pink zone, support for LONG). 
                  A Bull FVG that gets filled and rejected becomes a <b style={{ color: '#9664ff' }}>Bear iFVG</b> (violet zone, resistance for SHORT). 
                  Signal fires when price returns to retest the flipped zone. 
                  Drawn with diagonal hatching to distinguish from regular FVGs.
                </>
              )], 
              ['#ff6b35', '🌊 ORDER FLOW* (Synthetic)', 'Synthetic estimate of buying vs selling pressure from candle structure and volume. Signal fires when synthetic delta momentum agrees with EMA direction.'], 
              ['#f7c59f', '💧 LIQUIDITY SWEEP', 'Detects when price wicks beyond a recent swing high/low (stop hunt) and then reverses.'], 
              ['#00bfae', '📐 ANCHORED VWAP', 'VWAP anchored from the start of the current session. LONG when price is above AVWAP and bouncing from +1SD; SHORT when below and bouncing from -1SD.'], ['#a8d8ea', '📦 VOLUME PROFILE* (Approx POC)', 'Approximate profile using candle-range volume distribution to estimate POC, VAH and VAL.']
            ].map(([c, name, desc]) => (
              <div key={name} style={{ marginBottom: 10, background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 5, padding: '10px 12px' }}>
                <div style={{ color: c, fontWeight: 700, fontSize: 10, marginBottom: 4 }}>{name}</div>
                <div>{desc}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '1.5px', borderBottom: '1px solid var(--b1)', paddingBottom: 5, marginBottom: 10 }}>🔥 CONFIDENCE SCORING and COMBOS</div>
            <div>Each strategy generates a confidence score (C:1, C:2, C:3). The app automatically generates <b style={{ color: 'var(--t1)' }}>all possible combinations</b> of 2+ strategies that agree on direction.</div>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,232,122,0.07)', border: '1px solid rgba(0,232,122,0.2)', borderRadius: 3, padding: 6 }}><b style={{ color: 'var(--green)' }}>C:3</b><br />Fresh cross/retest<br />Highest quality</div>
              <div style={{ background: 'rgba(255,200,50,0.07)', border: '1px solid rgba(255,200,50,0.2)', borderRadius: 3, padding: 6 }}><b style={{ color: 'var(--yellow)' }}>C:2</b><br />Trend aligned<br />Good quality</div>
              <div style={{ background: 'rgba(255,45,85,0.07)', border: '1px solid rgba(255,45,85,0.2)', borderRadius: 3, padding: 6 }}><b style={{ color: 'var(--red)' }}>C:1</b><br />Conflicting signals<br />Lower quality</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '1.5px', borderBottom: '1px solid var(--b1)', paddingBottom: 5, marginBottom: 10 }}>📋 TRADE HISTORY TAB</div>
            <div>The scanner backtests every bar in the lookback window. For each signal, it looks forward 60 bars to determine outcome:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
              <div style={{ padding: 6, background: 'rgba(0,232,122,0.07)', border: '1px solid rgba(0,232,122,0.2)', borderRadius: 3 }}><b style={{ color: 'var(--green)' }}>WIN</b> - Price hit target before SL</div>
              <div style={{ padding: 6, background: 'rgba(255,45,85,0.07)', border: '1px solid rgba(255,45,85,0.2)', borderRadius: 3 }}><b style={{ color: 'var(--red)' }}>LOSS</b> - Price hit SL before target</div>
              <div style={{ padding: 6, background: 'rgba(0,204,245,0.07)', border: '1px solid rgba(0,204,245,0.2)', borderRadius: 3 }}><b style={{ color: 'var(--cyan)' }}>OPEN</b> - Neither hit within 60 bars</div>
              <div style={{ padding: 6, background: 'rgba(255,200,50,0.07)', border: '1px solid rgba(255,200,50,0.2)', borderRadius: 3 }}><b style={{ color: 'var(--yellow)' }}>MISSED</b> - High-conf combo that won but was not tracked</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '1.5px', borderBottom: '1px solid var(--b1)', paddingBottom: 5, marginBottom: 10 }}>💰 RISK MANAGEMENT</div>
            <div>Set Capital and Risk % in the sidebar. The app calculates position size automatically:</div>
            <div style={{ marginTop: 8, padding: 10, background: 'var(--p2)', border: '1px solid var(--b1)', borderRadius: 4, fontSize: 10 }}>
              <b style={{ color: 'var(--cyan)' }}>Risk Amount</b> = Capital x Risk %<br />
              <b style={{ color: 'var(--cyan)' }}>Qty</b> = Risk Amount / (Entry - Stop Loss)<br />
              <b style={{ color: 'var(--cyan)' }}>Max Profit</b> = Qty x (Target - Entry) [for LONG]<br />
              <b style={{ color: 'var(--yellow)' }}>Rule:</b> Never risk more than 1-2% per trade. Default is 1%.
            </div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 9, letterSpacing: 1, paddingTop: 10, borderTop: '1px solid var(--b1)' }}>
            Built by <a href="https://aravindhghosh.github.io/MyPortfolio/" target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>Aravindhghosh</a> - N50 Strategy Lab v1 - For educational purposes only
          </div>
        </div>
      </div>
    </div>
  );
}
