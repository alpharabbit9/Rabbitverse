import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getMoodState } from "@/lib/data/overview";
import { getProfileSummary } from "@/lib/data/profile";
import {
  mood as sampleMood,
  profile as sampleProfile,
} from "@/lib/sample-data";
import { Sidebar, type ProfileChip } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { DesktopTopbar } from "@/components/layout/desktop-topbar";
import { MoodMode } from "@/components/mood-mode";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { redirect } from "next/navigation";
import { currentDay, getLocaleContext, getSession } from "@/lib/session";
import { LocaleProvider } from "@/components/locale-provider";
import { MascotProvider } from "@/components/mascot/provider";
import { DEFAULT_MASCOT } from "@/components/mascot/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Last of the three suspension gates (the other two are sign-in and the auth
  // callback). This one catches an account suspended *during* a live session,
  // and costs nothing extra: getSession() is React.cache()d and already read.
  const session = await getSession();
  if (session?.status === "suspended") redirect("/suspended");

  const today = await currentDay();
  // Seeded once here so no client component has to thread currency/timezone
  // down by prop. In demo mode this is the app defaults.
  const locale = await getLocaleContext();
  // Same trick for the creature: the two components that draw it sit deep
  // inside their pages, and demo mode always gets the rabbit.
  const mascot = session?.mascot ?? DEFAULT_MASCOT;
  const [chip, mood]: [ProfileChip, Awaited<ReturnType<typeof getMoodState>>] =
    isSupabaseConfigured
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
    <LocaleProvider value={locale}>
      <MascotProvider species={mascot}>
        <div className="min-h-dvh">
          <MoodMode mood={mood} />
          <ServiceWorkerRegister />
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
      </MascotProvider>
    </LocaleProvider>
  );
}
