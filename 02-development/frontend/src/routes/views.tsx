import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Link2, Lock, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { SignInPrompt } from "@/components/weather/SignInPrompt";
import { useSession } from "@/hooks/use-session";
import { getApi, PERIODS } from "@/services";
import { metricLabel } from "@/components/weather/format";

export const Route = createFileRoute("/views")({
  head: () => ({
    meta: [
      { title: "Saved views & cities — Aeris" },
      { name: "description", content: "Manage your saved weather views, sharing settings and saved cities." },
      { property: "og:title", content: "Saved views & cities — Aeris" },
      { property: "og:description", content: "Manage your saved weather views and cities." },
    ],
  }),
  component: ViewsPage,
});

function ViewsPage() {
  const { data: user, isLoading } = useSession();
  const qc = useQueryClient();
  const api = getApi();
  const views = useQuery({ queryKey: ["views"], queryFn: () => api.views.list(), enabled: !!user });
  const cities = useQuery({ queryKey: ["savedCities"], queryFn: () => api.savedCities.list(), enabled: !!user });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["views"] });
    qc.invalidateQueries({ queryKey: ["personal"] });
  };
  const vis = useMutation({
    mutationFn: ({ id, pub }: { id: string; pub: boolean }) => api.views.update(id, { visibility: pub ? "public" : "private" }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: (id: string) => api.views.remove(id), onSuccess: invalidate });
  const unstar = useMutation({ mutationFn: (id: string) => api.savedCities.remove(id), onSuccess: (l) => qc.setQueryData(["savedCities"], l) });

  if (isLoading) return null;
  if (!user) return <SignInPrompt what="saved views" />;

  const copy = (id: string) => {
    const url = `${window.location.origin}/v/${id}`;
    navigator.clipboard?.writeText(url);
    toast.success("Share link copied", { description: url });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="glass rounded-3xl p-6 lg:col-span-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Saved views</h1>
        <div className="mt-4 space-y-3">
          {views.data?.length === 0 && <p className="text-sm text-muted-foreground">No saved views yet. Configure the dashboard and press “Save view”.</p>}
          {views.data?.map((v) => (
            <div key={v.id} className="flex flex-col gap-3 rounded-2xl glass-inset p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <Link to="/v/$viewId" params={{ viewId: v.id }} className="font-medium hover:text-primary">{v.name}</Link>
                <p className="truncate text-xs text-muted-foreground">
                  {v.cityIds.length} cities · {PERIODS.find((p) => p.id === v.period)?.label} · {v.metrics.map(metricLabel).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  {v.visibility === "public" ? <Globe className="size-4" /> : <Lock className="size-4" />}
                  <Switch checked={v.visibility === "public"} onCheckedChange={(pub) => vis.mutate({ id: v.id, pub })} aria-label="Public" />
                </label>
                {v.visibility === "public" && (
                  <button onClick={() => copy(v.id)} aria-label="Copy share link" className="text-muted-foreground hover:text-primary"><Link2 className="size-4" /></button>
                )}
                <button onClick={() => del.mutate(v.id)} aria-label="Delete view" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="glass rounded-3xl p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">Saved cities</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Reusable across all your views</p>
        <div className="mt-4 space-y-2">
          {cities.data?.length === 0 && <p className="text-sm text-muted-foreground">Star a city on the dashboard to save it.</p>}
          {cities.data?.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl glass-inset px-4 py-3">
              <span>
                <span className="block text-sm">{c.name}</span>
                <span className="block text-xs text-muted-foreground">{c.country}</span>
              </span>
              <button onClick={() => unstar.mutate(c.id)} aria-label={`Unsave ${c.name}`}><Star className="size-4 fill-sun text-sun" /></button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
