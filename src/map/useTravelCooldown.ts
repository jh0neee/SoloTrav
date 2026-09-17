import { useEffect, useState } from 'react';
import { travelRequestQueue } from '../api/travelPublicClient';

export function useTravelCooldown() {
  const [until, setUntil] = useState(travelRequestQueue.getCooldownUntil);
  const [now, setNow] = useState(Date.now);
  useEffect(
    () =>
      travelRequestQueue.subscribe(() => {
        setUntil(travelRequestQueue.getCooldownUntil());
        setNow(Date.now());
      }),
    [],
  );
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (next >= until) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [until]);
  return Math.max(0, Math.ceil((until - now) / 1000));
}
