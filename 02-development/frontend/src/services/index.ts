// Single entry point for every backend call in the app.
// Real HTTP API by default; set VITE_USE_MOCK=true to run fully offline on the mock.
import { createHttpApi } from "./http/httpApi";
import { createMockApi } from "./mock/mockApi";
import type { WeatherApi } from "./types";

let instance: WeatherApi | null = null;

function createDefaultApi(): WeatherApi {
  const useMock = import.meta.env.MODE === "test" || import.meta.env["VITE_USE_MOCK"] === "true";
  return useMock ? createMockApi({ latencyMs: 250, refreshFailureRate: 0.1 }) : createHttpApi();
}

export function getApi(): WeatherApi {
  if (!instance) instance = createDefaultApi();
  return instance;
}

/** For tests or swapping the implementation. */
export function setApi(api: WeatherApi) {
  instance = api;
}

export * from "./types";
export { METRIC_RULES } from "./mock/analytics";
