import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Dashboard } from "@/components/weather/Dashboard";
import { useSession } from "@/hooks/use-session";
import { getApi } from "@/services";

export const Route = createFileRoute("/v/$viewId")({
  head: () => ({
    meta: [
      { title: "Shared weather view — Aeris" },
      { name: "description", content: "A saved weather analytics view: cities, period, metrics and insights." },
      { property: "og:title", content: "Shared weather view — Aeris" },
      { property: "og:description", content: "A saved weather analytics view on Aeris." },
    ],
  }),
  component: ViewPage,
});

function ViewPage() {
  const { viewId } = Route.useParams();
  const { data: user, isLoading } = useSession();
  const view = useQuery({ queryKey: ["views", viewId, user?.id], queryFn: () => getApi().views.get(viewId), enabled: !isLoading, retry: false });
  if (view.error)
    return (
      <section className="glass rounded-3xl p-10 text-center">
        <p className="font-display text-2xl">This view isn’t available</p>
        <p className="mt-1 text-sm text-muted-foreground">It may be private or deleted.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">Open the dashboard</Link>
      </section>
    );
  if (!view.data) return <div className="glass h-64 animate-pulse rounded-3xl" />;
  const v = view.data;
  return <Dashboard key={v.id + v.updatedAt} initialConfig={v} savedView={v} readOnly={v.ownerId !== user?.id} />;
}
