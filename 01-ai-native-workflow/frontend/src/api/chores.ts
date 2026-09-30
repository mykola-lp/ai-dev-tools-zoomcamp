import { apiFetch } from "./client";
import type { components } from "./schema";

export type ChoreOut = components["schemas"]["ChoreOut"];
type ChorePeriod = components["schemas"]["ChorePeriod"];

export interface ChoreCreatePayload {
  title: string;
  description?: string;
  period: ChorePeriod;
  weight: number;
}

export function listActiveChores(): Promise<ChoreOut[]> {
  return apiFetch<ChoreOut[]>("/chores?status=active");
}

export function listProposedChores(): Promise<ChoreOut[]> {
  return apiFetch<ChoreOut[]>("/chores?status=proposed");
}

export function proposeChore(payload: ChoreCreatePayload): Promise<ChoreOut> {
  return apiFetch<ChoreOut>("/chores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
