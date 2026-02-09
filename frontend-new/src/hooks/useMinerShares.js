import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMinerShares } from '../lib/api';
import { useIncrementalSocket } from './useIncrementalSocket';

export function useMinerShares(address) {
  const queryKey = ['miner', address, 'shares'];

  const query = useQuery({
    queryKey,
    queryFn: () => getMinerShares(address),
    enabled: !!address,
  });

  // Extract newShare from the delta event and prepend it to the shares list.
  // Filter by address if this hook is for a specific worker (address contains '.').
  const merge = useCallback(
    (old, delta) => {
      if (!Array.isArray(old)) return old;
      const share = delta.newShare;
      if (!share) return old;
      // If querying a specific worker address, only prepend shares from that worker
      if (address && address.length > 42 && delta.minerEthAddress) {
        if (delta.minerEthAddress.toLowerCase() !== address.toLowerCase()) {
          return old;
        }
      }
      return [share, ...old].slice(0, 200);
    },
    [address],
  );
  useIncrementalSocket(queryKey, 'minerShareUpdate', merge);

  return query;
}
