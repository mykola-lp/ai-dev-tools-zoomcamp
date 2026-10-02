import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dashboard } from "@/components/weather/Dashboard";
import { useSession } from "@/hooks/use-session";
import { getApi } from "@/services";
import { DEFAULT_VIEW_CONFIG } from "@/services/mock/mockApi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aeris — Weather Analytics Dashboard" },
      { name: "description", content: "Explore current, forecast and historical weather. Compare cities and spot anomalies and trends." },
      { property: "og:title", content: "Aeris — Weather Analytics Dashboard" },
      { property: "og:description", content: "Explore current, forecast and historical weather. Compare cities and spot anomalies and trends." },
    ],
  }),
  component: Index,
});

function Index() {
  const session = useSession();
  const user = session.data;
  const personal = useQuery({
    queryKey: ["personal", user?.id],
    queryFn: () => getApi().views.getPersonalDashboard(),
    enabled: !!user,
  });

  if (session.isLoading || (user && personal.isLoading)) return <Loading />;

  if (user && personal.data) {
    const p = personal.data;
    return p.source === "saved" ? (
      <Dashboard key={p.view.id} initialConfig={p.view} savedView={p.view} />
    ) : (
      <Dashboard key="default" initialConfig={p.config} title="Your default view" />
    );
  }
  return <Dashboard key="anon" initialConfig={DEFAULT_VIEW_CONFIG} />;
}

function Loading() {
  return <div className="glass h-64 animate-pulse rounded-3xl" />;
}
