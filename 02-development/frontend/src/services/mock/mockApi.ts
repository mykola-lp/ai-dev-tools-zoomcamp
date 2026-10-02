// Mock implementation of the application API. Behaves like the real backend:
// auth, ownership & visibility rules, refresh policy, analytics, immutable runs.
import { analyze } from "./analytics";
import { CITIES, DAY_MS, dailyValues, dateOf, seasonalBaseline } from "./data";
import {
  ApiError,
  PERIODS,
  type AnalysisRun,
  type City,
  type CitySeries,
  type DataCategory,
  type Freshness,
  type SavedView,
  type User,
  type ViewConfig,
  type WeatherApi,
} from "../types";

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) };
}

export function browserStore(): KeyValueStore {
  if (typeof window === "undefined" || !window.localStorage) return memoryStore();
  return {
    get: (k) => window.localStorage.getItem(k),
    set: (k, v) => window.localStorage.setItem(k, v),
  };
}

interface DbUser extends User {
  password: string;
  savedCityIds: string[];
}
interface Db {
  users: DbUser[];
  sessionUserId: string | null;
  views: SavedView[];
  runs: AnalysisRun[];
  freshness: Record<DataCategory, { lastUpdated: number; version: number }>;
}

/** Backend refresh policy per data category (ms). */
export const REFRESH_POLICY: Record<DataCategory, number> = {
  current: 10 * 60_000,
  forecast: 60 * 60_000,
  historical: 24 * 60 * 60_000,
};

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  cityIds: ["lisbon", "london", "kyiv"],
  period: "last30",
  metrics: ["temperature", "precipitation", "windSpeed", "humidity"],
  dashboard: { chartType: "line", showTable: true, showInsights: true },
};

export interface MockOptions {
  store?: KeyValueStore;
  latencyMs?: number;
  now?: () => number;
  /** probability (0..1) that a manual refresh fails — simulates upstream outages */
  refreshFailureRate?: number;
}

const KEY = "aeris.mockdb.v1";

export function createMockApi(opts: MockOptions = {}): WeatherApi {
  const store = opts.store ?? browserStore();
  const latency = opts.latencyMs ?? 0;
  const now = opts.now ?? (() => Date.now());
  const failRate = opts.refreshFailureRate ?? 0;

  const load = (): Db => {
    const raw = store.get(KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as Db;
      } catch {
        /* reset */
      }
    }
    const t = now();
    return {
      users: [],
      sessionUserId: null,
      views: [],
      runs: [],
      freshness: {
        current: { lastUpdated: t - 4 * 60_000, version: 0 },
        forecast: { lastUpdated: t - 25 * 60_000, version: 0 },
        historical: { lastUpdated: t - 3 * 3600_000, version: 0 },
      },
    };
  };
  const save = (db: Db) => store.set(KEY, JSON.stringify(db));
  const tx = async <T>(fn: (db: Db) => T): Promise<T> => {
    if (latency) await new Promise((r) => setTimeout(r, latency));
    const db = load();
    const out = fn(db);
    save(db);
    return structuredClone(out);
  };
  let seq = 0;
  const id = (p: string) => `${p}_${now().toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

  const requireUser = (db: Db): DbUser => {
    const u = db.users.find((x) => x.id === db.sessionUserId);
    if (!u) throw new ApiError("UNAUTHORIZED", "Sign in to use this feature.");
    return u;
  };
  const publicUser = (u: DbUser): User => ({ id: u.id, email: u.email });
  const cityById = (cid: string) => {
    const c = CITIES.find((x) => x.id === cid);
    if (!c) throw new ApiError("NOT_FOUND", `Unknown city ${cid}`);
    return c;
  };
  const validateConfig = (c: ViewConfig) => {
    if (!c.cityIds.length) throw new ApiError("VALIDATION", "Select at least one city.");
    if (!c.metrics.length) throw new ApiError("VALIDATION", "Select at least one metric.");
    c.cityIds.forEach(cityById);
  };

  /** Simulated scheduled backend job: auto-refresh stale categories. */
  const autoRefresh = (db: Db) => {
    const t = now();
    (Object.keys(REFRESH_POLICY) as DataCategory[]).forEach((cat) => {
      const f = db.freshness[cat];
      if (t - f.lastUpdated > REFRESH_POLICY[cat] * 1.5) {
        f.lastUpdated = t;
        f.version += 1;
      }
    });
  };

  const seriesFor = (db: Db, cityIds: string[], period: ViewConfig["period"]): CitySeries[] => {
    const p = PERIODS.find((x) => x.id === period);
    if (!p) throw new ApiError("VALIDATION", "Unknown period");
    const today = Math.floor(now() / DAY_MS);
    const version = db.freshness[p.kind].version;
    return cityIds.map((cid) => {
      const city = cityById(cid);
      const points = Array.from({ length: p.days }, (_, i) => {
        const day = p.kind === "historical" ? today - p.days + i : today + 1 + i;
        return { date: dateOf(day), values: dailyValues(city, day, p.kind === "forecast" ? version : 0) };
      });
      return { cityId: cid, points };
    });
  };

  const computeAnalysis = (db: Db, config: ViewConfig) => {
    validateConfig(config);
    const cities = config.cityIds.map(cityById);
    const series = seriesFor(db, config.cityIds, config.period);
    return { cities, result: analyze(cities, series, config.metrics, seasonalBaseline) };
  };

  return {
    auth: {
      getSession: () => tx((db) => {
        const u = db.users.find((x) => x.id === db.sessionUserId);
        return u ? publicUser(u) : null;
      }),
      register: (email, password) =>
        tx((db) => {
          const e = email.trim().toLowerCase();
          if (!/^\S+@\S+\.\S+$/.test(e)) throw new ApiError("VALIDATION", "Enter a valid email.");
          if (password.length < 6) throw new ApiError("VALIDATION", "Password must be at least 6 characters.");
          if (db.users.some((u) => u.email === e)) throw new ApiError("CONFLICT", "An account with this email already exists.");
          const u: DbUser = { id: id("usr"), email: e, password, savedCityIds: [] };
          db.users.push(u);
          db.sessionUserId = u.id;
          return publicUser(u);
        }),
      login: (email, password) =>
        tx((db) => {
          const u = db.users.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
          if (!u) throw new ApiError("UNAUTHORIZED", "Wrong email or password.");
          db.sessionUserId = u.id;
          return publicUser(u);
        }),
      logout: () => tx((db) => void (db.sessionUserId = null)),
    },

    cities: {
      search: (q) =>
        tx(() => {
          const s = q.trim().toLowerCase();
          if (!s) return [];
          return CITIES.filter((c) => c.name.toLowerCase().includes(s) || c.country.toLowerCase().includes(s)).slice(0, 8);
        }),
      listMapCities: () => tx(() => CITIES),
      getMany: (ids) => tx(() => ids.map(cityById)),
    },

    weather: {
      getCurrent: (cityIds) =>
        tx((db) => {
          autoRefresh(db);
          const t = now();
          const today = Math.floor(t / DAY_MS);
          const hour = new Date(t).getUTCHours();
          return cityIds.map((cid) => {
            const city = cityById(cid);
            const v = dailyValues(city, today, db.freshness.current.version);
            const diurnal = Math.sin(((hour + city.lon / 15 - 9) / 24) * 2 * Math.PI) * 4;
            return {
              cityId: cid,
              observedAt: new Date(db.freshness.current.lastUpdated).toISOString(),
              values: { ...v, temperature: Math.round((v.temperature + diurnal) * 10) / 10, apparentTemperature: Math.round((v.apparentTemperature + diurnal) * 10) / 10 },
            };
          });
        }),
      getSeries: (cityIds, period) => tx((db) => seriesFor(db, cityIds, period)),
      getFreshness: () =>
        tx((db) => {
          autoRefresh(db);
          return (Object.keys(db.freshness) as DataCategory[]).map<Freshness>((category) => ({
            category,
            lastUpdated: new Date(db.freshness[category].lastUpdated).toISOString(),
          }));
        }),
      refresh: (category) =>
        tx((db) => {
          if (failRate > 0 && Math.random() < failRate) throw new ApiError("UPSTREAM", "Weather provider is unavailable. Try again.");
          const f = db.freshness[category];
          const t = now();
          // backend decides: re-fetch only if cached data is older than 1/5 of the policy window
          const fetched = t - f.lastUpdated > REFRESH_POLICY[category] / 5;
          if (fetched) {
            f.lastUpdated = t;
            f.version += 1;
          }
          return { category, lastUpdated: new Date(f.lastUpdated).toISOString(), fetchedFromSource: fetched };
        }),
    },

    analytics: {
      analyze: (config) => tx((db) => computeAnalysis(db, config).result),
    },

    savedCities: {
      list: () => tx((db) => requireUser(db).savedCityIds.map(cityById)),
      add: (cid) =>
        tx((db) => {
          const u = requireUser(db);
          cityById(cid);
          if (!u.savedCityIds.includes(cid)) u.savedCityIds.push(cid);
          return u.savedCityIds.map(cityById);
        }),
      remove: (cid) =>
        tx((db) => {
          const u = requireUser(db);
          u.savedCityIds = u.savedCityIds.filter((x) => x !== cid);
          return u.savedCityIds.map(cityById);
        }),
    },

    views: {
      list: () =>
        tx((db) => {
          const u = requireUser(db);
          return db.views.filter((v) => v.ownerId === u.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        }),
      get: (vid) =>
        tx((db) => {
          const v = db.views.find((x) => x.id === vid);
          if (!v) throw new ApiError("NOT_FOUND", "View not found.");
          if (v.visibility === "private" && v.ownerId !== db.sessionUserId) throw new ApiError("NOT_FOUND", "View not found.");
          return v;
        }),
      create: (input) =>
        tx((db) => {
          const u = requireUser(db);
          validateConfig(input);
          const t = new Date(now()).toISOString();
          const v: SavedView = {
            id: id("view"),
            ownerId: u.id,
            name: input.name.trim() || "Untitled view",
            visibility: input.visibility,
            cityIds: [...input.cityIds],
            period: input.period,
            metrics: [...input.metrics],
            dashboard: { ...input.dashboard },
            createdAt: t,
            updatedAt: t,
          };
          db.views.push(v);
          return v;
        }),
      update: (vid, patch) =>
        tx((db) => {
          const u = requireUser(db);
          const v = db.views.find((x) => x.id === vid);
          if (!v) throw new ApiError("NOT_FOUND", "View not found.");
          if (v.ownerId !== u.id) throw new ApiError("FORBIDDEN", "Only the owner can modify this view.");
          const next = { ...v, ...patch, updatedAt: new Date(now() + 1).toISOString() };
          validateConfig(next);
          Object.assign(v, next);
          return v;
        }),
      remove: (vid) =>
        tx((db) => {
          const u = requireUser(db);
          const v = db.views.find((x) => x.id === vid);
          if (!v) throw new ApiError("NOT_FOUND", "View not found.");
          if (v.ownerId !== u.id) throw new ApiError("FORBIDDEN", "Only the owner can delete this view.");
          db.views = db.views.filter((x) => x.id !== vid);
        }),
      getPersonalDashboard: () =>
        tx((db) => {
          const u = requireUser(db);
          const last = db.views.filter((v) => v.ownerId === u.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
          if (last) return { source: "saved" as const, view: last };
          const cityIds = u.savedCityIds.length ? u.savedCityIds.slice(0, 3) : DEFAULT_VIEW_CONFIG.cityIds;
          return { source: "default" as const, config: { ...structuredClone(DEFAULT_VIEW_CONFIG), cityIds } };
        }),
    },

    history: {
      list: () =>
        tx((db) => {
          const u = requireUser(db);
          return db.runs.filter((r) => r.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        }),
      get: (rid) =>
        tx((db) => {
          const u = requireUser(db);
          const r = db.runs.find((x) => x.id === rid && x.userId === u.id);
          if (!r) throw new ApiError("NOT_FOUND", "Analysis run not found.");
          return r;
        }),
      run: (config) =>
        tx((db) => {
          const u = requireUser(db);
          const snapshot = structuredClone(config);
          const { cities, result } = computeAnalysis(db, snapshot);
          const kind = PERIODS.find((p) => p.id === config.period)!.kind;
          const run: AnalysisRun = {
            id: id("run"),
            userId: u.id,
            createdAt: new Date(now()).toISOString(),
            config: snapshot,
            cities,
            dataVersion: `${kind}@v${db.freshness[kind].version}:${new Date(db.freshness[kind].lastUpdated).toISOString()}`,
            result,
          };
          db.runs.push(run);
          return run;
        }),
    },
  };
}
