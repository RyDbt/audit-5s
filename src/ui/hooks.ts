import { useEffect, useState } from 'react';

/** Heure courante, rafraîchie à intervalle régulier (chronomètres). */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
