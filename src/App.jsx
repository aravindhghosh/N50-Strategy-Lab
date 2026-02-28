import { useRef } from 'react';

function App() {
  const frameRef = useRef(null);
  const appSrc = `${import.meta.env.BASE_URL}N50-Strategy-Lab.html`;

  return (
    <main className="app-shell">
      <iframe
        ref={frameRef}
        className="app-frame"
        title="N50 Strategy Lab"
        src={appSrc}
      />
    </main>
  );
}

export default App;
