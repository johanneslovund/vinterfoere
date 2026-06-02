import { useState, useEffect, useCallback } from 'react';
import { GridWeather } from '../types/weather';
import { NORWAY_GRID } from '../constants/grid';
import { fetchWeatherForPoint } from '../services/metApi';

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 150;
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useWeatherGrid() {
  const [data, setData] = useState<GridWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results: GridWeather[] = [];

    for (let i = 0; i < NORWAY_GRID.length; i += BATCH_SIZE) {
      const batch = NORWAY_GRID.slice(i, i + BATCH_SIZE);
      const settled = await Promise.allSettled(batch.map(fetchWeatherForPoint));

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }

      setData([...results]);

      if (i + BATCH_SIZE < NORWAY_GRID.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    setLastUpdated(new Date());
    setLoading(false);

    if (results.length === 0) {
      setError('Kunne ikke hente værinformasjon. Prøv igjen senere.');
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { data, loading, lastUpdated, error, refresh: fetchAll };
}
