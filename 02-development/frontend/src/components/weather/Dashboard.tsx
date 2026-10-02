import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Copy, Play, Save, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ALL_METRICS, PERIODS, getApi, type Metric, type SavedView, type ViewConfig } from "@/services";
import { useSession } from "@/hooks/use-session";
import { CityPicker } from "./CityPicker";
import { FreshnessPanel } from "./FreshnessPanel";
import { CHART_COLORS, describeCode, fmt, metricLabel, metricUnit, timeAgo } from "./format";

interface Props {
  initialConfig: ViewConfig;
  savedView?: SavedView;
  readOnly?: boolean;
  title?: string;
}

export function Dashboard({ initialConfig, savedView, readOnly, title }: Props) {
  const [config, setConfig] = useState<ViewConfig>(initialConfig);
  const [focusId, setFocusId] = useState<string>(initialConfig.cityIds[0] ?? "");
  const [chartMetric, setChartMetric] = useState<Metric>(initialConfig.metrics[0] ?? "temperature");
  const [saveOpen, setSaveOpen] = useState(false);
  const { data: user } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const api = getApi();
  const ids = config.cityIds;
  const focus = ids.includes(focusId) ? focusId : (ids[0] ?? "");
  const activeMetric = config.metrics.includes(chartMetric) ? chartMetric : config.metrics[0];

  const cities = useQuery({ queryKey: ["cities", ids], queryFn: () => api.cities.getMany(ids) });
  const current = useQuery({ queryKey: ["current", ids], queryFn: () => api.weather.getCurrent(ids), enabled: ids.length > 0 });
  const series = useQuery({ queryKey: ["series", ids, config.period], queryFn: () => api.weather.getSeries(ids, config.period), enabled: ids.length > 0 });
  const forecast = useQuery({ queryKey: ["series", [focus], "next7"], queryFn: () => api.weather.getSeries([focus], "next7"), enabled: !!focus });
  const analysis = useQuery({
    queryKey: ["analysis", config],
    queryFn: () => api.analytics.analyze(config),
    enabled: ids.length > 0 && config.metrics.length > 0,
  });
  const savedCities = useQuery({ queryKey: ["savedCities"], queryFn: () => api.savedCities.list(), enabled: !!user });

  const nameOf = (id: string) => cities.data?.find((c) => c.id === id)?.name ?? id;
  const isOwner = !!user && savedView?.ownerId === user.id;

  const toggleCity = (id: string) =>
    setConfig((c) => ({ ...c, cityIds: c.cityIds.includes(id) ? c.cityIds.filter((x) => x !== id) : [...c.cityIds, id].slice(0, 5) }));
  const toggleMetric = (m: Metric) =>
    setConfig((c) => ({ ...c, metrics: c.metrics.includes(m) ? c.metrics.filter((x) => x !== m) : [...c.metrics, m] }));

  const chartData = useMemo(() => {
    if (!series.data || !activeMetric) return [];
    const len = series.data[0]?.points.length ?? 0;
    return Array.from({ length: len }, (_, i) => {
      const row: Record<string, string | number> = { date: series.data[0]?.points[i]?.date.slice(5) ?? "" };
      series.data.forEach((s) => (row[s.cityId] = s.points[i]?.values[activeMetric] ?? 0));
      return row;
    });
  }, [series.data, activeMetric]);

  const runMut = useMutation({
    mutationFn: () => api.history.run(config),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Analysis run saved to history", {
        action: { label: "Open", onClick: () => navigate({ to: "/history/$runId", params: { runId: run.id } }) },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: () => api.views.update(savedView!.id, config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["views"] });
      toast.success("View updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const starMut = useMutation({
    mutationFn: (id: string) => (savedCities.data?.some((c) => c.id === id) ? api.savedCities.remove(id) : api.savedCities.add(id)),
    onSuccess: (list) => qc.setQueryData(["savedCities"], list),
  });

  const requireAuth = (action: () => void) => {
    if (!user) {
      toast("Sign in to keep your work", { description: "Saved views, cities and history need an account." });
      navigate({ to: "/login" });
      return;
    }
    action();
  };

  const cur = current.data?.find((c) => c.cityId === focus);
  const curCity = cities.data?.find((c) => c.id === focus);
  const fc = forecast.data?.[0]?.points.slice(0, 5) ?? [];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <section className="glass rounded-3xl p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{savedView ? (readOnly ? "Shared view" : "Saved view") : user ? "Personal dashboard" : "Temporary view"}</p>
            <h1 className="mt-1 truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title ?? savedView?.name ?? "Weather overview"}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {!readOnly && isOwner && (
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
                <Save className="size-4" /> Save changes
              </Button>
            )}
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => requireAuth(() => setSaveOpen(true))}>
              {isOwner || readOnly ? <Copy className="size-4" /> : <Save className="size-4" />} {isOwner || readOnly ? "Save as new" : "Save view"}
            </Button>
            <Button size="sm" className="rounded-xl" onClick={() => requireAuth(() => runMut.mutate())} disabled={runMut.isPending || !ids.length}>
              <Play className="size-4" /> Run analysis
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {cities.data?.map((c, i) => (
            <span key={c.id} className="flex items-center gap-2 rounded-xl glass-inset px-3 py-1.5 text-sm">
              <span className="size-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <button onClick={() => setFocusId(c.id)} className={c.id === focus ? "font-semibold" : ""}>{c.name}</button>
              <button aria-label={`Remove ${c.name}`} onClick={() => toggleCity(c.id)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <CityPicker selected={ids} onToggle={toggleCity} />
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="eyebrow mr-1">Period</span>
            {PERIODS.map((p) => (
              <Chip key={p.id} on={config.period === p.id} onClick={() => setConfig((c) => ({ ...c, period: p.id }))}>{p.label}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="eyebrow mr-1">Metrics</span>
            {ALL_METRICS.map((m) => (
              <Chip key={m} on={config.metrics.includes(m)} onClick={() => toggleMetric(m)}>{metricLabel(m)}</Chip>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            <Switch checked={config.dashboard.chartType === "bar"} onCheckedChange={(v) => setConfig((c) => ({ ...c, dashboard: { ...c.dashboard, chartType: v ? "bar" : "line" } }))} />
            Bar chart
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={config.dashboard.showTable} onCheckedChange={(v) => setConfig((c) => ({ ...c, dashboard: { ...c.dashboard, showTable: v } }))} />
            Comparison table
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={config.dashboard.showInsights} onCheckedChange={(v) => setConfig((c) => ({ ...c, dashboard: { ...c.dashboard, showInsights: v } }))} />
            Insights
          </label>
        </div>
      </section>

      {ids.length === 0 ? (
        <section className="glass rounded-3xl p-10 text-center">
          <p className="font-display text-2xl">Pick a city to begin</p>
          <p className="mt-1 text-sm text-muted-foreground">Search by name or tap a city on the map.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
          {/* Current conditions + chart */}
          <section className="glass rounded-3xl p-5 sm:p-8 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current conditions</p>
                <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {curCity ? `${curCity.name}, ${curCity.country}` : "…"}
                </h2>
                {cur && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {describeCode(cur.values.weatherCode).label} · Feels like {Math.round(cur.values.apparentTemperature)}° · Updated {timeAgo(cur.observedAt)}
                  </p>
                )}
              </div>
              {user && focus && (
                <button
                  onClick={() => starMut.mutate(focus)}
                  className="flex items-center gap-2 rounded-xl glass-inset px-3 py-1.5 text-sm"
                  aria-label="Save city"
                >
                  <Star className={savedCities.data?.some((c) => c.id === focus) ? "size-4 fill-sun text-sun" : "size-4 text-muted-foreground"} />
                  {savedCities.data?.some((c) => c.id === focus) ? "Saved city" : "Save city"}
                </button>
              )}
            </div>
            {cur && (
              <div className="mt-6 flex flex-wrap items-end gap-6">
                <div className="flex items-start">
                  <span className="font-display text-7xl font-light leading-none sm:text-8xl">{Math.round(cur.values.temperature)}</span>
                  <span className="mt-3 font-display text-3xl text-subtle">°C</span>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <Stat label="Humidity" value={`${cur.values.humidity}%`} />
                  <Stat label="Wind" value={`${cur.values.windSpeed} km/h`} />
                  <Stat label="Pressure" value={`${Math.round(cur.values.pressure)} hPa`} />
                  <Stat label="Precipitation" value={`${cur.values.precipitation} mm`} />
                </div>
              </div>
            )}
            <div className="mt-7 rounded-2xl glass-inset p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="eyebrow">{activeMetric ? `${metricLabel(activeMetric)} · ${PERIODS.find((p) => p.id === config.period)?.label}` : "Select a metric"}</p>
                <div className="flex flex-wrap gap-1">
                  {config.metrics.map((m) => (
                    <Chip key={m} small on={m === activeMetric} onClick={() => setChartMetric(m)}>{metricLabel(m)}</Chip>
                  ))}
                </div>
              </div>
              <div className="h-56 sm:h-64">
                {activeMetric && (
                  <ResponsiveContainer width="100%" height="100%">
                    {config.dashboard.chartType === "bar" ? (
                      <BarChart data={chartData}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--subtle)" }} tickLine={false} axisLine={false} minTickGap={16} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--subtle)" }} tickLine={false} axisLine={false} width={36} unit={metricUnit(activeMetric) === "°C" ? "°" : ""} />
                        <Tooltip cursor={{ fill: "var(--muted)", stroke: "var(--border)" }} contentStyle={{ borderRadius: 12, border: "none", background: "var(--popover)", color: "var(--popover-foreground)", boxShadow: "var(--shadow-glass)" }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {ids.map((id, i) => <Bar key={id} dataKey={id} name={nameOf(id)} fill={CHART_COLORS[i % 5]} radius={[4, 4, 0, 0]} />)}
                      </BarChart>
                    ) : (
                      <LineChart data={chartData}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--subtle)" }} tickLine={false} axisLine={false} minTickGap={16} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--subtle)" }} tickLine={false} axisLine={false} width={36} />
                        <Tooltip cursor={{ fill: "var(--muted)", stroke: "var(--border)" }} contentStyle={{ borderRadius: 12, border: "none", background: "var(--popover)", color: "var(--popover-foreground)", boxShadow: "var(--shadow-glass)" }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {ids.map((id, i) => <Line key={id} type="monotone" dataKey={id} name={nameOf(id)} stroke={CHART_COLORS[i % 5]} strokeWidth={2.5} dot={false} />)}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          {/* Forecast */}
          <section className="glass flex flex-col rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold tracking-tight">Next 5 days</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{curCity?.name} forecast</p>
            <div className="mt-4 space-y-2">
              {fc.map((p) => {
                const d = describeCode(p.values.weatherCode);
                return (
                  <div key={p.date} className="flex items-center justify-between rounded-xl glass-inset px-4 py-3">
                    <span className="w-14 text-sm text-muted-foreground">{new Date(p.date + "T00:00:00Z").toLocaleDateString("en", { weekday: "short", timeZone: "UTC" })}</span>
                    <span className="text-primary" title={d.label}>{d.icon}</span>
                    <span className="font-mono text-xs text-subtle">{p.values.precipitation} mm</span>
                    <span className="font-mono text-sm font-medium">{Math.round(p.values.temperature)}°</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Anomalies & trends */}
          <section className="glass rounded-3xl p-6 lg:col-span-2">
            <h2 className="font-display text-xl font-semibold tracking-tight">Anomalies & trends</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Compared with seasonal baselines for each city</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {analysis.data?.anomalies.slice(0, 4).map((a, i) => (
                <div key={`a${i}`} className={`rounded-2xl p-4 outline-1 -outline-offset-1 ${a.difference > 0 ? "bg-sun/10 outline-sun/30" : "bg-primary/10 outline-primary/25"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.15em] ${a.difference > 0 ? "text-sun" : "text-primary"}`}>
                    Anomaly · {a.severity}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">{a.message}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {a.difference > 0 ? "+" : ""}{a.difference} {metricUnit(a.metric)} vs baseline
                  </p>
                </div>
              ))}
              {analysis.data?.trends.filter((t) => t.direction !== "flat").slice(0, 4).map((t, i) => (
                <div key={`t${i}`} className="rounded-2xl glass-inset p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-success">
                    Trend {t.direction === "up" ? "↗" : "↘"} · {t.strength}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">{t.message}</p>
                </div>
              ))}
              {analysis.data && analysis.data.anomalies.length === 0 && analysis.data.trends.every((t) => t.direction === "flat") && (
                <p className="text-sm text-muted-foreground">No anomalies or notable trends in this period.</p>
              )}
            </div>
          </section>

          <FreshnessPanel />

          {config.dashboard.showTable && (
            <section className="glass rounded-3xl p-6 lg:col-span-2">
              <h2 className="font-display text-xl font-semibold tracking-tight">Comparison</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="eyebrow text-left">
                      <th className="py-2 pr-3 font-normal">Metric</th>
                      <th className="py-2 pr-3 font-normal">City</th>
                      <th className="py-2 pr-3 text-right font-normal">Avg</th>
                      <th className="py-2 pr-3 text-right font-normal">Min</th>
                      <th className="py-2 pr-3 text-right font-normal">Max</th>
                      <th className="py-2 text-right font-normal">Total</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {config.metrics.flatMap((m) =>
                      ids.map((id, i) => {
                        const a = analysis.data?.aggregates.find((x) => x.metric === m && x.cityId === id);
                        if (!a) return null;
                        return (
                          <tr key={m + id} className="border-t">
                            <td className="py-2 pr-3 font-sans">{i === 0 ? metricLabel(m) : ""}</td>
                            <td className="py-2 pr-3 font-sans">{nameOf(id)}</td>
                            <td className="py-2 pr-3 text-right">{fmt(m, a.avg)}</td>
                            <td className="py-2 pr-3 text-right">{fmt(m, a.min)}</td>
                            <td className="py-2 pr-3 text-right">{fmt(m, a.max)}</td>
                            <td className="py-2 text-right">{a.sum !== null ? fmt(m, a.sum) : "—"}</td>
                          </tr>
                        );
                      }),
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {config.dashboard.showInsights && (
            <aside className={`glass rounded-3xl p-6 ${config.dashboard.showTable ? "" : "lg:col-span-3"}`}>
              <h2 className="font-display text-xl font-semibold tracking-tight">Insights</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Generated from the analysis</p>
              <ul className="mt-4 space-y-3">
                {analysis.data?.insights.map((s, i) => (
                  <li key={i} className="rounded-xl glass-inset p-3 text-sm leading-relaxed">{s}</li>
                ))}
              </ul>
            </aside>
          )}

          {/* Watched cities */}
          <section className="glass rounded-3xl p-6 lg:col-span-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">Selected cities</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {current.data?.map((c) => (
                <button
                  key={c.cityId}
                  onClick={() => setFocusId(c.cityId)}
                  className={`flex items-center justify-between rounded-2xl p-4 text-left glass-inset transition hover:bg-glass-strong ${c.cityId === focus ? "ring-2 ring-primary/40" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium">{nameOf(c.cityId)}</p>
                    <p className="text-xs text-muted-foreground">{describeCode(c.values.weatherCode).label}</p>
                  </div>
                  <span className="font-display text-2xl">{Math.round(c.values.temperature)}°</span>
                </button>
              ))}
            </div>
            {!user && (
              <p className="mt-4 text-xs text-muted-foreground">
                This is a temporary view. <Link to="/login" className="text-primary underline-offset-2 hover:underline">Sign in</Link> to save cities, views and analysis history.
              </p>
            )}
          </section>
        </div>
      )}

      <SaveViewDialog open={saveOpen} onOpenChange={setSaveOpen} config={config} defaultName={savedView ? `${savedView.name} (copy)` : "My view"} />
    </div>
  );
}

function Chip({ on, onClick, children, small }: { on: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-lg ${small ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"} transition ${on ? "bg-glass-strong font-medium text-foreground shadow-sm outline-1 -outline-offset-1 outline-primary/30" : "text-muted-foreground hover:bg-glass"}`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-subtle">{label}</p>
      <p className="font-mono text-lg">{value}</p>
    </div>
  );
}

function SaveViewDialog({ open, onOpenChange, config, defaultName }: { open: boolean; onOpenChange: (o: boolean) => void; config: ViewConfig; defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [isPublic, setPublic] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const mut = useMutation({
    mutationFn: () => getApi().views.create({ ...config, name, visibility: isPublic ? "public" : "private" }),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["views"] });
      qc.invalidateQueries({ queryKey: ["personal"] });
      onOpenChange(false);
      toast.success(`Saved “${v.name}”`);
      navigate({ to: "/v/$viewId", params: { viewId: v.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Save view</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="view-name">Name</Label>
            <Input id="view-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <label className="flex items-center justify-between rounded-xl glass-inset p-3 text-sm">
            <span>
              <span className="block font-medium">Public</span>
              <span className="block text-xs text-muted-foreground">Anyone with the link can open it</span>
            </span>
            <Switch checked={isPublic} onCheckedChange={setPublic} />
          </label>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
