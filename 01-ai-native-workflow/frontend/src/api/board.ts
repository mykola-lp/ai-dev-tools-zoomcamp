import { apiFetch } from "./client";
import type { components } from "./schema";

export type AssignmentOut = components["schemas"]["AssignmentOut"];

export function listBoard(): Promise<AssignmentOut[]> {
  return apiFetch<AssignmentOut[]>("/board");
}

export function takeFromBoard(id: number): Promise<AssignmentOut> {
  return apiFetch<AssignmentOut>(`/board/${id}/take`, { method: "POST" });
}
