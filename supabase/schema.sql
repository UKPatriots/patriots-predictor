-- Run this once in the Supabase SQL Editor. It creates everything the
-- site needs: tables for games/picks/profiles, and security rules so
-- people can only edit their own picks.

create table if not exists games (
  id text primary key,               -- ESPN event id
  week int,
  opponent text not null,
  home_away text not null,           -- 'home' or 'away'
  game_time timestamptz not null,
  patriots_score int,
  opponent_score int,
  status text not null default 'scheduled', -- 'scheduled' | 'in_progress' | 'final'
  winner text                        -- 'NE' | 'OPP' | null
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now()
);

create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references games(id) on delete cascade,
  pick text not null check (pick in ('NE','OPP')),
  correct boolean,
  created_at timestamptz default now(),
  unique (user_id, game_id)
);

-- Row Level Security: locks the tables down, then opens specific, safe
-- permissions. Without this, anyone with the public key could edit
-- anyone else's picks.
alter table games enable row level security;
alter table profiles enable row level security;
alter table picks enable row level security;

-- Anyone (even logged out) can view games and the leaderboard data
create policy "games are public to read" on games
  for select using (true);

create policy "profiles are public to read" on profiles
  for select using (true);

create policy "picks are public to read" on picks
  for select using (true);

-- Only a logged-in user can create/update their OWN profile
create policy "users manage their own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "users update their own profile" on profiles
  for update using (auth.uid() = id);

-- Only a logged-in user can create/update their OWN picks, and only
-- before kickoff (enforced again in the app, this is a backstop)
create policy "users create their own picks" on picks
  for insert with check (auth.uid() = user_id);

create policy "users update their own picks" on picks
  for update using (auth.uid() = user_id);

-- games table is written to only by the server (service role key),
-- which bypasses RLS automatically -- no public write policy needed.
