import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

export function useSocket(handlers) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => handlersRef.current.onConnect?.());
    socket.on('disconnect', () => handlersRef.current.onDisconnect?.());
    socket.on('game_joined', (data) => handlersRef.current.onGameJoined?.(data));
    socket.on('game_updated', (data) => handlersRef.current.onGameUpdated?.(data));
    socket.on('game_over', (data) => handlersRef.current.onGameOver?.(data));
    socket.on('action_error', (data) => handlersRef.current.onError?.(data));
    socket.on('error', (data) => handlersRef.current.onError?.(data));
    socket.on('chat_message', (data) => handlersRef.current.onChat?.(data));

    return () => { socket.disconnect(); };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit };
}
