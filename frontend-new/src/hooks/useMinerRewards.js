import { useQuery } from '@tanstack/react-query';
import { getMinerRewards } from '../lib/api';

export function useMinerRewards(address) {
  return useQuery({
    queryKey: ['miner', address, 'rewards'],
    queryFn: () => getMinerRewards(address),
    enabled: !!address,
  });
}
