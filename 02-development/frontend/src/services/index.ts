// Single entry point for every backend call in the app.
// Swap the mock for a real HTTP implementation here; the WeatherApi contract stays the same.
import { createMockApi } from "./mock/mockApi";
import type { WeatherApi } from "./types";

let instance: WeatherApi | null = null;

export function getApi(): WeatherApi {
  if (!instance) instance = createMockApi({ latencyMs: 250, refreshFailureRate: 0.1 });
  return instance;
}

/** For tests or a future real backend. */
export function setApi(api: WeatherApi) {
  instance = api;
}

export * from "./types";
export { METRIC_RULES } from "./mock/analytics";
