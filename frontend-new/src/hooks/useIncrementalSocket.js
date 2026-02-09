import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';

export function useIncrementalSocket(queryKey, socketEvent, mergeFn) {
  const queryClient = useQueryClient();
  // Serialize queryKey for stable dependency comparison
  const keyStr = JSON.stringify(queryKey);
  // Keep mergeFn in a ref to avoid re-subscribing when callback identity changes
  const mergeFnRef = useRef(mergeFn);
  mergeFnRef.current = mergeFn;

  useEffect(() => {
    const key = JSON.parse(keyStr);
    const socket = getSocket();
    function handler(delta) {
      queryClient.setQueryData(key, (old) => {
        if (!old) return old;
        return mergeFnRef.current(old, delta);
      });
    }
    socket.on(socketEvent, handler);
    return () => {
      socket.off(socketEvent, handler);
    };
  }, [keyStr, socketEvent, queryClient]);
}
