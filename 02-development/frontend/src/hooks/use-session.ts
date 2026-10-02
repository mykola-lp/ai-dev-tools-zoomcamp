import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApi } from "@/services";

export const sessionKey = ["session"] as const;

export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: () => getApi().auth.getSession() });
}

export function useRefreshSession() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
