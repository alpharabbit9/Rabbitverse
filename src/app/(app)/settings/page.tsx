import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getProfileSummary } from "@/lib/data/profile";
import { profile as sampleProfile } from "@/lib/sample-data";
import { Panel } from "@/components/dashboard/panel";
import { ThemeOrb } from "@/components/theme-orb";
import { Icon } from "@/components/icon";
import { ProfileAvatar } from "@/components/layout/profile-avatar";
import { RemindersCard } from "@/components/settings/reminders-card";
import { TargetsCard } from "@/components/settings/targets-card";
import { getTargets } from "@/lib/data/targets";
import { DEFAULT_TARGETS } from "@/lib/targets";
import { signOut } from "@/app/auth/actions";
import { describeTimeZone } from "@/lib/locale";
import { currencySymbol } from "@/lib/money";
import { currentDay, getLocaleContext, getSession } from "@/lib/session";
import { LocaleCard } from "@/components/settings/locale-card";
import { MascotCard } from "@/components/settings/mascot-card";
import { DEFAULT_MASCOT, MASCOT_NAMES } from "@/components/mascot/types";

/** Read the saved reminder time (user-local "HH:MM") from user_profiles.settings. */
async function getReminderTime(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_profiles").select("settings").maybeSingle();
  const settings = (data?.settings ?? {}) as { reminderTime?: string };
  return settings.reminderTime ?? "21:00";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm text-fg-secondary">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const p = isSupabaseConfigured
    ? await getProfileSummary(await currentDay())
    : { name: sampleProfile.name, email: null, avatarUrl: null, level: sampleProfile.level, streakDays: sampleProfile.streakDays, xp: 0, xpToNext: 1 };
  const reminderTime = isSupabaseConfigured ? await getReminderTime() : "21:00";
  const targets = isSupabaseConfigured ? await getTargets() : DEFAULT_TARGETS;
  const { tz, currency } = await getLocaleContext();
  const mascot = (await getSession())?.mascot ?? DEFAULT_MASCOT;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-fg-secondary">Personalize your Rabbit Verse</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Profile">
          <div className="mb-4 flex items-center gap-3">
            <ProfileAvatar name={p.name} avatarUrl={p.avatarUrl} size={56} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{p.name}</div>
              {p.email ? <div className="truncate text-xs text-fg-muted">{p.email}</div> : null}
            </div>
          </div>
          <Row label="Level" value={`Level ${p.level} · Explorer`} />
          <Row label="Streak" value={`${p.streakDays} day${p.streakDays === 1 ? "" : "s"}`} />
        </Panel>

        <Panel title="Appearance">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-fg-secondary">Theme</span>
            <ThemeOrb />
          </div>
          <p className="text-xs text-fg-muted">Dark is Rabbit Verse&apos;s home. A separate, airy light theme is available too.</p>
        </Panel>

        <Panel title="Preferences" subtitle="Where and in what you're logging">
          {isSupabaseConfigured ? (
            <LocaleCard timezone={tz} currency={currency} />
          ) : (
            <>
              <Row label="Currency" value={`${currencySymbol(currency)} ${currency}`} />
              <Row label="Timezone" value={describeTimeZone(tz)} />
              <p className="pt-3 text-xs text-fg-muted">Sign in to set your own timezone and currency.</p>
            </>
          )}
        </Panel>

        <Panel title="Mascot" subtitle="Who shows up on your dashboard">
          {isSupabaseConfigured ? (
            <MascotCard initial={mascot} />
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
              <Icon name="Sparkles" size={18} style={{ color: "var(--accent-purple)" }} />
              <div>
                <div className="font-medium">Sign in to pick a mascot</div>
                <div className="text-xs text-fg-muted">
                  Demo mode always shows the {MASCOT_NAMES[DEFAULT_MASCOT]}. Six creatures are waiting.
                </div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Targets" subtitle="What Rabbit measures you against" className="lg:col-span-2">
          {isSupabaseConfigured ? (
            <TargetsCard initial={targets} />
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
              <Icon name="Target" size={18} style={{ color: "var(--accent-gold)" }} />
              <div>
                <div className="font-medium">Sign in to set targets</div>
                <div className="text-xs text-fg-muted">Spend caps, weekly workouts and check-ins are saved to your profile.</div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Reminders">
          {isSupabaseConfigured ? (
            <RemindersCard initialTime={reminderTime} />
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
              <Icon name="Bell" size={18} style={{ color: "var(--accent-orange)" }} />
              <div>
                <div className="font-medium">Sign in to enable reminders</div>
                <div className="text-xs text-fg-muted">Push notifications need a signed-in account and a configured VAPID key.</div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Data">
          {isSupabaseConfigured ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
                <Icon name="CheckCircle2" size={18} style={{ color: "var(--accent-mint)" }} />
                <div>
                  <div className="font-medium">Connected to Supabase</div>
                  <div className="text-xs text-fg-muted">Your data syncs privately across devices.</div>
                </div>
              </div>
              <form action={signOut}>
                <button type="submit" className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:border-border-strong hover:text-fg">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
              <Icon name="Sparkles" size={18} style={{ color: "var(--accent-purple)" }} />
              <div>
                <div className="font-medium">Demo mode</div>
                <div className="text-xs text-fg-muted">Add Supabase keys (see SUPABASE_SETUP.md) to sign in and sync real data.</div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
