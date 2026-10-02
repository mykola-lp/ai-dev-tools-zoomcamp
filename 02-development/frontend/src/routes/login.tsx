import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApi } from "@/services";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Aeris" },
      { name: "description", content: "Sign in or create an account to save views, cities and analysis history." },
      { property: "og:title", content: "Sign in — Aeris" },
      { property: "og:description", content: "Save views, cities and analysis history." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const api = getApi();
      await (mode === "login" ? api.auth.login(email, password) : api.auth.register(email, password));
      await qc.invalidateQueries();
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass mx-auto max-w-md rounded-3xl p-6 sm:p-8">
      <p className="eyebrow">{mode === "login" ? "Welcome back" : "New here"}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{mode === "login" ? "Sign in" : "Create account"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Keep your cities, views and analysis history.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full rounded-xl" disabled={busy}>
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-4 text-sm text-primary hover:underline">
        {mode === "login" ? "No account? Create one" : "Already have an account? Sign in"}
      </button>
    </section>
  );
}
