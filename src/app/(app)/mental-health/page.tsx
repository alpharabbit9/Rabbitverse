import { dhakaToday } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getMentalData } from "@/lib/data/queries";
import { activity as sampleActivity, journal as sampleJournal } from "@/lib/sample-data";
import { MentalView } from "./mental-view";

export default async function MentalHealthPage() {
  const today = dhakaToday();

  if (!isSupabaseConfigured) {
    return <MentalView journal={sampleJournal} activity={sampleActivity} today={today} />;
  }

  const { journal, activity } = await getMentalData(today);
  return <MentalView journal={journal} activity={activity} today={today} canLog />;
}
