import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStats24h } from '../lib/api';
import { getSocket } from '../lib/socket';

const QUERY_KEY = ['pool', 'stats', '24h'];

export function usePoolStats24h() {
  const queryClient = useQueryClient();

  // Listen for incremental chartUpdate events via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (update) => {
      if (update.name !== 'pool_hashrate_24h') return;
      queryClient.setQueryData(QUERY_KEY, (old) => {
        if (!old || !old.timestamps) return old;
        const p = update.point;
        const max = old.maxPoints || 144;
        return {
          ...old,
          timestamps: [...old.timestamps, p.timestamp].slice(-max),
          series: {
            hashrate: [...old.series.hashrate, p.hashrate].slice(-max),
            miners: [...old.series.miners, p.miners].slice(-max),
            workers: [...old.series.workers, p.workers].slice(-max),
          },
          lastUpdate: p.timestamp,
        };
      });
    };

    socket.on('chartUpdate', handler);
    return () => socket.off('chartUpdate', handler);
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getStats24h,
    staleTime: 60000,
  });
}
