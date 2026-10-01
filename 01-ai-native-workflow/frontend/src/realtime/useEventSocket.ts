import { useCallback, useEffect, useRef, useState } from "react";

export type ConnectionState = "connecting" | "open" | "closed";

export interface RealtimeEvent {
  type: string;
  payload: unknown;
}

export type EventHandler = (event: RealtimeEvent) => void;

const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

function wsUrl(token: string): string {
  const base = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
  const wsBase = base.replace(/^http/, "ws");

  return `${wsBase}/ws?token=${encodeURIComponent(token)}`;
}

export function useEventSocket(token: string | null) {
  const [state, setState] = useState<ConnectionState>("closed");

  const handlersRef = useRef<Set<EventHandler>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);
  const delayRef = useRef(INITIAL_DELAY_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const subscribe = useCallback((handler: EventHandler) => {
    handlersRef.current.add(handler);

    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    delayRef.current = INITIAL_DELAY_MS;

    if (!token) {
      return;
    }

    function connect(currentToken: string) {
      setState("connecting");

      const socket = new WebSocket(wsUrl(currentToken));
      socketRef.current = socket;

      socket.onopen = () => {
        delayRef.current = INITIAL_DELAY_MS;
        setState("open");
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        let parsed: RealtimeEvent;

        try {
          parsed = JSON.parse(event.data) as RealtimeEvent;

          if (typeof parsed.type !== "string") {
            return;
          }
        } catch {
          return;
        }

        handlersRef.current.forEach((handler) => handler(parsed));
      };

      socket.onclose = () => {
        setState("closed");

        if (stoppedRef.current) {
          return;
        }

        reconnectTimerRef.current = setTimeout(() => {
          delayRef.current = Math.min(
            delayRef.current * 2,
            MAX_DELAY_MS,
          );

          connect(currentToken);
        }, delayRef.current);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect(token);

    return () => {
      stoppedRef.current = true;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [token]);

  return {
    state: token ? state : "closed",
    subscribe,
  };
}
