import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SignInPrompt } from "@/components/weather/SignInPrompt";
import { useSession } from "@/hooks/use-session";
import { getApi, PERIODS } from "@/services";

export const Route = createFileRoute("/history/")({
  head: () => ({
    meta: [
      { title: "Analysis history — Aeris" },
      { name: "description", content: "Immutable snapshots of every weather analysis you have run." },
      { property: "og:title", content: "Analysis history — Aeris" },
      { property: "og:description", content: "Immutable snapshots of every weather analysis you have run." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data: user, isLoading } = useSession();
  const runs = useQuery({ queryKey: ["history"], queryFn: () => getApi().history.list(), enabled: !!user });
  if (isLoading) return null;
  if (!user) return <SignInPrompt what="analysis history" />;
  return (
    <section className="glass rounded-3xl p-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Analysis history</h1>
      <p className="mt-0.5 text-xs text-muted-foreground">Each run is a frozen snapshot — later edits never change it.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {runs.data?.length === 0 && <p className="text-sm text-muted-foreground">No runs yet. Press “Run analysis” on the dashboard.</p>}
        {runs.data?.map((r) => (
          <Link key={r.id} to="/history/$runId" params={{ runId: r.id }} className="rounded-2xl glass-inset p-4 transition hover:bg-glass-strong">
            <p className="text-sm font-medium">{r.cities.map((c) => c.name).join(" · ")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {PERIODS.find((p) => p.id === r.config.period)?.label} · {new Date(r.createdAt).toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-subtle">{r.result.anomalies.length} anomalies · {r.result.trends.filter((t) => t.direction !== "flat").length} trends</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
