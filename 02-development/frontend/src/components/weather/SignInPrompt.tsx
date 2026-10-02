import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function SignInPrompt({ what }: { what: string }) {
  return (
    <section className="glass rounded-3xl p-10 text-center">
      <p className="font-display text-2xl">Sign in to see your {what}</p>
      <p className="mt-1 text-sm text-muted-foreground">Exploring is free — saving needs an account.</p>
      <Button asChild className="mt-5 rounded-xl">
        <Link to="/login">Sign in</Link>
      </Button>
    </section>
  );
}
