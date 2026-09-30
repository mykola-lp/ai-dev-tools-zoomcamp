import { ApiError } from "./client";

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApiError) {
    const detail = (error.detail as { detail?: string } | null)?.detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  return fallback;
}
