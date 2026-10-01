import type { ReactNode } from "react";

import { useAuth } from "../auth/useAuth";
import { RealtimeContext } from "./RealtimeContext";
import { useEventSocket } from "./useEventSocket";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { state, subscribe } = useEventSocket(token);

  return (
    <RealtimeContext.Provider value={{ state, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}
