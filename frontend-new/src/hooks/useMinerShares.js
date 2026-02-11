import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMinerShares, getMinerSharesChart } from '../lib/api';
import { useIncrementalSocket } from './useIncrementalSocket';
import { getSocket } from '../lib/socket';

export function useMinerShares(address) {
  const queryKey = ['miner', address, 'shares'];

  const query = useQuery({
    queryKey,
    queryFn: () => getMinerShares(address),
    enabled: !!address,
  });

  // Extract newShare from the delta event and prepend it to the shares list.
  // Filter by address if this hook is for a specific worker (address contains '.').
  const merge = useCallback(
    (old, delta) => {
      if (!Array.isArray(old)) return old;
      const share = delta.newShare;
      if (!share) return old;
      // If querying a specific worker address, only prepend shares from that worker
      if (address && address.length > 42 && delta.minerEthAddress) {
        if (delta.minerEthAddress.toLowerCase() !== address.toLowerCase()) {
          return old;
        }
      }
      return [share, ...old].slice(0, 200);
    },
    [address],
  );
  useIncrementalSocket(queryKey, 'minerShareUpdate', merge);

  return query;
}

/**
 * Hook for the Graph tab — fetches pre-computed linedata chart from the server
 * and incrementally appends new shares via Socket.IO.
 */
export function useMinerSharesChart(address, enabled) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!address) return;
    const socket = getSocket();
    const handler = (data) => {
      const bare = address.slice(0, 42).toLowerCase();
      if (data.addressBlockchain?.toLowerCase() !== bare) return;
      queryClient.setQueryData(['miner', address, 'shares', 'chart'], (old) => {
        if (!old || !old.timestamps) return old;
        const s = data.newShare;
        if (!s) return old;
        const max = old.maxPoints || 100;
        return {
          ...old,
          timestamps: [...old.timestamps, s.time].slice(-max),
          series: { difficulty: [...old.series.difficulty, s.difficulty].slice(-max) },
          lastUpdate: s.time,
        };
      });
    };
    socket.on('minerShareUpdate', handler);
    return () => socket.off('minerShareUpdate', handler);
  }, [address, queryClient]);

  return useQuery({
    queryKey: ['miner', address, 'shares', 'chart'],
    queryFn: () => getMinerSharesChart(address),
    enabled: !!address && enabled,
    staleTime: 30000,
  });
}
