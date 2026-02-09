import { useQuery } from '@tanstack/react-query';
import { getMiners } from '../lib/api';

const QUERY_KEY = ['pool', 'miners'];

export function useMiners() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getMiners,
    staleTime: 30000,
    refetchInterval: 120000,
  });
}
