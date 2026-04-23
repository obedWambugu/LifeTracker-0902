# Life Tracker — Design Direction

## Inspiration
Dark fitness/productivity app (Tonal-style): deep blacks, bright green accents, bold data display.

## Colors
- Background: `#080808` (near-black)
- Surface: `#111111` (cards)
- Surface2: `#1A1A1A` (elevated cards)
- Border: `#222222`
- Accent: `#00FF88` (bright green — primary CTA, highlights, active states)
- Accent2: `#00CC6A` (darker green for hover)
- Text primary: `#FFFFFF`
- Text secondary: `#888888`
- Text muted: `#555555`
- Danger: `#FF4757`
- Warning: `#FFA502`
- Info: `#5352ED`

## Typography
- Display/Headings: `Syne` (bold, geometric)
- Body: `DM Sans` (clean, readable)
- Mono: `JetBrains Mono` (numbers, stats)

## Spacing & Layout
- Full-height sidebar nav (64px wide collapsed, 240px expanded)
- Main content area with max-w-7xl
- Cards: `rounded-xl` with subtle border `#222`
- Generous padding — 24px standard

## Motion
- Page transitions: fade + slide-up
- Card entry: staggered fade-in
- Numbers: count-up animation
- Habit checkboxes: satisfying scale + color pop

## Chart Colors (in order)
1. `#00FF88` (green)
2. `#5352ED` (purple)
3. `#FFA502` (orange)
4. `#FF4757` (red)
5. `#00D2D3` (teal)

## Anti-patterns to avoid
- No white backgrounds
- No rounded pill buttons (use slight radius only)
- No generic card grids
- No light mode default
