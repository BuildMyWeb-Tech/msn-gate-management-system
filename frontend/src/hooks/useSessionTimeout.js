// frontend/src/hooks/useSessionTimeout.js
// Auto-logout after 5 minutes of idle (no mouse/key/click/touch).
// No warning popup — silent logout + redirect.
//
// Usage (in AppLayout or a top-level component):
//   useSessionTimeout(handleLogout);

import { useEffect, useRef, useCallback } from 'react';

const IDLE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * @param {() => void} onTimeout  Called when idle timer expires.
 *                                Should call logout() + navigate('/login').
 */
export function useSessionTimeout(onTimeout) {
  const timerRef   = useRef(null);
  // Keep a stable ref to onTimeout so we don't re-subscribe on every render
  const callbackRef = useRef(onTimeout);
  useEffect(() => { callbackRef.current = onTimeout; }, [onTimeout]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(), IDLE_MS);
  }, []);

  useEffect(() => {
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    EVENTS.forEach(evt =>
      window.addEventListener(evt, reset, { passive: true })
    );

    reset(); // start the timer on mount

    return () => {
      EVENTS.forEach(evt => window.removeEventListener(evt, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reset]);
}