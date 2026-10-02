// Application API contract. These types describe OUR backend API — never the
// upstream weather provider. Real and mock implementations share them.

export type Metric =
  | "temperature"
  | "apparentTemperature"
  | "precipitation"
  | "windSpeed"
  | "humidity"
  | "pressure"
  | "snowfall"
  | "weatherCode";

export const ALL_METRICS: Metric[] = [
  "temperature",
  "apparentTemperature",
  "precipitation",
  "windSpeed",
  "humidity",
  "pressure",
  "snowfall",
  "weatherCode",
];

export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export type PeriodRange = "last7" | "last30" | "last90" | "next7" | "next14";

export const PERIODS: { id: PeriodRange; label: string; kind: "historical" | "forecast"; days: number }[] = [
  { id: "last7", label: "Past 7d", kind: "historical", days: 7 },
  { id: "last30", label: "Past 30d", kind: "historical", days: 30 },
  { id: "last90", label: "Past 90d", kind: "historical", days: 90 },
  { id: "next7", label: "Next 7d", kind: "forecast", days: 7 },
  { id: "next14", label: "Next 14d", kind: "forecast", days: 14 },
];

export interface DashboardSettings {
  chartType: "line" | "bar";
  showTable: boolean;
  showInsights: boolean;
}

export interface ViewConfig {
  cityIds: string[];
  period: PeriodRange;
  metrics: Metric[];
  dashboard: DashboardSettings;
}

export type Visibility = "private" | "public";

export interface SavedView extends ViewConfig {
  id: string;
  ownerId: string;
  name: string;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export type MetricValues = Record<Metric, number>;

export interface CurrentWeather {
  cityId: string;
  observedAt: string;
  values: MetricValues;
}

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  values: MetricValues;
}

export interface CitySeries {
  cityId: string;
  points: SeriesPoint[];
}

export interface Aggregate {
  cityId: string;
  metric: Metric;
  avg: number;
  min: number;
  max: number;
  sum: number | null;
}

export type Severity = "low" | "medium" | "high";

export interface Anomaly {
  type: "anomaly";
  cityId: string;
  metric: Metric;
  severity: Severity;
  value: number;
  baseline: number;
  difference: number;
  message: string;
}

export interface Trend {
  cityId: string;
  metric: Metric;
  direction: "up" | "down" | "flat";
  strength: "weak" | "moderate" | "strong";
  slopePerDay: number;
  message: string;
}

export interface AnalysisResult {
  aggregates: Aggregate[];
  anomalies: Anomaly[];
  trends: Trend[];
  insights: string[];
}

export interface AnalysisRun {
  id: string;
  userId: string;
  createdAt: string;
  config: ViewConfig;
  cities: City[];
  dataVersion: string;
  result: AnalysisResult;
}

export type DataCategory = "current" | "forecast" | "historical";

export type RefreshStatus = "idle" | "updating" | "updated" | "failed";

export interface Freshness {
  category: DataCategory;
  lastUpdated: string;
}

export interface RefreshResult {
  category: DataCategory;
  lastUpdated: string;
  fetchedFromSource: boolean;
}

export interface User {
  id: string;
  email: string;
}

export type PersonalDashboard =
  | { source: "saved"; view: SavedView }
  | { source: "default"; config: ViewConfig };

export class ApiError extends Error {
  constructor(
    public code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "UPSTREAM",
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The single services layer. Every backend call in the app goes through this. */
export interface WeatherApi {
  auth: {
    getSession(): Promise<User | null>;
    register(email: string, password: string): Promise<User>;
    login(email: string, password: string): Promise<User>;
    logout(): Promise<void>;
  };
  cities: {
    search(query: string): Promise<City[]>;
    listMapCities(): Promise<City[]>;
    getMany(ids: string[]): Promise<City[]>;
  };
  weather: {
    getCurrent(cityIds: string[]): Promise<CurrentWeather[]>;
    getSeries(cityIds: string[], period: PeriodRange): Promise<CitySeries[]>;
    getFreshness(): Promise<Freshness[]>;
    refresh(category: DataCategory): Promise<RefreshResult>;
  };
  analytics: {
    analyze(config: ViewConfig): Promise<AnalysisResult>;
  };
  savedCities: {
    list(): Promise<City[]>;
    add(cityId: string): Promise<City[]>;
    remove(cityId: string): Promise<City[]>;
  };
  views: {
    list(): Promise<SavedView[]>;
    get(id: string): Promise<SavedView>;
    create(input: ViewConfig & { name: string; visibility: Visibility }): Promise<SavedView>;
    update(id: string, patch: Partial<ViewConfig & { name: string; visibility: Visibility }>): Promise<SavedView>;
    remove(id: string): Promise<void>;
    getPersonalDashboard(): Promise<PersonalDashboard>;
  };
  history: {
    list(): Promise<AnalysisRun[]>;
    get(id: string): Promise<AnalysisRun>;
    run(config: ViewConfig): Promise<AnalysisRun>;
  };
}
