import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getMentalData } from "@/lib/data/mental";
import { getTargets } from "@/lib/data/targets";
import { DEFAULT_TARGETS, sectionTargetStatuses } from "@/lib/targets";
import { activity as sampleActivity, journal as sampleJournal } from "@/lib/sample-data";
import { MentalView } from "./mental-view";
import { currentDay } from "@/lib/session";

export default async function MentalHealthPage() {
  const today = await currentDay();

  if (!isSupabaseConfigured) {
    const statuses = sectionTargetStatuses("mental", { today, targets: DEFAULT_TARGETS, journal: sampleJournal });
    return <MentalView journal={sampleJournal} activity={sampleActivity} today={today} statuses={statuses} />;
  }

  const [{ journal, activity }, targets] = await Promise.all([getMentalData(today), getTargets()]);
  const statuses = sectionTargetStatuses("mental", { today, targets, journal });
  return <MentalView journal={journal} activity={activity} today={today} statuses={statuses} canLog />;
}
