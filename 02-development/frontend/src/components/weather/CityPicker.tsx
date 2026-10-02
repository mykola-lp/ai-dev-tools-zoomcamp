import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Plus, Search, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApi } from "@/services";
import { useSession } from "@/hooks/use-session";
import { WorldMap } from "./WorldMap";

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
}

export function CityPicker({ selected, onToggle }: Props) {
  const [q, setQ] = useState("");
  const { data: user } = useSession();
  const results = useQuery({ queryKey: ["citySearch", q], queryFn: () => getApi().cities.search(q), enabled: q.trim().length > 0 });
  const mapCities = useQuery({ queryKey: ["mapCities"], queryFn: () => getApi().cities.listMapCities() });
  const saved = useQuery({ queryKey: ["savedCities"], queryFn: () => getApi().savedCities.list(), enabled: !!user });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl">
          <Plus className="size-4" /> Add city
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Choose cities</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="search">
          <TabsList>
            <TabsTrigger value="search"><Search className="size-4" /> Search</TabsTrigger>
            <TabsTrigger value="map"><MapPin className="size-4" /> Map</TabsTrigger>
            {user && <TabsTrigger value="saved"><Star className="size-4" /> Saved</TabsTrigger>}
          </TabsList>
          <TabsContent value="search" className="space-y-3">
            <Input autoFocus placeholder="Search city or country…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search city" />
            <div className="space-y-1">
              {(results.data ?? []).map((c) => (
                <CityRow key={c.id} name={c.name} sub={c.country} on={selected.includes(c.id)} onClick={() => onToggle(c.id)} />
              ))}
              {q && results.data?.length === 0 && <p className="text-sm text-muted-foreground">No cities found.</p>}
            </div>
          </TabsContent>
          <TabsContent value="map">
            <WorldMap cities={mapCities.data ?? []} selected={selected} onToggle={onToggle} />
            <p className="mt-2 text-xs text-muted-foreground">Tap a dot to add or remove a city.</p>
          </TabsContent>
          {user && (
            <TabsContent value="saved" className="space-y-1">
              {(saved.data ?? []).map((c) => (
                <CityRow key={c.id} name={c.name} sub={c.country} on={selected.includes(c.id)} onClick={() => onToggle(c.id)} />
              ))}
              {saved.data?.length === 0 && <p className="text-sm text-muted-foreground">No saved cities yet — star a city on the dashboard.</p>}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CityRow({ name, sub, on, onClick }: { name: string; sub: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl glass-inset px-4 py-2.5 text-left transition hover:bg-glass-strong">
      <span>
        <span className="block text-sm font-medium">{name}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
      <span className={on ? "text-xs font-semibold text-primary" : "text-xs text-muted-foreground"}>{on ? "Selected" : "Add"}</span>
    </button>
  );
}
