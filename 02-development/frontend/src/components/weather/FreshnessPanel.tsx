import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { getApi, type DataCategory, type RefreshStatus } from "@/services";
import { timeAgo } from "./format";

const LABELS: Record<DataCategory, string> = { current: "Current weather", forecast: "Forecast", historical: "Historical" };

export function FreshnessPanel() {
  const qc = useQueryClient();
  const fresh = useQuery({ queryKey: ["freshness"], queryFn: () => getApi().weather.getFreshness(), refetchInterval: 60_000 });
  const [status, setStatus] = useState<Record<DataCategory, RefreshStatus>>({ current: "idle", forecast: "idle", historical: "idle" });
  const [note, setNote] = useState<Partial<Record<DataCategory, string>>>({});

  async function refresh(cat: DataCategory) {
    setStatus((s) => ({ ...s, [cat]: "updating" }));
    try {
      const r = await getApi().weather.refresh(cat);
      setStatus((s) => ({ ...s, [cat]: "updated" }));
      setNote((n) => ({ ...n, [cat]: r.fetchedFromSource ? "New data fetched" : "Already up to date" }));
      await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "session" });
    } catch (e) {
      setStatus((s) => ({ ...s, [cat]: "failed" }));
      setNote((n) => ({ ...n, [cat]: e instanceof Error ? e.message : "Refresh failed" }));
    }
  }

  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight">Data freshness</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Updated automatically · refresh anytime</p>
      <div className="mt-4 space-y-3">
        {(["current", "forecast", "historical"] as DataCategory[]).map((cat) => {
          const f = fresh.data?.find((x) => x.category === cat);
          const st = status[cat];
          return (
            <div key={cat} className="flex items-center gap-3 rounded-xl glass-inset p-3">
              <button
                onClick={() => refresh(cat)}
                disabled={st === "updating"}
                aria-label={`Refresh ${LABELS[cat]}`}
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary transition hover:bg-primary/25 disabled:opacity-60"
              >
                <RefreshCw className={st === "updating" ? "size-4 animate-spin" : "size-4"} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{LABELS[cat]}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {st === "updating" ? "Updating…" : f ? `Last updated ${timeAgo(f.lastUpdated)}` : "…"}
                  {note[cat] && st !== "updating" ? ` · ${note[cat]}` : ""}
                </p>
              </div>
              <StatusDot status={st} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusDot({ status }: { status: RefreshStatus }) {
  const map: Record<RefreshStatus, string> = {
    idle: "bg-subtle",
    updating: "bg-primary animate-pulse",
    updated: "bg-success",
    failed: "bg-destructive",
  };
  return <span title={status} className={`size-2 shrink-0 rounded-full ${map[status]}`} />;
}
