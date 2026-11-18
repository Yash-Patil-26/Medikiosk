import { useEffect, useRef, useState, useCallback } from 'react';

export function useIdleTimer(timeout = 90000, onIdle) {
  const [warning, setWarning] = useState(false);
  const timer = useRef(null);
  const warnTimer = useRef(null);
  const onIdleRef = useRef(onIdle);

  // Keep ref current so reset closure doesn't go stale
  useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);

  const reset = useCallback(() => {
    clearTimeout(timer.current);
    clearTimeout(warnTimer.current);
    setWarning(false);
    const warnDelay = timeout > 30000 ? timeout - 30000 : timeout / 2;
    warnTimer.current = setTimeout(() => setWarning(true), warnDelay);
    timer.current = setTimeout(() => onIdleRef.current?.(), timeout);
  }, [timeout]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(timer.current);
      clearTimeout(warnTimer.current);
    };
  }, [reset]);

  return { warning };
}
