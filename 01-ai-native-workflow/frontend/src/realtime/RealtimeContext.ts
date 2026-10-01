import { createContext } from "react";

import type { ConnectionState, EventHandler } from "./useEventSocket";

export interface RealtimeContextValue {
  state: ConnectionState;
  subscribe: (handler: EventHandler) => () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);
