import { apiFetch } from "./client";
import type { components } from "./schema";

export type AssignmentOut = components["schemas"]["AssignmentOut"];
export type WorkloadOut = components["schemas"]["WorkloadOut"];

export function listMyAssignments(): Promise<AssignmentOut[]> {
  return apiFetch<AssignmentOut[]>("/assignments/mine");
}

export function completeAssignment(id: number): Promise<AssignmentOut> {
  return apiFetch<AssignmentOut>(`/assignments/${id}/complete`, { method: "POST" });
}

export function postToBoard(id: number): Promise<AssignmentOut> {
  return apiFetch<AssignmentOut>(`/assignments/${id}/post-to-board`, { method: "POST" });
}

export function getWorkload(): Promise<WorkloadOut[]> {
  return apiFetch<WorkloadOut[]>("/workload");
}
