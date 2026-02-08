import { useQuery } from '@tanstack/react-query';
import { getStats24h } from '../lib/api';

const QUERY_KEY = ['pool', 'stats', '24h'];

export function usePoolStats24h() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getStats24h,
    staleTime: 60000,
  });
}
