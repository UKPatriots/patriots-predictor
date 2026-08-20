-- Run this in Supabase's SQL Editor AFTER schema.sql and migration-2-questions.sql.
-- Replaces email sign-in with simple Name + PIN accounts. After this, you can
-- turn off/ignore all the SMTP/email setup entirely -- it's no longer used.

create extension if not exists pgcrypto;

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pin_hash text not null,
  created_at timestamptz default now()
);

create table if not exists sessions (
  token uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz default now()
);

-- Rebuild picks and answers to point at players instead of Supabase Auth users.
-- Safe to drop and recreate since these only ever held test data so far.
drop table if exists picks;
drop table if exists answers;
drop table if exists profiles;

create table picks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  game_id text not null references games(id) on delete cascade,
  pick text not null check (pick in ('NE','OPP')),
  correct boolean,
  created_at timestamptz default now(),
  unique (player_id, game_id)
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer_value numeric not null,
  points_earned int,
  created_at timestamptz default now(),
  unique (player_id, question_id)
);

alter table players enable row level security;
alter table sessions enable row level security;
alter table picks enable row level security;
alter table answers enable row level security;

-- Public can read players (for leaderboard names) and picks/answers (for
-- leaderboard totals). All WRITES now happen only through the site's API
-- routes using the service role key, which bypasses RLS -- so no public
-- insert/update policies are needed at all anymore. This is actually more
-- secure than before, since a PIN is checked server-side on every write.
create policy "players are public to read" on players
  for select using (true);

create policy "picks are public to read" on picks
  for select using (true);

create policy "answers are public to read" on answers
  for select using (true);

-- sessions table holds login tokens -- never expose it to the public.
-- (No select policy is created for it, so RLS blocks all public access.)
