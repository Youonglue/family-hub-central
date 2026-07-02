import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Trophy, ShoppingCart, ChefHat, Home, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Feature({ icon: Icon, title, desc, tint }: { icon: typeof Calendar; title: string; desc: string; tint: string }) {
  return (
    <div className="rounded-3xl bg-panel border border-border p-6 shadow-sm">
      <div
        className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl"
        style={{ background: `var(--kid-${tint}-soft)`, color: `var(--kid-${tint})` }}
      >
        <Icon className="size-5" />
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function Landing() {
  return (
    <main className="min-h-screen bg-canvas">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-2xl bg-primary text-primary-foreground font-display font-bold">
            H
          </div>
          <span className="font-display text-lg font-bold">Family Hub</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs font-semibold text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Open source · self-hostable
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-balance">
          The warm, kid-friendly dashboard for the whole family.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground text-pretty">
          Shared calendar, gamified chores with points and a leaderboard, meal planner, shopping list.
          Made to sit on the kitchen tablet.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            Create your family hub
          </Link>
          <a
            href="https://github.com"
            className="rounded-2xl border border-border bg-panel px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted"
          >
            View on GitHub
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={Trophy} title="Chores & points" tint="amber" desc="Kids tap to complete, earn points, unlock rewards you set. Confetti included." />
          <Feature icon={Calendar} title="Shared calendar" tint="sky" desc="Every family member colour-coded. Add events, see today at a glance." />
          <Feature icon={ShoppingCart} title="Shopping list" tint="emerald" desc="Categorised, live for everyone. Auto-fills from your meal plan." />
          <Feature icon={ChefHat} title="Meal planner" tint="rose" desc="Plan the week, save recipes, one-click generate the shopping list." />
          <Feature icon={Trophy} title="Leaderboard" tint="pink" desc="Weekly ranking, streaks, badges — big satisfying numbers." />
          <Feature icon={Home} title="Home Assistant ready" tint="violet" desc="Publishes chore events so you can trigger automations. (Coming next)" />
        </div>
      </section>
    </main>
  );
}
