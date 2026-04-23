# Life Tracker — Gap Sprint

## Gaps implemented (all 6)
1. [x] Onboarding with sample data — wizard + /onboarding/seed + /onboarding/skip
2. [x] Email reminders — /preferences GET/PUT + settings toggles
3. [x] Correlation insights — /insights endpoint + dashboard cards
4. [x] Streak forgiveness — /habits/:id/freeze + freeze UI on habits page
5. [x] Better analytics — insights on dashboard (horizontally scrollable)
6. [x] Journal prompts library — 33 prompts, category filter, prompt of the day on dashboard

## Changes made
- src/api/database/schema.ts — userPreferences table, habit freeze columns, journal promptId, user onboarded
- src/api/migrations/0001_illegal_black_bolt.sql — generated migration
- src/api/index.ts — new endpoints: onboarding/seed, onboarding/skip, preferences, insights, habits/:id/freeze
- src/web/pages/dashboard.tsx — onboarding wizard, insights cards, prompt of the day
- src/web/pages/habits.tsx — streak freeze button + frozen indicator
- src/web/pages/journal.tsx — full prompts library panel with category filter, random prompt
- src/web/pages/settings.tsx — reminder toggles, weekly report toggle, streak freeze per week setting
- src/web/lib/prompts.ts — 33 curated prompts in 6 categories
