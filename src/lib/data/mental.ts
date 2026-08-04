import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { buildActivity, bump, type SectionCounts } from "@/lib/aggregate";
import { HEATMAP_DAYS, shapeJournal } from "@/lib/data/shared";
import type { DayActivity, JournalEntry } from "@/lib/types";

export async function getMentalData(today: string): Promise<{
  journal: JournalEntry[];
  activity: DayActivity[];
}> {
  const supabase = await createClient();
  const start = addDays(today, -HEATMAP_DAYS);
  const { data: rows } = await supabase
    .from("journal_entries")
    .select("id,entry_date,mood,body")
    .gte("entry_date", start)
    .order("entry_date");

  const journal = shapeJournal(rows);
  const byDate = new Map<string, Partial<SectionCounts>>();
  for (const j of journal) bump(byDate, j.date, "mental");
  return { journal, activity: buildActivity(start, today, byDate) };
}
