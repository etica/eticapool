import { useQuery } from '@tanstack/react-query';
import { getMinerRewards, getMinerRewardsChart } from '../lib/api';

export function useMinerRewards(address) {
  return useQuery({
    queryKey: ['miner', address, 'rewards'],
    queryFn: () => getMinerRewards(address),
    enabled: !!address,
  });
}

/**
 * Hook for the Graph tab — fetches pre-computed rewards linedata chart.
 * No Socket.IO needed — rewards only change on block mints (rare).
 */
export function useMinerRewardsChart(address, enabled) {
  return useQuery({
    queryKey: ['miner', address, 'rewards', 'chart'],
    queryFn: () => getMinerRewardsChart(address),
    enabled: !!address && enabled,
    staleTime: 30000,
  });
}
