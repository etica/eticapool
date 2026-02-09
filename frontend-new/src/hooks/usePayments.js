import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPayments } from '../lib/api';
import { useIncrementalSocket } from './useIncrementalSocket';

const QUERY_KEY = ['pool', 'payments'];

export function usePayments() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPayments,
    refetchInterval: 240000,
  });

  const merge = useCallback(
    (old, delta) => {
      if (!old || !old.recentPayments) return old;
      return {
        ...old,
        recentPayments: [delta, ...old.recentPayments].slice(0, 50),
      };
    },
    [],
  );
  useIncrementalSocket(QUERY_KEY, 'newPayment', merge);

  return query;
}
