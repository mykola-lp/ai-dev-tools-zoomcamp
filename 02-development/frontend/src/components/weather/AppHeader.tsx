import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getApi } from "@/services";
import { useSession } from "@/hooks/use-session";
import { ThemeSlider } from "./ThemeSlider";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/views", label: "Views" },
  { to: "/history", label: "History" },
] as const;

export function AppHeader() {
  const { data: user } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    await getApi().auth.logout();
    qc.clear();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="glass flex flex-wrap items-center justify-between gap-2 rounded-2xl sm:gap-3 px-3 py-3 sm:px-6">
      <Link to="/" className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary font-display text-lg text-primary-foreground shadow-lg">A</div>
        <div className="hidden leading-tight sm:block">
          <p className="font-display text-lg font-semibold tracking-tight">Aeris</p>
          <p className="eyebrow">weather analytics</p>
        </div>
      </Link>
      <nav className="flex items-center gap-0 text-sm sm:gap-0.5">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="rounded-lg px-2 py-1.5 text-muted-foreground transition hover:bg-glass sm:px-3"
            activeProps={{ className: "bg-glass-strong font-medium text-foreground" }}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <ThemeSlider className="order-last w-full md:order-none md:ml-auto md:w-auto" />
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="Account" className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold uppercase text-primary-foreground">
              {user.email.slice(0, 2)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button asChild size="sm" className="rounded-xl">
          <Link to="/login">Sign in</Link>
        </Button>
      )}
    </header>
  );
}
