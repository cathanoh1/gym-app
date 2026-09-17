# Gym

A personal gym app: what you lifted, the daily habits you're keeping, and what you ate.

Built for one person on a phone. No accounts, no sign-in, no server — everything is stored in the
browser on the device you use it on.

## What it does

**Lift** — Keep a library of exercises and add your own at any time. Log a session set by set with
reps and load; each set is drawn as a chip whose coloured edge shows how it compared to the
heaviest set of that session, so back-off sets are obvious at a glance. New sets are pre-filled
from the last time you trained that exercise. Every exercise keeps its own history and best set.

**Habits** — Recurring things you want to tick off daily (creatine, water, fish oil). They appear
as bubbles on Today and on the Habits tab; tap one to mark it done. Bubbles reset each day, and
each habit tracks its streak and last seven days.

**Food** — A MyFitnessPal-style diary. Build up a library of foods with their calories and macros
per serving, then log them to breakfast, lunch, dinner or snacks. The day totals up against your
calorie, protein, carb and fat goals.

**Today** — One screen with the day's habit bubbles, calories left, macro progress and the
session you've logged so far.

## Running it

```bash
npm install
npm run dev
```

Then open the URL it prints. `npm run build` produces a static site in `dist/` that can be hosted
anywhere — Netlify, Vercel, GitHub Pages, or a folder on your own machine. The app uses hash
routing, so it works on static hosts with no redirect rules.

On a phone, open the hosted URL and add it to your home screen.

## Your data

Everything lives in IndexedDB in the browser you use. That means it never leaves your device —
and it also means it is tied to that browser. Clearing site data or switching phones loses it.

Settings (the gear on Today) has **Export backup** and **Restore backup** for moving between
devices or keeping a copy. Goals and your kg/lb preference are set there too.

## Built with

React, TypeScript, Vite, Tailwind CSS and Dexie (IndexedDB).
