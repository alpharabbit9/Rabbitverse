"use client";

import { profile } from "@/lib/sample-data";
import { Panel } from "@/components/dashboard/panel";
import { ThemeOrb } from "@/components/theme-orb";
import { Icon } from "@/components/icon";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOut } from "@/app/auth/actions";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm text-fg-secondary">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-fg-secondary">Personalize your Rabbit Verse</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Profile">
          <Row label="Name" value={profile.name} />
          <Row label="Level" value={`Level ${profile.level} · Explorer`} />
          <Row label="Streak" value={`${profile.streakDays} days`} />
        </Panel>

        <Panel title="Appearance">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-fg-secondary">Theme</span>
            <ThemeOrb />
          </div>
          <p className="text-xs text-fg-muted">Dark is Rabbit Verse&apos;s home. A separate, airy light theme is available too.</p>
        </Panel>

        <Panel title="Preferences">
          <Row label="Currency" value="৳ BDT" />
          <Row label="Timezone" value="Asia/Dhaka (UTC+6)" />
          <Row label="Daily reminder" value="9:00 PM" />
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
