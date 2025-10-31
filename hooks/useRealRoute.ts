import { useState, useEffect } from 'react';
import { realRoutingService, RouteResponse } from '../lib/realRouting';

export function useRealRoute(start: [number, number], end: [number, number]) {
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!start || !end) return;
    
    setLoading(true);
    realRoutingService.getRoute(start, end)
      .then(setRoute)
      .catch((error) => {
        console.error('Error en useRealRoute:', error);
        setRoute(null);
      })
      .finally(() => setLoading(false));
  }, [start, end]);
  
  return { route, loading };
}