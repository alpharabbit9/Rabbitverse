import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireAdmin } from "@/lib/admin/guard";
import { getAdminOverview } from "@/lib/data/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
import { SignupModeCard } from "./signup-mode-card";

/*
  /admin/settings — the one switch there is.

  Deliberately not a settings *page* in the usual sense. Feature flags, kill
  switches and usage dashboards were all ruled out of scope; what is left is the
  question that actually gates other people using the app: can a stranger make an
  account right now?
*/

export default async function AdminSettingsPage() {
  await requireAdmin();
  const overview = await getAdminOverview();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-fg-secondary">Who is allowed to create an account.</p>
      </header>

      <SignupModeCard current={overview.signupMode} canWrite={isServiceRoleConfigured} />

      <section className="glass rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold">While invite-only</h2>
        <ul className="mt-3 space-y-2.5 text-sm text-fg-secondary">
          <Point icon="Ticket">
            A <strong className="font-medium text-fg">code</strong> is typed at <code>/signup</code>, or arrives
            prefilled in a link. It only works on the email-and-password form.
          </Point>
          <Point icon="Users">
            An <strong className="font-medium text-fg">invited address</strong> gets in however it signs up. This is
            the only way to invite somebody who uses Google — a consent screen has nowhere to type a code.
          </Point>
          <Point icon="ShieldCheck">
            The gate is enforced inside the signup transaction itself, not in front of it, so it cannot be walked
            around by hitting the API directly.
          </Point>
        </ul>
        <Link
          href="/admin/invites"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-fg-secondary transition-colors hover:border-border-strong hover:text-fg"
        >
          <Icon name="Ticket" size={15} />
          Manage invites
        </Link>
      </section>

      <section className="glass rounded-2xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold">What none of this does</h2>
        <p className="mt-2 text-sm text-fg-secondary">
          No mode ever affects an account that already exists. {overview.totalUsers}{" "}
          {overview.totalUsers === 1 ? "person keeps their access" : "people keep their access"} whatever this is set
          to — closing sign-ups shuts the door, it does not empty the building. To stop one specific person, suspend
          them on the{" "}
          <Link href="/admin" className="underline underline-offset-4 hover:text-fg">
            Users
          </Link>{" "}
          tab.
        </p>
      </section>
    </div>
  );
}

function Point({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon name={icon} size={15} className="mt-0.5 shrink-0 text-fg-muted" />
      <span>{children}</span>
    </li>
  );
}
