-- Run this in Supabase's SQL Editor AFTER schema.sql.
-- Adds support for custom season-long/stat questions with a scoring scale,
-- separate from the simple per-game winner picks.

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,               -- e.g. "How many sacks will the Patriots have this season?"
  deadline timestamptz not null,      -- guesses locked after this time
  points_exact int not null default 3,  -- points for an exact correct answer
  points_close int not null default 1,  -- points for a "close" answer
  tolerance numeric not null default 0, -- how far off still counts as "close" (0 = only exact counts)
  resolved boolean not null default false,
  correct_answer numeric,             -- filled in once you know the real result
  created_at timestamptz default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer_value numeric not null,
  points_earned int,
  created_at timestamptz default now(),
  unique (user_id, question_id)
);

alter table questions enable row level security;
alter table answers enable row level security;

create policy "questions are public to read" on questions
  for select using (true);

create policy "answers are public to read" on answers
  for select using (true);

create policy "users create their own answers" on answers
  for insert with check (auth.uid() = user_id);

create policy "users update their own answers" on answers
  for update using (auth.uid() = user_id);

-- questions are only ever written to by you (via the admin page, using the
-- service role key), so no public write policy is needed for that table.
