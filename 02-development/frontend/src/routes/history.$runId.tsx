import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SignInPrompt } from "@/components/weather/SignInPrompt";
import { useSession } from "@/hooks/use-session";
import { getApi, PERIODS } from "@/services";
import { fmt, metricLabel } from "@/components/weather/format";

export const Route = createFileRoute("/history/$runId")({
  head: () => ({
    meta: [
      { title: "Analysis run — Aeris" },
      { name: "description", content: "A saved snapshot of weather analytics: aggregates, anomalies, trends and insights." },
      { property: "og:title", content: "Analysis run — Aeris" },
      { property: "og:description", content: "A saved snapshot of weather analytics." },
    ],
  }),
  component: RunPage,
});

function RunPage() {
  const { runId } = Route.useParams();
  const { data: user, isLoading } = useSession();
  const run = useQuery({ queryKey: ["history", runId], queryFn: () => getApi().history.get(runId), enabled: !!user, retry: false });
  if (isLoading) return null;
  if (!user) return <SignInPrompt what="analysis history" />;
  if (run.error) return <p className="glass rounded-3xl p-8">{run.error.message}</p>;
  const r = run.data;
  if (!r) return <div className="glass h-64 animate-pulse rounded-3xl" />;
  const name = (id: string) => r.cities.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="glass rounded-3xl p-6 lg:col-span-3">
        <Link to="/history" className="text-xs text-primary hover:underline">← All runs</Link>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{r.cities.map((c) => c.name).join(" · ")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {PERIODS.find((p) => p.id === r.config.period)?.label} · run {new Date(r.createdAt).toLocaleString()} · data {r.dataVersion}
        </p>
      </section>
      <section className="glass rounded-3xl p-6 lg:col-span-2">
        <h2 className="font-display text-xl font-semibold">Aggregates</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr className="eyebrow text-left"><th className="py-2 font-normal">Metric</th><th className="font-normal">City</th><th className="text-right font-normal">Avg</th><th className="text-right font-normal">Min</th><th className="text-right font-normal">Max</th></tr></thead>
            <tbody className="font-mono">
              {r.result.aggregates.map((a) => (
                <tr key={a.metric + a.cityId} className="border-t">
                  <td className="py-2 font-sans">{metricLabel(a.metric)}</td>
                  <td className="font-sans">{name(a.cityId)}</td>
                  <td className="text-right">{fmt(a.metric, a.avg)}</td>
                  <td className="text-right">{fmt(a.metric, a.min)}</td>
                  <td className="text-right">{fmt(a.metric, a.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <aside className="glass rounded-3xl p-6">
        <h2 className="font-display text-xl font-semibold">Insights</h2>
        <ul className="mt-3 space-y-2">{r.result.insights.map((s, i) => <li key={i} className="rounded-xl glass-inset p-3 text-sm">{s}</li>)}</ul>
      </aside>
      <section className="glass rounded-3xl p-6 lg:col-span-3">
        <h2 className="font-display text-xl font-semibold">Anomalies & trends</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {r.result.anomalies.map((a, i) => <li key={`a${i}`} className="rounded-xl bg-sun/10 p-3 text-sm">{a.message}</li>)}
          {r.result.trends.filter((t) => t.direction !== "flat").map((t, i) => <li key={`t${i}`} className="rounded-xl glass-inset p-3 text-sm">{t.message}</li>)}
        </ul>
      </section>
    </div>
  );
}
