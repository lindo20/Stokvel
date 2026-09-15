create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (full_name ~ '^[A-Za-z ]{2,120}$'),
  email text not null,
  phone text not null check (phone ~ '^[0-9]{10}$'),
  role text not null default 'member' check (role in ('member', 'admin', 'chairman', 'secretary', 'treasurer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles drop constraint if exists profiles_full_name_check;
alter table public.profiles add constraint profiles_full_name_check check (full_name ~ '^[A-Za-z ]{2,120}$');
alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.profiles add constraint profiles_phone_check check (phone ~ '^[0-9]{10}$');
alter table public.profiles add column if not exists role text default 'member';
update public.profiles set role = 'member' where role is null;
alter table public.profiles alter column role set not null;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('member', 'admin', 'chairman', 'secretary', 'treasurer'));
update public.profiles
set email = auth_users.email
from auth.users as auth_users
where public.profiles.id = auth_users.id
  and public.profiles.email is null;
alter table public.profiles alter column email set not null;
create unique index if not exists profiles_email_key on public.profiles (email);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select, update on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_club_id uuid;
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'member')
  );

  -- The sign-up form asks which club the new member belongs to. That choice
  -- travels in as auth metadata (see AuthForm's "clubId" field); if it names
  -- a real club, link this account into it as a member of that club.
  begin
    v_club_id := (new.raw_user_meta_data ->> 'club_id')::uuid;
  exception when others then
    v_club_id := null;
  end;

  if v_club_id is not null and exists (select 1 from public.stokvel where id = v_club_id) then
    insert into public.members (user_id, stokvel_id, full_name, role, standing)
    values (
      new.id,
      v_club_id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      coalesce(new.raw_user_meta_data ->> 'role', 'member'),
      'good'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.stokvel (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  status text not null default 'active' check (status in ('active', 'suspended')),
  member_count integer not null default 0 check (member_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.stokvel add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.stokvel add column if not exists name text;
alter table public.stokvel add column if not exists status text default 'active';
alter table public.stokvel add column if not exists member_count integer default 0;
alter table public.stokvel alter column name set not null;
alter table public.stokvel alter column status set not null;
alter table public.stokvel alter column member_count set not null;

alter table public.stokvel enable row level security;

drop policy if exists "Users can view their own clubs" on public.stokvel;
drop policy if exists "Users can view their own stokvels" on public.stokvel;
create policy "Users can view their own stokvels"
  on public.stokvel for select
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Users can create their own clubs" on public.stokvel;
drop policy if exists "Users can create their own stokvels" on public.stokvel;
create policy "Users can create their own stokvels"
  on public.stokvel for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Users can update their own clubs" on public.stokvel;
drop policy if exists "Users can update their own stokvels" on public.stokvel;
create policy "Users can update their own stokvels"
  on public.stokvel for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Users can delete their own clubs" on public.stokvel;
drop policy if exists "Users can delete their own stokvels" on public.stokvel;
create policy "Users can delete their own stokvels"
  on public.stokvel for delete
  to authenticated
  using (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.stokvel to authenticated;

-- The sign-up form needs to list clubs a new member can choose to join,
-- before that person has a session (they are still "anon" at that point).
-- Scoped to the anon role only, deliberately: once signed in, "which clubs
-- can I see" must go back to owner-only (see the policy above), otherwise
-- every admin's dashboard would show every other admin's clubs too.
drop policy if exists "Anyone can browse active clubs" on public.stokvel;
create policy "Anyone can browse active clubs"
  on public.stokvel for select
  to anon
  using (status = 'active');

grant select on public.stokvel to anon;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stokvel_id uuid not null references public.stokvel(id) on delete cascade,
  full_name text not null check (full_name ~ '^[A-Za-z ]{2,120}$'),
  role text not null default 'member' check (role in ('member', 'admin', 'chairman', 'secretary', 'treasurer')),
  standing text not null default 'good' check (standing in ('good', 'in_arrears', 'suspended', 'exited')),
  joined_at timestamptz not null default now()
);

create table if not exists public.constitutions (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references public.stokvel(id) on delete cascade,
  version integer not null default 1,
  club_type text not null default 'rotating' check (club_type in ('rotating', 'accumulating', 'burial')),
  contribution_amount numeric(12, 2) not null default 0 check (contribution_amount >= 0),
  frequency text not null default 'monthly',
  grace_period_days integer not null default 0 check (grace_period_days >= 0),
  quorum_percentage integer not null default 50 check (quorum_percentage between 1 and 100),
  effective_from date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references public.stokvel(id) on delete cascade,
  entry_type text not null check (entry_type in ('contribution', 'penalty', 'payout', 'reversal', 'adjustment')),
  description text not null,
  amount numeric(12, 2) not null,
  resulting_balance numeric(12, 2),
  posted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references public.stokvel(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'outstanding' check (status in ('paid', 'partial', 'outstanding', 'late')),
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references public.stokvel(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'initiated', 'approved', 'paid', 'rejected')),
  initiated_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  scheduled_for date,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references public.stokvel(id) on delete cascade,
  title text not null,
  body text not null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Announcements go through a lifecycle: created as a draft, then published.
-- Publishing is what actually notifies members, so it needs its own moment
-- in time (published_at) distinct from when the draft was written.
alter table public.announcements add column if not exists category text not null default 'general';
alter table public.announcements drop constraint if exists announcements_category_check;
alter table public.announcements add constraint announcements_category_check check (category in ('general', 'meeting', 'contribution', 'payout'));

alter table public.announcements add column if not exists audience text not null default 'all';
alter table public.announcements drop constraint if exists announcements_audience_check;
alter table public.announcements add constraint announcements_audience_check check (audience in ('all', 'members', 'officers'));

alter table public.announcements add column if not exists channels text[] not null default array['in_app'];

alter table public.announcements add column if not exists status text;
update public.announcements set status = 'published' where status is null;
alter table public.announcements alter column status set default 'draft';
alter table public.announcements alter column status set not null;
alter table public.announcements drop constraint if exists announcements_status_check;
alter table public.announcements add constraint announcements_status_check check (status in ('draft', 'published'));

alter table public.announcements add column if not exists published_at timestamptz;
update public.announcements set published_at = created_at where published_at is null and status = 'published';

-- One row per (announcement, member, channel): the audit trail publishing
-- creates, and what a retry updates.
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references public.stokvel(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['members', 'constitutions', 'ledger_entries', 'contributions', 'payouts', 'announcements', 'notification_deliveries'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create or replace function public.user_owns_stokvel(target_stokvel_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stokvel
    where id = target_stokvel_id and owner_id = (select auth.uid())
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['members', 'constitutions', 'ledger_entries', 'contributions', 'payouts', 'announcements', 'notification_deliveries'] loop
    execute format('drop policy if exists %I on public.%I', 'Users can access own ' || table_name, table_name);
    execute format('create policy %I on public.%I for all to authenticated using (public.user_owns_stokvel(stokvel_id)) with check (public.user_owns_stokvel(stokvel_id))', 'Users can access own ' || table_name, table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

-- Members can read published announcements addressed to their role, in any
-- club they belong to. Additive to (never replacing) the owner's full access
-- from the generic policy above.
drop policy if exists "Members can view published announcements for their club" on public.announcements;
create policy "Members can view published announcements for their club"
  on public.announcements for select
  to authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.members m
      where m.stokvel_id = announcements.stokvel_id
        and m.user_id = (select auth.uid())
        and (
          announcements.audience = 'all'
          or (announcements.audience = 'officers' and m.role in ('admin', 'chairman', 'secretary', 'treasurer'))
          or (announcements.audience = 'members' and m.role = 'member')
        )
    )
  );

-- A member can see the delivery rows addressed to them (their in-app
-- notification list), separate from the owner's full access above.
drop policy if exists "Members can view their own notification deliveries" on public.notification_deliveries;
create policy "Members can view their own notification deliveries"
  on public.notification_deliveries for select
  to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.id = notification_deliveries.member_id
        and m.user_id = (select auth.uid())
    )
  );

-- Sending an email needs the recipient's address. Profiles are normally
-- private to their owner; this narrow exception lets a club owner look up
-- the email of someone who is a member of a club they own — nothing more.
drop policy if exists "Owners can view their members profiles" on public.profiles;
create policy "Owners can view their members profiles"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.members m
      join public.stokvel s on s.id = m.stokvel_id
      where m.user_id = profiles.id
        and s.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Members can see their own data
--
-- Until now, members/constitutions/contributions/payouts were readable only
-- by the club owner. A self-registered member couldn't see their own
-- standing, contributions, or payouts anywhere — which the Assistant (and
-- any future member-facing screen) needs to answer real questions.
-- ---------------------------------------------------------------------------

-- Resolves the signed-in user's member row for a given club, or null if they
-- do not belong to it. A member id is never taken from a caller-supplied
-- argument anywhere this is used — it's always "me, in this club".
create or replace function public.current_member_id(target_stokvel_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from public.members
   where stokvel_id = target_stokvel_id
     and user_id = (select auth.uid())
   limit 1;
$$;

drop policy if exists "Members can view their own membership" on public.members;
create policy "Members can view their own membership"
  on public.members for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Without this, a self-registered member's "which clubs can I see" query
-- (the same stokvel select the owner-only policy above already covers)
-- returns nothing — they don't own the club, they just belong to it. This
-- is what makes the club actually show up in their dashboard.
drop policy if exists "Members can view clubs they belong to" on public.stokvel;
create policy "Members can view clubs they belong to"
  on public.stokvel for select
  to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.stokvel_id = stokvel.id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "Members can view their club's constitution" on public.constitutions;
create policy "Members can view their club's constitution"
  on public.constitutions for select
  to authenticated
  using (
    exists (
      select 1 from public.members m
      where m.stokvel_id = constitutions.stokvel_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "Members can view their own contributions" on public.contributions;
create policy "Members can view their own contributions"
  on public.contributions for select
  to authenticated
  using (member_id = public.current_member_id(stokvel_id));

drop policy if exists "Members can view their own payouts" on public.payouts;
create policy "Members can view their own payouts"
  on public.payouts for select
  to authenticated
  using (member_id = public.current_member_id(stokvel_id));

-- Keeps stokvel.member_count in sync with the actual members table, no
-- matter which path added or removed a member (self sign-up, the admin
-- panel, or moving a member between clubs).
create or replace function public.sync_stokvel_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.stokvel set member_count = member_count + 1 where id = new.stokvel_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.stokvel set member_count = greatest(member_count - 1, 0) where id = old.stokvel_id;
    return old;
  elsif tg_op = 'UPDATE' and new.stokvel_id is distinct from old.stokvel_id then
    update public.stokvel set member_count = greatest(member_count - 1, 0) where id = old.stokvel_id;
    update public.stokvel set member_count = member_count + 1 where id = new.stokvel_id;
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists on_members_change_sync_count on public.members;
create trigger on_members_change_sync_count
  after insert or update or delete on public.members
  for each row execute procedure public.sync_stokvel_member_count();

-- One-time (and safe-to-rerun) correction for counts that drifted before
-- this trigger existed.
update public.stokvel s
set member_count = coalesce((select count(*) from public.members m where m.stokvel_id = s.id), 0)
where s.member_count <> coalesce((select count(*) from public.members m where m.stokvel_id = s.id), 0);

-- Seed Club 1/2/3 so new members have something to pick from at sign-up.
-- Owned by whichever admin account was created first; safe to run again
-- (skips clubs that already exist under that owner). If no admin account
-- exists yet, this is a no-op — create one, then rerun this file.
do $$
declare
  v_owner_id uuid;
begin
  select id into v_owner_id from public.profiles where role = 'admin' order by created_at asc limit 1;

  if v_owner_id is not null then
    insert into public.stokvel (owner_id, name, status, member_count)
    select v_owner_id, seed.name, 'active', 0
    from (values ('Club 1'), ('Club 2'), ('Club 3')) as seed(name)
    where not exists (
      select 1 from public.stokvel s where s.owner_id = v_owner_id and s.name = seed.name
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Treasurer functions
--
-- The treasurer needs broader-than-"my own row" access: all members in
-- their club (to see who's in arrears), the full ledger, and the ability to
-- record payments and initiate payouts. That's a different shape of access
-- than the "member sees their own data" policies above, so it gets its own
-- helper functions and its writes go through security-definer functions
-- rather than raw table policies — the pool-balance check and the
-- initiator-can't-approve-their-own-payout rule are cross-row invariants
-- that a plain RLS policy can't express, so they're enforced here instead,
-- as hard rules rather than merely a UI suggestion.
-- ---------------------------------------------------------------------------

alter table public.contributions add column if not exists amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0);

create table if not exists public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references public.stokvel(id) on delete cascade,
  ledger_balance numeric(12, 2) not null,
  bank_balance numeric(12, 2) not null,
  difference numeric(12, 2) not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['reconciliations'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', 'Users can access own ' || table_name, table_name);
    execute format('create policy %I on public.%I for all to authenticated using (public.user_owns_stokvel(stokvel_id)) with check (public.user_owns_stokvel(stokvel_id))', 'Users can access own ' || table_name, table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

create or replace function public.is_treasurer_of(target_stokvel_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.stokvel_id = target_stokvel_id
      and m.user_id = (select auth.uid())
      and m.role = 'treasurer'
  );
$$;

create or replace function public.is_officer_of(target_stokvel_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.stokvel_id = target_stokvel_id
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'chairman', 'secretary', 'treasurer')
  );
$$;

-- The pool balance is just the latest running balance on the ledger — see
-- set_ledger_running_balance() below for how that's kept accurate.
create or replace function public.pool_balance_of(target_stokvel_id uuid)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select resulting_balance from public.ledger_entries
      where stokvel_id = target_stokvel_id
      order by created_at desc, id desc
      limit 1),
    0
  );
$$;

drop policy if exists "Treasurers can view members in their club" on public.members;
create policy "Treasurers can view members in their club"
  on public.members for select
  to authenticated
  using (public.is_treasurer_of(stokvel_id));

drop policy if exists "Treasurers can view contributions in their club" on public.contributions;
create policy "Treasurers can view contributions in their club"
  on public.contributions for select
  to authenticated
  using (public.is_treasurer_of(stokvel_id));

drop policy if exists "Treasurers can view ledger in their club" on public.ledger_entries;
create policy "Treasurers can view ledger in their club"
  on public.ledger_entries for select
  to authenticated
  using (public.is_treasurer_of(stokvel_id));

-- Select is officer-wide (not treasurer-only) because approving a payout —
-- necessarily done by someone other than the treasurer who initiated it —
-- requires an officer to be able to see the queue in the first place.
drop policy if exists "Officers can view payouts in their club" on public.payouts;
create policy "Officers can view payouts in their club"
  on public.payouts for select
  to authenticated
  using (public.is_officer_of(stokvel_id));

drop policy if exists "Treasurers can view reconciliations in their club" on public.reconciliations;
create policy "Treasurers can view reconciliations in their club"
  on public.reconciliations for select
  to authenticated
  using (public.is_treasurer_of(stokvel_id));

drop policy if exists "Treasurers can record reconciliations in their club" on public.reconciliations;
create policy "Treasurers can record reconciliations in their club"
  on public.reconciliations for insert
  to authenticated
  with check (public.is_treasurer_of(stokvel_id));

-- Recomputes the running balance on every ledger insert, so "pool balance"
-- is never a client-side calculation that could drift — it's always exactly
-- what pool_balance_of() reads back.
create or replace function public.set_ledger_running_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous numeric(12, 2);
begin
  select resulting_balance into v_previous
    from public.ledger_entries
   where stokvel_id = new.stokvel_id
   order by created_at desc, id desc
   limit 1;

  new.resulting_balance := coalesce(v_previous, 0) + new.amount;
  return new;
end;
$$;

drop trigger if exists on_ledger_entry_set_balance on public.ledger_entries;
create trigger on_ledger_entry_set_balance
  before insert on public.ledger_entries
  for each row execute procedure public.set_ledger_running_balance();

-- Hard rule: a payout can never be initiated for more than the pool
-- currently holds. Enforced here, not just in the UI, so it can't be
-- bypassed by calling the table directly.
create or replace function public.check_payout_against_pool_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(12, 2);
begin
  v_balance := public.pool_balance_of(new.stokvel_id);
  if new.amount > v_balance then
    raise exception 'Payout amount R% exceeds the pool balance of R%.', new.amount, v_balance;
  end if;
  return new;
end;
$$;

drop trigger if exists on_payout_check_pool_balance on public.payouts;
create trigger on_payout_check_pool_balance
  before insert on public.payouts
  for each row execute procedure public.check_payout_against_pool_balance();

-- Hard rule: whoever initiated a payout cannot also be the one who approves
-- it — a different authorised officer must. Enforced at the row level so
-- it holds regardless of which function or client touches the table.
create or replace function public.check_payout_dual_control()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approved_by is not null and new.approved_by = new.initiated_by then
    raise exception 'The officer who initiated a payout cannot also approve it.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_payout_dual_control on public.payouts;
create trigger on_payout_dual_control
  before insert or update on public.payouts
  for each row execute procedure public.check_payout_dual_control();

-- Records a payment against one contribution: updates the contribution's
-- amount_paid/status and posts the matching ledger entry together, so the
-- two can never drift apart. security definer so it can write both tables
-- in one step, but it re-checks "is this caller actually the treasurer of
-- this club" itself first — the privilege escalation is scoped to exactly
-- this one operation, not a blanket bypass.
create or replace function public.record_contribution_payment(p_contribution_id uuid, p_amount numeric, p_description text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contribution record;
  v_new_paid numeric(12, 2);
  v_new_status text;
begin
  select * into v_contribution from public.contributions where id = p_contribution_id;
  if v_contribution is null then
    raise exception 'Contribution not found.';
  end if;

  if not public.is_treasurer_of(v_contribution.stokvel_id) then
    raise exception 'Only the treasurer of this club can record payments.' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  v_new_paid := coalesce(v_contribution.amount_paid, 0) + p_amount;
  v_new_status := case
    when v_new_paid >= v_contribution.amount then 'paid'
    when v_new_paid > 0 then 'partial'
    when v_contribution.due_date < current_date then 'late'
    else 'outstanding'
  end;

  update public.contributions
     set amount_paid = v_new_paid,
         status = v_new_status,
         paid_at = now()
   where id = p_contribution_id;

  insert into public.ledger_entries (stokvel_id, entry_type, description, amount, posted_by)
  values (
    v_contribution.stokvel_id,
    'contribution',
    coalesce(p_description, 'Contribution payment recorded'),
    p_amount,
    auth.uid()
  );
end;
$$;

revoke all on function public.record_contribution_payment(uuid, numeric, text) from public;
grant execute on function public.record_contribution_payment(uuid, numeric, text) to authenticated;

-- Initiating a payout is treasurer-only. The pool-balance check happens
-- automatically via the trigger above when the insert runs.
create or replace function public.initiate_payout(p_stokvel_id uuid, p_member_id uuid, p_amount numeric, p_scheduled_for date default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_treasurer_of(p_stokvel_id) then
    raise exception 'Only the treasurer of this club can initiate a payout.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.members where id = p_member_id and stokvel_id = p_stokvel_id) then
    raise exception 'That member does not belong to this club.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payout amount must be greater than zero.';
  end if;

  insert into public.payouts (stokvel_id, member_id, amount, status, initiated_by, scheduled_for)
  values (p_stokvel_id, p_member_id, p_amount, 'initiated', auth.uid(), p_scheduled_for)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.initiate_payout(uuid, uuid, numeric, date) from public;
grant execute on function public.initiate_payout(uuid, uuid, numeric, date) to authenticated;

-- Approving is open to any officer of the club except the one who
-- initiated it — the dual-control trigger above enforces that even if this
-- function's own check were somehow bypassed.
create or replace function public.approve_payout(p_payout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout record;
begin
  select * into v_payout from public.payouts where id = p_payout_id;
  if v_payout is null then
    raise exception 'Payout not found.';
  end if;

  if not public.is_officer_of(v_payout.stokvel_id) then
    raise exception 'Only an officer of this club can approve a payout.' using errcode = '42501';
  end if;

  if v_payout.initiated_by = auth.uid() then
    raise exception 'You cannot approve a payout you initiated yourself.';
  end if;

  if v_payout.status <> 'initiated' then
    raise exception 'Only an initiated payout can be approved.';
  end if;

  update public.payouts
     set status = 'approved', approved_by = auth.uid()
   where id = p_payout_id;

  insert into public.ledger_entries (stokvel_id, entry_type, description, amount, posted_by)
  values (v_payout.stokvel_id, 'payout', 'Payout approved', -v_payout.amount, auth.uid());
end;
$$;

revoke all on function public.approve_payout(uuid) from public;
grant execute on function public.approve_payout(uuid) to authenticated;
