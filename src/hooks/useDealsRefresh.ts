import { useEffect, useState } from 'react';

// Recheck expiry while open, and immediately after returning to a suspended tab.
export function useDealsRefresh(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setTick(value => value + 1); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return tick;
}
