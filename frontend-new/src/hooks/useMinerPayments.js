import { useQuery } from '@tanstack/react-query';
import { getMinerPayments } from '../lib/api';

export function useMinerPayments(address) {
  return useQuery({
    queryKey: ['miner', address, 'payments'],
    queryFn: () => getMinerPayments(address),
    enabled: !!address,
  });
}
