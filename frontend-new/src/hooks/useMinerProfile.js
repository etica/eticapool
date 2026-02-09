import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMiner } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useIncrementalSocket } from './useIncrementalSocket';

export function useMinerProfile(address) {
  const queryKey = ['miner', address];

  const query = useQuery({
    queryKey,
    queryFn: () => getMiner(address),
    enabled: !!address,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!address) return;
    const socket = getSocket();
    socket.emit('subscribeMiner', address);
    return () => {
      socket.emit('unsubscribeMiner', address);
    };
  }, [address]);

  // Merge minerShareUpdate into cached profile without corrupting it.
  // Updates: lastSubmittedSolutionTime on the matching worker (and main record),
  // and increments validSubmittedSolutionsCount for visual feedback.
  const merge = useCallback(
    (old, delta) => {
      if (!old || !old.minerData) return old;
      const md = { ...old.minerData };
      const workerAddr = delta.minerEthAddress;
      const shareTime = delta.newShare?.time || Math.round(Date.now() / 1000);

      // Update matching worker's lastSubmittedSolutionTime
      if (md.workers && Array.isArray(md.workers)) {
        md.workers = md.workers.map((w) => {
          if (w.minerEthAddress?.toLowerCase() === workerAddr) {
            return { ...w, lastSubmittedSolutionTime: shareTime };
          }
          return w;
        });
      }

      // Update the main record's lastSubmittedSolutionTime to the most recent
      const mainTime = md.lastSubmittedSolutionTime || 0;
      if (shareTime > mainTime) {
        md.lastSubmittedSolutionTime = shareTime;
      }

      return { ...old, minerData: md };
    },
    [],
  );
  useIncrementalSocket(queryKey, 'minerShareUpdate', merge);

  return query;
}
