import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export function useSocket(event, handler) {
  useEffect(() => {
    const socket = getSocket();
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}
