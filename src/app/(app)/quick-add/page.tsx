import { addDays, dhakaToday } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { categories as sampleCategories, projects as sampleProjects } from "@/lib/sample-data";
import { QuickAddHub, type QuickAddActions } from "@/components/quick-add/quick-add-hub";
import { addExpense } from "./actions";
import { createProject, logProgress } from "../projects/actions";
import { setTodayWorkout, logWeight } from "../workout/actions";
import { saveJournal } from "../mental-health/actions";

const actions: QuickAddActions = {
  addExpense,
  createProject,
  logProgress,
  setWorkout: setTodayWorkout,
  logWeight,
  saveJournal,
};

export default async function QuickAddPage() {
  const today = dhakaToday();
  const yesterday = addDays(today, -1);

  if (!isSupabaseConfigured) {
    return (
      <QuickAddHub
        mode="demo"
        today={today}
        yesterday={yesterday}
        categories={sampleCategories.map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon }))}
        projects={sampleProjects.filter((p) => p.status === "ongoing").map((p) => ({ id: p.id, name: p.name, unit: p.targetUnit }))}
        actions={actions}
      />
    );
  }

  const supabase = await createClient();
  const [{ data: categories }, { data: projects }] = await Promise.all([
    supabase.from("expense_categories").select("id,name,color,icon").order("name"),
    supabase.from("projects").select("id,name,target_unit").eq("status", "ongoing").order("created_at"),
  ]);

  return (
    <QuickAddHub
      mode="live"
      today={today}
      yesterday={yesterday}
      categories={categories ?? []}
      projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name, unit: p.target_unit }))}
      actions={actions}
    />
  );
}
