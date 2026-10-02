import { METRIC_RULES, type Metric } from "@/services";

export const metricLabel = (m: Metric) => METRIC_RULES[m].label;
export const metricUnit = (m: Metric) => METRIC_RULES[m].unit;
export const fmt = (m: Metric, v: number) => `${Math.round(v * 10) / 10}${METRIC_RULES[m].unit ? " " + METRIC_RULES[m].unit : ""}`;

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function describeCode(code: number): { label: string; icon: string } {
  if (code >= 71) return { label: "Snow", icon: "❄" };
  if (code >= 61) return { label: code >= 63 ? "Rain" : "Light rain", icon: "☂" };
  if (code === 3) return { label: "Overcast", icon: "☁" };
  if (code === 2) return { label: "Partly cloudy", icon: "⛅" };
  return { label: "Clear", icon: "☀" };
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
