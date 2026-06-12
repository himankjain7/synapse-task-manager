import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch as useReduxDispatch } from 'react-redux';

/**
 * React Native Socket.io hook
 * - Type-safe generic EventMap `E` maps event names to payload types
 * - Queues emits while offline and flushes on reconnect
 * - Uses socket.io-client built-in reconnection with sensible defaults
 * - Integrates with Redux by dispatching action creators from `eventActionMap`
 *
 * Usage:
 * const { emitEvent, subscribeToProject, useTaskUpdates } = useSocket<MyEvents>({ url, token, eventActionMap });
 */

type EventHandler<T> = (payload: T) => void;

interface QueuedEmit {
  event: string;
  data?: any;
  ack?: ((...args: any[]) => void) | undefined;
}

export interface UseSocketOptions<E> {
  url: string; // socket server URL
  token?: string; // JWT for auth handshake
  autoConnect?: boolean; // defaults to true
  eventActionMap?: Partial<{ [K in keyof E]: (payload: E[K]) => any }>; // maps events to redux action creators
}

export function useSocket<E extends Record<string, any>>(opts: UseSocketOptions<E>) {
  const { url, token, autoConnect = true, eventActionMap } = opts;
  const dispatch = useReduxDispatch();
  const socketRef = useRef<Socket | null>(null);
  const queued = useRef<QueuedEmit[]>([]);
  const handlers = useRef<Map<string, Set<Function>>>(new Map());

  // Create socket once
  useEffect(() => {
    const socket = io(url, {
      autoConnect,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      auth: token ? { token } : undefined,
    });

    socketRef.current = socket;

    // Flush queued emits when connected
    const onConnect = () => {
      while (queued.current.length) {
        const item = queued.current.shift()!;
        socket.emit(item.event, item.data, item.ack);
      }
    };

    socket.on('connect', onConnect);

    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error', err?.message || err);
    });

    socket.on('error', (err) => {
      console.error('[socket] error', err);
    });

    // Generic relay: dispatch redux actions if event matches map
    socket.onAny((event, payload) => {
      const map = eventActionMap as any;
      if (map && map[event]) {
        try {
          dispatch(map[event](payload));
        } catch (err) {
          console.error('[socket] dispatch failed for', event, err);
        }
      }

      // Call any local handlers registered via subscribe/useTaskUpdates
      const set = handlers.current.get(event);
      if (set) {
        set.forEach((fn) => {
          try {
            fn(payload);
          } catch (err) {
            console.error('[socket] handler error', err);
          }
        });
      }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token]);

  // Emit with queueing when offline
  const emitEvent = useCallback(<K extends keyof E>(event: K | string, data?: E[K], ack?: (...args: any[]) => void) => {
    const s = socketRef.current;
    if (!s || !s.connected) {
      queued.current.push({ event: event as string, data, ack });
      return;
    }
    s.emit(event as string, data, ack);
  }, []);

  // Subscribe to a server event and return unsubscribe fn
  const useSocketEvent = useCallback(<K extends keyof E>(event: K | string, handler: EventHandler<any>) => {
    const ev = event as string;
    let set = handlers.current.get(ev);
    if (!set) {
      set = new Set();
      handlers.current.set(ev, set);
    }
    set.add(handler as Function);

    return () => {
      const s = handlers.current.get(ev);
      if (s) {
        s.delete(handler as Function);
        if (s.size === 0) handlers.current.delete(ev);
      }
    };
  }, []);

  // Room management: the server listens to join:project/leave:project etc.
  const subscribeToProject = useCallback((projectId: string) => {
    emitEvent('join:project', { projectId });
  }, [emitEvent]);

  const subscribeToTask = useCallback((taskId: string) => {
    emitEvent('join:task', { taskId });
  }, [emitEvent]);

  const subscribeToWorkspace = useCallback((workspaceId: string) => {
    emitEvent('join:workspace', { workspaceId });
  }, [emitEvent]);

  const unsubscribe = useCallback((roomName: string) => {
    emitEvent('leave:room', { room: roomName });
  }, [emitEvent]);

  // Hook specialized for task updates: registers multiple handlers and cleans up
  const useTaskUpdates = useCallback((taskId: string, handlersMap: Partial<Record<
    | 'task:created'
    | 'task:updated'
    | 'task:assigned'
    | 'task:statusChanged'
    | 'task:deleted'
    | 'comment:added',
    EventHandler<any>
  >>) => {
    // subscribe to task room
    subscribeToTask(taskId);

    const unsubscribes: (() => void)[] = [];

    Object.entries(handlersMap).forEach(([event, fn]) => {
      if (!fn) return;
      const unsub = useSocketEvent(event, fn as EventHandler<any>);
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((u) => u());
      unsubscribe(`task:${taskId}`);
    };
  }, [subscribeToTask, useSocketEvent, unsubscribe]);

  // Cleanup helper to remove all handlers and disconnect
  const disconnect = useCallback(() => {
    const s = socketRef.current;
    if (s) {
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
      queued.current = [];
      handlers.current.clear();
    }
  }, []);

  return {
    socketRef,
    emitEvent,
    useSocketEvent,
    subscribeToProject,
    subscribeToTask,
    subscribeToWorkspace,
    unsubscribe,
    useTaskUpdates,
    disconnect,
  };
}

export default useSocket;
