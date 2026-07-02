
-- =========== FAMILY MEMBERS ===========
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  avatar_color text not null default 'amber',
  is_kid boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.family_members to authenticated;
grant all on public.family_members to service_role;
alter table public.family_members enable row level security;
create policy "own family members" on public.family_members for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- =========== CHORES ===========
create type chore_recurrence as enum ('daily','weekly','once');
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.family_members(id) on delete set null,
  title text not null,
  points int not null default 10,
  recurrence chore_recurrence not null default 'daily',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chores to authenticated;
grant all on public.chores to service_role;
alter table public.chores enable row level security;
create policy "own chores" on public.chores for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- =========== CHORE COMPLETIONS ===========
create table public.chore_completions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  chore_id uuid not null references public.chores(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  points_awarded int not null,
  completed_at timestamptz not null default now()
);
create index on public.chore_completions (owner_id, completed_at desc);
create index on public.chore_completions (member_id, completed_at desc);
grant select, insert, update, delete on public.chore_completions to authenticated;
grant all on public.chore_completions to service_role;
alter table public.chore_completions enable row level security;
create policy "own completions" on public.chore_completions for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- =========== REWARDS ===========
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cost_points int not null default 100,
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.rewards to authenticated;
grant all on public.rewards to service_role;
alter table public.rewards enable row level security;
create policy "own rewards" on public.rewards for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  points_spent int not null,
  redeemed_at timestamptz not null default now()
);
grant select, insert, update, delete on public.redemptions to authenticated;
grant all on public.redemptions to service_role;
alter table public.redemptions enable row level security;
create policy "own redemptions" on public.redemptions for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- =========== SHOPPING LIST ===========
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity text,
  category text default 'general',
  checked boolean not null default false,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.shopping_items (owner_id, checked, created_at desc);
grant select, insert, update, delete on public.shopping_items to authenticated;
grant all on public.shopping_items to service_role;
alter table public.shopping_items enable row level security;
create policy "own shopping" on public.shopping_items for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- =========== RECIPES + MEAL PLAN ===========
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  ingredients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.recipes to authenticated;
grant all on public.recipes to service_role;
alter table public.recipes enable row level security;
create policy "own recipes" on public.recipes for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create type meal_type as enum ('breakfast','lunch','dinner');
create table public.meal_plan (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  meal meal_type not null default 'dinner',
  recipe_id uuid references public.recipes(id) on delete set null,
  custom_name text,
  created_at timestamptz not null default now(),
  unique (owner_id, plan_date, meal)
);
grant select, insert, update, delete on public.meal_plan to authenticated;
grant all on public.meal_plan to service_role;
alter table public.meal_plan enable row level security;
create policy "own meal plan" on public.meal_plan for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- =========== EVENTS ===========
create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.family_members(id) on delete set null,
  title text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  color text default 'accent',
  created_at timestamptz not null default now()
);
create index on public.events (owner_id, starts_at);
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "own events" on public.events for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- =========== POINTS BALANCE VIEW ===========
create or replace view public.member_points as
  select
    m.id as member_id,
    m.owner_id,
    m.name,
    m.avatar_color,
    m.is_kid,
    coalesce((select sum(points_awarded) from public.chore_completions c where c.member_id = m.id), 0)
      - coalesce((select sum(points_spent) from public.redemptions r where r.member_id = m.id), 0)
      as balance,
    coalesce((select sum(points_awarded) from public.chore_completions c
              where c.member_id = m.id
                and c.completed_at >= date_trunc('week', now())), 0) as week_points
  from public.family_members m;

grant select on public.member_points to authenticated;
