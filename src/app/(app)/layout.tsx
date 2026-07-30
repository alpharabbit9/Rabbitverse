import { dhakaToday } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getMoodState, getProfileSummary } from "@/lib/data/queries";
import { mood as sampleMood, profile as sampleProfile } from "@/lib/sample-data";
import { Sidebar, type ProfileChip } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { DesktopTopbar } from "@/components/layout/desktop-topbar";
import { MoodMode } from "@/components/mood-mode";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const today = dhakaToday();
  const [chip, mood]: [ProfileChip, Awaited<ReturnType<typeof getMoodState>>] = isSupabaseConfigured
    ? await Promise.all([getProfileSummary(today), getMoodState(today)])
    : [
        {
          name: sampleProfile.name,
          avatarUrl: null,
          level: sampleProfile.level,
          streakDays: sampleProfile.streakDays,
          xp: sampleProfile.xp,
          xpToNext: sampleProfile.xpToNext,
        },
        sampleMood,
      ];

  return (
    <div className="min-h-dvh">
      <MoodMode mood={mood} />
      <Sidebar profile={chip} />
      <div className="lg:pl-72">
        <MobileHeader />
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-32 pt-4 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          <DesktopTopbar />
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
