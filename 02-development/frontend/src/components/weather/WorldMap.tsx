import type { City } from "@/services";

interface Props {
  cities: City[];
  selected: string[];
  onToggle: (id: string) => void;
}

/** Lightweight equirectangular map for picking cities. */
export function WorldMap({ cities, selected, onToggle }: Props) {
  const x = (lon: number) => lon + 180;
  const y = (lat: number) => 90 - lat;
  return (
    <svg viewBox="0 0 360 180" className="w-full rounded-2xl glass-inset" role="img" aria-label="World map of selectable cities">
      {Array.from({ length: 11 }, (_, i) => (
        <line key={`v${i}`} x1={i * 36} y1={0} x2={i * 36} y2={180} stroke="var(--border)" strokeWidth={0.3} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 45} x2={360} y2={i * 45} stroke="var(--border)" strokeWidth={0.3} />
      ))}
      <line x1={0} y1={90} x2={360} y2={90} stroke="var(--subtle)" strokeWidth={0.4} strokeDasharray="2 2" />
      {cities.map((c) => {
        const on = selected.includes(c.id);
        return (
          <g key={c.id} className="cursor-pointer" onClick={() => onToggle(c.id)}>
            <title>{`${c.name}, ${c.country}`}</title>
            <circle cx={x(c.lon)} cy={y(c.lat)} r={on ? 4 : 2.6} fill={on ? "var(--primary)" : "var(--subtle)"} opacity={on ? 1 : 0.7} />
            {on && <circle cx={x(c.lon)} cy={y(c.lat)} r={7} fill="none" stroke="var(--primary)" strokeWidth={0.6} />}
            <text x={x(c.lon) + 4} y={y(c.lat) - 3} fontSize={5} fill="var(--foreground)" opacity={on ? 1 : 0.55}>
              {c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
