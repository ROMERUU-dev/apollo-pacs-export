import { useCallback, useEffect, useState } from 'react';
import { operationsApi, type WorklistItem } from '../api/operations';

function localDayRange(now = new Date()): [string, string] {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  return [start.toISOString(), end.toISOString()];
}

export function useOperationalWorklist(pollMs = 15_000) {
  const [items, setItems] = useState<WorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const refresh = useCallback(async () => {
    try {
      const [from, to] = localDayRange();
      setItems(await operationsApi.operationalWorklist(from, to));
      setError(undefined);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar la worklist.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), pollMs);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [pollMs, refresh]);
  return { items, loading, error, refresh };
}
