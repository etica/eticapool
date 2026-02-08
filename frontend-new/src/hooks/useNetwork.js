import { useQuery } from '@tanstack/react-query';
import { getNetwork } from '../lib/api';

const QUERY_KEY = ['pool', 'network'];

export function useNetwork() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getNetwork,
    refetchInterval: 300000,
  });
}
