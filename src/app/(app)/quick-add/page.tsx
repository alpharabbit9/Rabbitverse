import Link from "next/link";
import { addDays, dhakaToday, shortDate } from "@/lib/dates";
import { NAV } from "@/lib/nav";
import { taka } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { Panel } from "@/components/dashboard/panel";
import { ExpenseForm } from "@/components/quick-add/expense-form";
import { addExpense } from "./actions";

export default async function QuickAddPage() {
  const today = dhakaToday();
  const yesterday = addDays(today, -1);

  // Demo mode: no backend — show the hub + v2 teaser.
  if (!isSupabaseConfigured) return <DemoHub />;

  const supabase = await createClient();
  const [{ data: categories }, { data: recent }] = await Promise.all([
    supabase.from("expense_categories").select("id,name,color,icon").order("name"),
    supabase.from("expenses").select("id,spent_at,amount,note,category_id").order("spent_at", { ascending: false }).order("created_at", { ascending: false }).limit(8),
  ]);

  const cats = categories ?? [];
  const catMap = new Map(cats.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Quick Add</h1>
        <p className="mt-1 text-sm text-fg-secondary">Log real activity — it saves to your private database.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Log an expense" subtitle="৳ BDT · today or yesterday">
          {cats.length ? (
            <ExpenseForm categories={cats} today={today} yesterday={yesterday} action={addExpense} />
          ) : (
            <p className="text-sm text-fg-muted">No categories found. They seed automatically on first sign-in — try refreshing.</p>
          )}
        </Panel>

        <Panel title="Recent expenses" subtitle="Straight from your database">
          {recent && recent.length ? (
            <ul className="space-y-2.5">
              {recent.map((e) => {
                const c = e.category_id ? catMap.get(e.category_id) : undefined;
                return (
                  <li key={e.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                    <span className="flex items-center gap-2.5 text-sm">
                      <Icon name={c?.icon ?? "Wallet"} size={16} style={{ color: c?.color ?? "var(--accent-mint)" }} />
                      <span>
                        <span className="font-medium">{c?.name ?? "Expense"}</span>
                        {e.note ? <span className="text-fg-muted"> · {e.note}</span> : null}
                        <span className="block text-xs text-fg-muted">{shortDate(e.spent_at)}</span>
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{taka(Number(e.amount))}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
              Nothing logged yet. Add your first expense on the left — it&apos;ll appear here instantly. 🐇
            </div>
          )}
        </Panel>
      </div>

      <p className="text-center text-xs text-fg-muted">
        More logging (projects, workouts, journal) is coming next — same pattern, one section at a time.
      </p>
    </div>
  );
}

function DemoHub() {
  const items = NAV.filter((n) => n.section);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Quick Add</h1>
        <p className="mt-1 text-sm text-fg-secondary">Running in demo mode — sign in to log real data.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((n) => (
          <Link key={n.href} href={n.href} className="glass flex flex-col items-center gap-3 rounded-2xl p-6 text-center transition-colors hover:border-border-strong">
            <span className="grid size-12 place-items-center rounded-2xl bg-card-hover">
              <Icon name={n.icon} size={22} style={{ color: n.accent }} />
            </span>
            <span className="text-sm font-medium">{n.label}</span>
          </Link>
        ))}
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="mb-2 flex items-center gap-2">
          <Icon name="Sparkles" size={16} style={{ color: "var(--accent-purple)" }} />
          <span className="font-semibold">Turn on real data</span>
        </div>
        <p className="text-sm text-fg-secondary">
          Set <code className="text-fg">NEXT_PUBLIC_DEMO_MODE=false</code> in <code className="text-fg">.env.local</code>, restart, and sign in with Google — then this page becomes a real logging form.
        </p>
      </div>
    </div>
  );
}
