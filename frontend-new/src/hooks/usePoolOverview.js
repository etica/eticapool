import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPoolOverview } from '../lib/api';
import { useIncrementalSocket } from './useIncrementalSocket';

const QUERY_KEY = ['pool', 'overview'];

export function usePoolOverview() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPoolOverview,
    staleTime: 30000,
    refetchInterval: 120000,
  });

  const merge = useCallback((old, delta) => ({ ...old, ...delta }), []);
  useIncrementalSocket(QUERY_KEY, 'poolUpdate', merge);

  return query;
}
