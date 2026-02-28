import { useCallback, useRef } from 'react';

const MOBILE_OVERRIDES = `
@media (max-width: 980px) {
  html, body {
    height: 100% !important;
    overflow: auto !important;
    font-size: 10px !important;
  }

  .topbar {
    height: auto !important;
    padding: 8px !important;
    gap: 8px !important;
    flex-wrap: wrap !important;
  }

  .logo {
    border-right: none !important;
    padding-right: 0 !important;
  }

  .ticker {
    order: 3;
    width: 100%;
    overflow-x: auto !important;
    overflow-y: hidden !important;
  }

  .tb-right {
    margin-left: 0 !important;
    margin-right: auto !important;
    padding-left: 0 !important;
    flex-wrap: wrap !important;
  }

  .workspace {
    flex-direction: column !important;
    overflow: auto !important;
  }

  .sidebar {
    width: 100% !important;
    max-height: 42vh;
    border-right: none !important;
    border-bottom: 1px solid var(--b1) !important;
  }

  .center {
    min-height: 58vh;
  }

  .rpanel {
    width: 100% !important;
    max-height: 40vh;
    border-left: none !important;
    border-top: 1px solid var(--b1) !important;
  }

  .ctb {
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
  }

  .ctb .tfb,
  .ctb .tb-sym,
  .ctb .btn-icon {
    flex: 0 0 auto !important;
  }

  .cb-met {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  #mainChart {
    touch-action: pan-x pan-y;
  }
}
`;

function App() {
  const frameRef = useRef(null);
  const appSrc = `${import.meta.env.BASE_URL}N50-Strategy-Lab.html`;

  const applyMobileOverrides = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !frame.contentDocument) return;

    const { contentDocument } = frame;
    const existing = contentDocument.getElementById('react-mobile-overrides');
    if (existing) {
      existing.textContent = MOBILE_OVERRIDES;
      return;
    }

    const style = contentDocument.createElement('style');
    style.id = 'react-mobile-overrides';
    style.textContent = MOBILE_OVERRIDES;
    contentDocument.head.appendChild(style);
  }, []);

  return (
    <main className="app-shell">
      <iframe
        ref={frameRef}
        className="app-frame"
        title="N50 Strategy Lab"
        src={appSrc}
        onLoad={applyMobileOverrides}
      />
    </main>
  );
}

export default App;
