# Patriots Predictor — Setup Guide (no coding needed)

You'll create 3 free accounts and click through some setup screens. Total time: ~25 minutes.

## Part 1 — Put the code on GitHub

1. Go to https://github.com and click **Sign up**. Create a free account.
2. Once logged in, click the **+** icon (top right) → **New repository**.
3. Name it `patriots-predictor`, keep it **Public**, click **Create repository**.
4. On the new repo page, click **uploading an existing file**.
5. Drag in *every file and folder* from the project I gave you, then click **Commit changes**.

## Part 2 — Create your database (Supabase)

1. Go to https://supabase.com → **Start your project** → sign up (you can use your GitHub account to sign in instantly).
2. Click **New project**. Give it any name, set a database password (save it somewhere), pick the region closest to you, click **Create new project**. Wait ~2 minutes while it sets up.
3. In the left sidebar, click the **SQL Editor** icon.
4. Open the file `supabase/schema.sql` from the project, copy all of it, paste it into the SQL editor, click **Run**. This creates all your tables — you'll see "Success."
5. In the left sidebar, click **Project Settings** (gear icon) → **API**.
6. Keep this tab open — you'll need three values from it in Part 3:
   - **Project URL**
   - **anon public** key
   - **service_role** key (click "Reveal" to see it)

### Turn on email sign-in
7. Still in Supabase, go to **Authentication** → **Providers**, make sure **Email** is enabled (it is by default).
8. Go to **Authentication** → **URL Configuration** — you'll come back here in Part 3 to add your live website address once you have it.

## Part 3 — Publish the website (Vercel)

1. Go to https://vercel.com → **Sign up** → choose **Continue with GitHub** and allow access.
2. Click **Add New** → **Project**. Find `patriots-predictor` in the list and click **Import**.
3. Before clicking Deploy, open **Environment Variables** and add these four, using the values from Supabase Part 2 step 6:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key |
   | `CRON_SECRET` | make up any random password, e.g. `patsRule2026!` |

4. Click **Deploy**. Wait about a minute — you'll get a live link like `patriots-predictor.vercel.app`. That's your website! 🎉
5. Go back to Supabase → **Authentication** → **URL Configuration**, and paste your new `.vercel.app` link into **Site URL**. This makes the email sign-in links work correctly.

## Part 4 — Make scores update automatically

Right now, nothing fetches NFL scores until something calls a specific web address on your site. We'll use a free scheduler to call it every 15 minutes.

1. Go to https://cron-job.org → **Sign up** (free).
2. Click **Create cronjob**.
3. **Title:** `Grade Patriots Games`
4. **URL:** `https://YOUR-SITE.vercel.app/api/grade-games?secret=YOUR_CRON_SECRET`
   (use your real `.vercel.app` address, and the same password you set as `CRON_SECRET` in Vercel)
5. **Schedule:** every 15 minutes.
6. Save it. That's it — this will silently check ESPN every 15 minutes, and the second a Patriots game is marked Final, everyone's picks get graded and the leaderboard updates.

## Testing it

- Visit your site, sign in with your email (you'll get a magic sign-in link — check spam if it's not in your inbox).
- Pick a display name.
- If no games show up yet, visit `https://YOUR-SITE.vercel.app/api/grade-games?secret=YOUR_CRON_SECRET` once yourself in a browser tab — that manually triggers the same sync and will populate the schedule.
- Share your `.vercel.app` link with anyone — they don't need any of these accounts, just an email to sign in with.

## If something goes wrong

- **Games not showing:** visit the `/api/grade-games?secret=...` link manually and see what it returns.
- **Sign-in email not arriving:** check spam, and double check the Supabase "Site URL" step above.
- **Site won't deploy:** in Vercel, click your project → **Deployments** → click the failed one → read the error log, or paste it back to me here and I'll help.
