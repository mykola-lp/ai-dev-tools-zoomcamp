import type { City, Metric, MetricValues } from "../types";

export const CITIES: City[] = [
  { id: "lisbon", name: "Lisbon", country: "Portugal", lat: 38.72, lon: -9.14 },
  { id: "madrid", name: "Madrid", country: "Spain", lat: 40.42, lon: -3.7 },
  { id: "london", name: "London", country: "United Kingdom", lat: 51.51, lon: -0.13 },
  { id: "paris", name: "Paris", country: "France", lat: 48.86, lon: 2.35 },
  { id: "berlin", name: "Berlin", country: "Germany", lat: 52.52, lon: 13.4 },
  { id: "oslo", name: "Oslo", country: "Norway", lat: 59.91, lon: 10.75 },
  { id: "rome", name: "Rome", country: "Italy", lat: 41.9, lon: 12.5 },
  { id: "kyiv", name: "Kyiv", country: "Ukraine", lat: 50.45, lon: 30.52 },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", lat: 41.01, lon: 28.98 },
  { id: "cairo", name: "Cairo", country: "Egypt", lat: 30.04, lon: 31.24 },
  { id: "nairobi", name: "Nairobi", country: "Kenya", lat: -1.29, lon: 36.82 },
  { id: "capetown", name: "Cape Town", country: "South Africa", lat: -33.92, lon: 18.42 },
  { id: "dubai", name: "Dubai", country: "UAE", lat: 25.2, lon: 55.27 },
  { id: "mumbai", name: "Mumbai", country: "India", lat: 19.08, lon: 72.88 },
  { id: "singapore", name: "Singapore", country: "Singapore", lat: 1.35, lon: 103.82 },
  { id: "tokyo", name: "Tokyo", country: "Japan", lat: 35.68, lon: 139.69 },
  { id: "sydney", name: "Sydney", country: "Australia", lat: -33.87, lon: 151.21 },
  { id: "newyork", name: "New York", country: "United States", lat: 40.71, lon: -74.01 },
  { id: "chicago", name: "Chicago", country: "United States", lat: 41.88, lon: -87.63 },
  { id: "losangeles", name: "Los Angeles", country: "United States", lat: 34.05, lon: -118.24 },
  { id: "mexico", name: "Mexico City", country: "Mexico", lat: 19.43, lon: -99.13 },
  { id: "saopaulo", name: "São Paulo", country: "Brazil", lat: -23.55, lon: -46.63 },
  { id: "buenosaires", name: "Buenos Aires", country: "Argentina", lat: -34.6, lon: -58.38 },
  { id: "reykjavik", name: "Reykjavík", country: "Iceland", lat: 64.15, lon: -21.94 },
];

export const DAY_MS = 86_400_000;

export function dayIndexOf(date: string): number {
  return Math.floor(Date.parse(date + "T00:00:00Z") / DAY_MS);
}
export function dateOf(dayIndex: number): string {
  return new Date(dayIndex * DAY_MS).toISOString().slice(0, 10);
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** deterministic 0..1 random */
export function rand(seed: string): number {
  let t = hash(seed) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const noise = (seed: string) => rand(seed) * 2 - 1;

/** Seasonal climatological baseline — the "historical baseline" in the hybrid model. */
export function seasonalBaseline(city: City, metric: Metric, date: string): number {
  const doy = (dayIndexOf(date) % 365.25) / 365.25;
  const hemi = city.lat >= 0 ? 1 : -1;
  // peak around late July in north
  const season = Math.cos(2 * Math.PI * (doy - 0.56)) * hemi;
  const absLat = Math.abs(city.lat);
  const meanT = 28 - absLat * 0.42;
  const amp = Math.min(14, absLat * 0.26);
  const temp = meanT + amp * season;
  switch (metric) {
    case "temperature":
      return temp;
    case "apparentTemperature":
      return temp - 1;
    case "precipitation":
      return 2 + rand(city.id + "p") * 3;
    case "windSpeed":
      return 10 + rand(city.id + "w") * 10;
    case "humidity":
      return 55 + rand(city.id + "h") * 25;
    case "pressure":
      return 1013;
    case "snowfall":
      return temp < 1 ? 1.5 : 0;
    case "weatherCode":
      return 2;
  }
}

/** Synthetic "persisted normalized weather" for a city on a day. */
export function dailyValues(city: City, dayIndex: number, version = 0): MetricValues {
  const date = dateOf(dayIndex);
  const s = `${city.id}:${dayIndex}:${version}`;
  // slow weather regime (multi-day waves)
  const wave = Math.sin(dayIndex / 4.3 + rand(city.id) * 6) * 3 + Math.sin(dayIndex / 11 + rand(city.id + "b") * 6) * 2.5;
  const temperature = seasonalBaseline(city, "temperature", date) + wave + noise(s + "t") * 2;
  const windSpeed = Math.max(0, seasonalBaseline(city, "windSpeed", date) + noise(s + "w") * 8 + wave);
  const humidity = Math.min(100, Math.max(15, seasonalBaseline(city, "humidity", date) + noise(s + "h") * 15 - wave));
  const wet = rand(s + "r");
  const precipitation = wet > 0.6 ? (wet - 0.6) * 25 * (humidity / 70) : 0;
  const snowfall = temperature < 1 ? precipitation * 0.8 : 0;
  const pressure = 1013 - wave * 2 + noise(s + "pr") * 5;
  const apparentTemperature = temperature - windSpeed * 0.08 + (humidity - 50) * 0.03;
  const weatherCode = snowfall > 0 ? 71 : precipitation > 5 ? 63 : precipitation > 0 ? 61 : humidity > 75 ? 3 : humidity > 55 ? 2 : 0;
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    temperature: r(temperature),
    apparentTemperature: r(apparentTemperature),
    precipitation: r(precipitation),
    windSpeed: r(windSpeed),
    humidity: Math.round(humidity),
    pressure: r(pressure),
    snowfall: r(snowfall),
    weatherCode,
  };
}
