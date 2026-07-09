// src/pages/PlaceholderPage.jsx
// Used for sub-menu pages not yet implemented
import React from 'react';
import { useLocation } from 'react-router-dom';

export default function PlaceholderPage({ title }) {
  const location = useLocation();
  const pageTitle = title || location.pathname.split('/').filter(Boolean).map(s =>
    s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
  ).join(' › ');

  return (
    <div className="placeholder-page">
      <div className="placeholder-icon">🚧</div>
      <h2 className="placeholder-title">{pageTitle}</h2>
      <p className="placeholder-desc">This module is under development. Content will appear here soon.</p>
    </div>
  );
}