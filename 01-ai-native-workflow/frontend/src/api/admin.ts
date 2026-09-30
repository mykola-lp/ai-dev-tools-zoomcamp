import { apiFetch } from "./client";
import type { components } from "./schema";

export type UserOut = components["schemas"]["UserOut"];
export type ChoreOut = components["schemas"]["ChoreOut"];
type ChorePeriod = components["schemas"]["ChorePeriod"];

export function listPendingUsers(): Promise<UserOut[]> {
  return apiFetch<UserOut[]>("/admin/users?status=pending");
}

export function approveUser(userId: number): Promise<UserOut> {
  return apiFetch<UserOut>(`/admin/users/${userId}/approve`, { method: "POST" });
}

export function rejectUser(userId: number): Promise<UserOut> {
  return apiFetch<UserOut>(`/admin/users/${userId}/reject`, { method: "POST" });
}

export function listProposedChores(): Promise<ChoreOut[]> {
  return apiFetch<ChoreOut[]>("/chores?status=proposed");
}

export function approveChore(
  choreId: number,
  weight: number,
  period: ChorePeriod,
): Promise<ChoreOut> {
  return apiFetch<ChoreOut>(`/admin/chores/${choreId}/approve`, {
    method: "POST",
    body: JSON.stringify({ weight, period }),
  });
}
