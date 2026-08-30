-- Rabbit Verse — signup gate & invites (V4.0 Part 1, Phase D)
--
-- 0007 gave the owner a panel. This gives them a door:
--
--   * invites            — a code, or a bound email address, or both.
--   * invite_redemptions — who used which one, kept after the invite is spent.
--   * invite_live()      — the not-revoked / not-expired / uses-left predicate.
--   * invite_check()     — a BOOLEAN for anon, so /signup can say something kind.
--   * consume_invite()   — the real gate: locks, re-checks, increments, records.
--   * handle_new_user()  — rewritten head, identical body, enforcing the mode.
--
-- WHY THE TRIGGER IS THE GATE. Google OAuth writes `auth.users` before a single
-- line of application code runs — by the time `/auth/callback` sees anything the
-- account already exists. The `on_auth_user_created` trigger fires INSIDE that
-- insert's transaction, so raising there is the only way to refuse an account
-- rather than delete one afterwards. Everything in `src/` is a nicer error
-- message in front of this.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor or `supabase db push`.

-- ---------------------------------------------------------------------------
-- 1. invites
-- ---------------------------------------------------------------------------
-- An invite is code-bearing, email-bound, or both:
--
--   code only   — paste `RV-XXXX-XXXX` into /signup. Works for any address, and
--                 for the email+password path only (there is nowhere to type a
--                 code on Google's consent screen).
--   email only  — that address is admitted however it signs up, Google included.
--                 This is the one that makes OAuth work under an invite gate.
--   both        — the code must be typed AND it must be that person typing it.
--
-- `code` is `citext`, so case never matters and the printed form can be upper
-- case for legibility. Revocation is `revoked_at`, never a delete: the
-- redemption history has to outlive the invite.

create table if not exists public.invites (
  id         uuid primary key default gen_random_uuid(),
  code       citext not null unique,
  email      citext,
  max_uses   int not null default 1 check (max_uses between 1 and 100),
  uses       int not null default 0 check (uses >= 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  note       text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_invites_email   on public.invites (email) where email is not null;
create index if not exists idx_invites_created on public.invites (created_at desc);

alter table public.invites enable row level security;

-- Admins may READ. There is deliberately no insert, update or delete policy:
-- every write goes through the service role inside a Server Action, exactly as
-- with `admin_audit_log`. Anon and members see nothing at all — an invite code
-- sitting in a readable table would be an invite code anybody could take.
drop policy if exists "admins read invites" on public.invites;
create policy "admins read invites" on public.invites
  for select using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. invite_redemptions
-- ---------------------------------------------------------------------------
-- Composite primary key, so one person cannot redeem the same invite twice even
-- if `consume_invite` were somehow called twice for them.
--
-- RLS on with NO POLICIES = deny-all. Nothing in `src/` reads this; `uses` on the
-- invite is the number the panel shows. It exists so that "who did this code let
-- in?" is still answerable in the SQL editor a year from now.

create table if not exists public.invite_redemptions (
  invite_id   uuid not null references public.invites (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (invite_id, user_id)
);

alter table public.invite_redemptions enable row level security;

-- ---------------------------------------------------------------------------
-- 3. invite_live() — the predicate, in one place
-- ---------------------------------------------------------------------------
-- `stable`, NOT `immutable`, however tempting: it reads `now()`. Marking a
-- function immutable when it is not lets the planner fold it to a constant and
-- cache that — an expired invite would keep working until something happened to
-- invalidate the plan.
--
-- `p_email` null means "don't ask about the address" — that is how the overview
-- counts live invites without having a person in mind.

create or replace function public.invite_live(inv public.invites, p_email text default null)
returns boolean
language sql
stable
as $fn$
  select inv.id is not null
     and inv.revoked_at is null
     and (inv.expires_at is null or inv.expires_at > now())
     and inv.uses < inv.max_uses
     and (
       inv.email is null
       or nullif(btrim(coalesce(p_email, '')), '') is null
       or inv.email = btrim(p_email)::citext
     );
$fn$;

comment on function public.invite_live(public.invites, text) is
  'Can this invite still admit somebody (optionally: this address)?';

-- ---------------------------------------------------------------------------
-- 4. invite_check() — a friendly error, and nothing more
-- ---------------------------------------------------------------------------
-- Returns a BOOLEAN and never anything else. That is what stops it being a code
-- oracle: "no" covers "never existed", "already spent", "expired", "revoked" and
-- "bound to a different address" with one indistinguishable answer.
--
-- Purely cosmetic — it lets /signup say "that code isn't valid" before the round
-- trip instead of surfacing a database error afterwards. `consume_invite` inside
-- the trigger is the check that decides.

create or replace function public.invite_check(p_code text default null, p_email text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.invites i
    where public.invite_live(i, p_email)
      and (
        (
          nullif(btrim(coalesce(p_code, '')), '') is not null
          and i.code = btrim(p_code)::citext
        )
        or (
          nullif(btrim(coalesce(p_email, '')), '') is not null
          and i.email = btrim(p_email)::citext
        )
      )
  );
$fn$;

comment on function public.invite_check(text, text) is
  'Boolean only, on purpose: never reveals whether a code exists but is spent. Safe for anon.';

grant execute on function public.invite_check(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. consume_invite() — the gate itself
-- ---------------------------------------------------------------------------
-- NO GRANT. Called only from `handle_new_user()` (which runs as its definer) and
-- by the service role. If a member could call this, they could burn other
-- people's invites.
--
-- `for update` is the whole reason this is plpgsql and not SQL: two people
-- racing the last use of a five-use code both read `uses = 4`, and without the
-- lock both would be admitted. The lock serialises them, and under READ
-- COMMITTED the second one re-reads the row *after* waiting — so it sees
-- `uses = 5` and is refused. The gate is TOCTOU-safe.
--
-- Code first, then email-bound: a typed code is an explicit choice and should be
-- the one that gets spent. Both lookups filter on liveness, so a DEAD code does
-- not shadow a good email-bound invite — otherwise `invite_check` would say yes
-- (its two branches are an OR) and this would then say no, and the person would
-- get `Database error saving new user` after a green pre-check.

create or replace function public.consume_invite(p_code text, p_email text, p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_code  citext := nullif(btrim(coalesce(p_code, '')), '')::citext;
  v_email citext := nullif(btrim(coalesce(p_email, '')), '')::citext;
  v_inv   public.invites;
begin
  if v_code is not null then
    select i.* into v_inv
    from public.invites i
    where i.code = v_code
      and i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
      and i.uses < i.max_uses
    for update;
  end if;

  if v_inv.id is null and v_email is not null then
    -- Oldest first, so a stale invite is spent before a fresh one.
    select i.* into v_inv
    from public.invites i
    where i.email = v_email
      and i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
      and i.uses < i.max_uses
    order by i.created_at
    limit 1
    for update;
  end if;

  if v_inv.id is null then
    return false;
  end if;

  -- Re-checked after the lock, against the row as it is now.
  if not public.invite_live(v_inv, v_email::text) then
    return false;
  end if;

  update public.invites set uses = uses + 1 where id = v_inv.id;

  insert into public.invite_redemptions (invite_id, user_id)
  values (v_inv.id, p_user)
  on conflict do nothing;

  return true;
end $fn$;

comment on function public.consume_invite(text, text, uuid) is
  'Locks, re-checks and spends one use of an invite. Granted to nobody: trigger and service role only.';

revoke execute on function public.consume_invite(text, text, uuid) from public;

-- ---------------------------------------------------------------------------
-- 6. handle_new_user() — the same function, with a doorman
-- ---------------------------------------------------------------------------
-- Only the head is new. The body below is 0004's, verbatim: the two hard inserts
-- that must succeed or the signup rolls back, and the soft seeds wrapped in an
-- exception block so a bad seed can never cost somebody their account.
--
-- THIS ALSO GATES `auth.admin.createUser()`. There is no bypass, by design — a
-- future "admin creates an account for somebody" feature must either pass
-- `user_metadata.invite_code` or teach this function that the service role is
-- allowed through. Silently exempting the service role now would leave the gate
-- with a hole nobody remembers opening.
--
-- Both refusals raise P0001. GoTrue turns that into
-- `Database error saving new user`, which `/auth/callback` translates back into
-- a readable page — see the `?blocked=` branch there.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $fn$
declare
  fallback_name text := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  v_mode text := public.signup_mode();
  v_code text := nullif(new.raw_user_meta_data ->> 'invite_code', '');
begin
  -- The door. Everything below it is 0004 unchanged.
  if v_mode = 'closed' then
    raise exception 'signup_closed' using errcode = 'P0001';
  elsif v_mode = 'invite' then
    if not public.consume_invite(v_code, new.email::text, new.id) then
      raise exception 'invite_required' using errcode = 'P0001';
    end if;
  end if;

  -- Hard: these two must succeed or the signup rolls back.
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    fallback_name,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (id) do nothing;

  -- Soft: seeds are recoverable, so never let them abort a signup.
  begin
    insert into public.expense_categories (user_id, name, color, icon, is_preset) values
      (new.id, 'Food', 'var(--accent-mint)', 'Utensils', true),
      (new.id, 'Transport', 'var(--accent-blue)', 'Bus', true),
      (new.id, 'Shopping', 'var(--accent-purple)', 'ShoppingBag', true),
      (new.id, 'Bills', 'var(--accent-gold)', 'ReceiptText', true),
      (new.id, 'Health', 'var(--accent-orange)', 'HeartPulse', true),
      (new.id, 'Other', 'var(--accent-cyan)', 'Sparkles', true);

    insert into public.workout_plan_days (user_id, weekday, label, focus) values
      (new.id, 0, 'Push', 'Chest · Shoulders · Triceps'),
      (new.id, 1, 'Pull', 'Back · Biceps'),
      (new.id, 2, 'Legs', 'Quads · Hamstrings · Calves'),
      (new.id, 3, 'Rest', 'Mobility & stretching'),
      (new.id, 4, 'Upper', 'Chest · Back'),
      (new.id, 5, 'Cardio', 'Run · Core'),
      (new.id, 6, 'Rest', 'Recovery walk')
    on conflict (user_id, weekday) do nothing;
  exception
    when others then null;
  end;

  return new;
end $fn$;

-- Recreated so a database that has never run 0004's version still gets the hook.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Turning the gate on
-- ---------------------------------------------------------------------------
-- Deliberately NOT done here — a migration that closed signup would lock a fresh
-- database's first owner out of their own app. Use /admin/settings, or:
--
--   update public.app_settings set signup_mode = 'invite' where id;
--
-- The gate stops ACCOUNT CREATION only. Everybody who already has an account
-- keeps signing in, in every mode, forever.
