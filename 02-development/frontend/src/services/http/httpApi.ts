// Real implementation of the WeatherApi contract: plain fetch against the backend under /api.
// The Vite dev proxy forwards /api to Spring Boot, so the SESSION cookie works as same-origin.
import {
  ApiError,
  type AnalysisResult,
  type AnalysisRun,
  type City,
  type CitySeries,
  type CurrentWeather,
  type Freshness,
  type PersonalDashboard,
  type RefreshResult,
  type SavedView,
  type User,
  type WeatherApi,
} from "../types";

const BASE = "/api";

type ErrorCode = ApiError["code"];
const CODES: ErrorCode[] = ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "CONFLICT", "UPSTREAM"];
const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: "VALIDATION",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  502: "UPSTREAM",
};

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
}

function toApiError(status: number, data: unknown): ApiError {
  const body = data !== null && typeof data === "object" ? (data as { code?: unknown; message?: unknown }) : {};
  const code = CODES.find((c) => c === body.code) ?? STATUS_TO_CODE[status] ?? "UPSTREAM";
  const message =
    typeof body.message === "string"
      ? body.message
      : status >= 500
        ? "The server is unavailable. Try again."
        : `Request failed (${status})`;
  return new ApiError(code, message);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const qs = options.query ? `?${new URLSearchParams(options.query).toString()}` : "";
  const hasBody = options.body !== undefined;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${qs}`, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      headers: hasBody ? { "Content-Type": "application/json" } : {},
      body: hasBody ? JSON.stringify(options.body) : null,
    });
  } catch {
    throw new ApiError("UPSTREAM", "Cannot reach the server. Is the backend running?");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) throw toApiError(res.status, data);
  return data as T;
}

const ids = (list: string[]) => list.join(",");
const enc = encodeURIComponent;

export function createHttpApi(): WeatherApi {
  return {
    auth: {
      // The backend answers JSON `null` when anonymous (never 401).
      getSession: () => request<User | null>("/auth/session"),
      // Responses also carry a `token`; the browser keeps the HttpOnly SESSION cookie, so we only expose the user.
      register: async (email, password) => {
        const r = await request<User>("/auth/register", { method: "POST", body: { email, password } });
        return { id: r.id, email: r.email };
      },
      login: async (email, password) => {
        const r = await request<User>("/auth/login", { method: "POST", body: { email, password } });
        return { id: r.id, email: r.email };
      },
      logout: () => request<void>("/auth/logout", { method: "POST" }),
    },

    cities: {
      search: (query) => request<City[]>("/cities", { query: { q: query } }),
      listMapCities: () => request<City[]>("/cities/map"),
      getMany: (cityIds) => request<City[]>("/cities/lookup", { query: { ids: ids(cityIds) } }),
    },

    weather: {
      getCurrent: (cityIds) => request<CurrentWeather[]>("/weather/current", { query: { cityIds: ids(cityIds) } }),
      getSeries: (cityIds, period) =>
        request<CitySeries[]>("/weather/series", { query: { cityIds: ids(cityIds), period } }),
      getFreshness: () => request<Freshness[]>("/weather/freshness"),
      refresh: (category) => request<RefreshResult>(`/weather/refresh/${enc(category)}`, { method: "POST" }),
    },

    analytics: {
      analyze: (config) => request<AnalysisResult>("/analytics/analyze", { method: "POST", body: config }),
    },

    savedCities: {
      list: () => request<City[]>("/saved-cities"),
      add: (cityId) => request<City[]>(`/saved-cities/${enc(cityId)}`, { method: "PUT" }),
      remove: (cityId) => request<City[]>(`/saved-cities/${enc(cityId)}`, { method: "DELETE" }),
    },

    views: {
      list: () => request<SavedView[]>("/views"),
      get: (id) => request<SavedView>(`/views/${enc(id)}`),
      create: (input) => request<SavedView>("/views", { method: "POST", body: input }),
      update: (id, patch) => request<SavedView>(`/views/${enc(id)}`, { method: "PATCH", body: patch }),
      remove: (id) => request<void>(`/views/${enc(id)}`, { method: "DELETE" }),
      getPersonalDashboard: () => request<PersonalDashboard>("/personal-dashboard"),
    },

    history: {
      list: () => request<AnalysisRun[]>("/history/runs"),
      get: (id) => request<AnalysisRun>(`/history/runs/${enc(id)}`),
      run: (config) => request<AnalysisRun>("/history/runs", { method: "POST", body: config }),
    },
  };
}
