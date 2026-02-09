import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBlocks } from '../lib/api';
import { useIncrementalSocket } from './useIncrementalSocket';

const QUERY_KEY = ['pool', 'blocks'];

export function useBlocks() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getBlocks,
    refetchInterval: 300000,
  });

  const merge = useCallback(
    (old, delta) => {
      if (!Array.isArray(old)) return old;
      return [delta, ...old].slice(0, 50);
    },
    [],
  );
  useIncrementalSocket(QUERY_KEY, 'newBlock', merge);

  return query;
}
