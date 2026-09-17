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

**Food** — A MyFitnessPal-style diary. Scan a packet's barcode, search by name for anything
without one, or enter it by hand, then log it to breakfast, lunch, dinner or snacks. The day
totals up against your calorie, protein, carb and fat goals. Your own foods are searched first and
instantly; going out to the database is a deliberate tap. Anything you pull in is saved to your
library with its barcode, so the next time it is there without a lookup.

**Weight** — One weigh-in a day, with the change over the last 7 and 30 days. The chart draws
the daily numbers as light dots under a 7-day average, because day-to-day scale noise is larger
than the change anyone is actually looking for. Weights are stored in kilograms and converted for
display, so switching between kg and lb never bends the trend.

**Today** — One screen with the day's habit bubbles, calories left, macro progress and the
session you've logged so far.

## Where the food data comes from

Barcode scans and name searches both go to [Open Food Facts](https://world.openfoodfacts.org) — a
free, open product database with no API key or account. It is filled in by the public, so a product
may be missing, or have gaps or wrong values. Anything it returns lands in an editable form before
it is saved, so you can correct it against the packet.

Where a product lists nutrition per serving, that serving is used; otherwise figures are per 100 g.
Products with no usable nutrition are left out of search results. Anything the database does not
have you add by hand, once, and it stays in your library.

Scanning needs a camera and an HTTPS page, which Vercel provides.

## Running it

```bash
npm install
npm run dev
```

Then open the URL it prints. `npm run build` produces a static site in `dist/`.

Vercel builds and publishes every push to `main`. It is a static bundle using hash routing, so it
needs no server, redirect rules or environment variables.

On a phone, open the deployed URL and add it to your home screen — it installs as a standalone app.

## Your data

Everything lives in IndexedDB in the browser you use. That means it never leaves your device —
and it also means it is tied to that browser. Clearing site data or switching phones loses it.

Settings (the gear on Today) has **Export backup** and **Restore backup** for moving between
devices or keeping a copy. Goals and your kg/lb preference are set there too.

## Built with

React, TypeScript, Vite, Tailwind CSS and Dexie (IndexedDB).
