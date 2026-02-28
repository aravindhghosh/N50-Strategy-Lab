import React from 'react';

export default function PortfolioFab() {
  return (
    <a
      href="https://aravindhghosh.github.io/MyPortfolio/"
      target="_blank"
      rel="noopener noreferrer"
      title="Aravindh Ghosh - Portfolio"
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1000,
        width: 56,
        height: 56,
        borderRadius: '50%',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'block',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        border: '2px solid var(--cyan)',
      }}
    >
      <img
        src="https://github.com/aravindhghosh.png"
        alt="Portfolio"
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
      />
    </a>
  );
}

