import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeSlider({ className = "" }: { className?: string }) {
  const [value, setValue] = useTheme();
  return (
    <div className={`flex items-center gap-2 rounded-xl glass-inset px-3 py-2 ${className}`}>
      <button type="button" aria-label="Darkest theme" onClick={() => setValue(0)} className="text-muted-foreground transition hover:text-foreground">
        <Moon className="size-4" />
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label="Theme brightness"
        aria-valuetext={`${value}% light`}
        className="theme-range w-full min-w-0 sm:w-28"
      />
      <button type="button" aria-label="Lightest theme" onClick={() => setValue(100)} className="text-muted-foreground transition hover:text-foreground">
        <Sun className="size-4" />
      </button>
    </div>
  );
}
