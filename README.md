# helenlan.com

Personal site: the homepage is an illustrated apartment floor plan with
clickable hotspots (React + Framer Motion) that open into a journal and
a map of favorite spots. Built with Astro, Tailwind CSS, and Mapbox
GL JS.

## Setup

```bash
npm install
cp .env.example .env
```

Get a free Mapbox token at https://account.mapbox.com/access-tokens/ and
put it in `.env` as `PUBLIC_MAPBOX_TOKEN`.

```bash
npm run dev
```

## Adding content

**Journal posts** — add a markdown file to `src/content/journal/`:

```markdown
---
title: "Post title"
date: 2026-09-10
description: "One-line summary shown on the journal index."
tags: ["travel", "food"]
---

Your writing here, in markdown.
```

The URL is the filename, e.g. `post-title.md` → `/journal/post-title`.

**Map pins** — edit the `spots` array in `src/data/spots.ts`. Each entry:

```ts
{
  name: 'Restaurant name',
  category: 'restaurant', // 'restaurant' | 'show' | 'gallery' | 'garden'
  city: 'City',
  country: 'Country',
  lat: 0.0,
  lng: 0.0,
  note: 'Why you loved it.',
  link: 'https://...', // optional
}
```

Find lat/lng by right-clicking a point on Google Maps and copying the
coordinates, or via https://www.latlong.net.

**Hotspot rich content** (the flip-card modal, e.g. Espresso Machine) —
edit `src/data/hotspotExpansions.ts` by hand, or sync it from Notion
(see below). Photos referenced there should be dropped in `public/`.

## Syncing from Notion

Some hotspots' content (`src/data/hotspotExpansions.ts`) is authored in
a Notion page ("Helen's House") instead of by hand, so updating the
note and re-running the sync updates the site.

**One-time setup** (already done): an internal Notion integration was
created and shared with the page; its token and the page ID live in
`.env` as `NOTION_TOKEN` / `NOTION_PAGE_ID` (gitignored, never
committed).

**Page convention:**
- `Heading 1` starting with "Hotspot " (e.g. "Hotspot Espresso Machine")
  → a hotspot, matched by title to the `HOTSPOTS` list in
  `FloorPlanLanding.tsx`. H1s without that prefix are parsed but not
  synced (treated as drafts).
- Paragraph(s) right after the H1, before the first H2 → the intro text.
- `Heading 2` (e.g. "Beans") → a section.
- A list item directly under a section is a subject; a list item named
  "Went back for" (with nested list items inside it) is a *tier* — only
  that tier is currently synced (Liked / Not again are parsed but not
  yet surfaced in the UI).
- A subject can have nested list items `link: <url>` and
  `photo: <filename>` — `photo` should match a real file already in
  `public/`.

**To sync:**

```bash
python3 scripts/sync_notion.py            # dry run -- prints what it found
python3 scripts/sync_notion.py --write    # regenerates hotspotExpansions.ts
```

It only overwrites hotspots that are both `Hotspot `-prefixed *and*
have at least one populated section, so an empty/in-progress heading on
the page never blanks out what's already live.

## Structure

```
src/
  components/
    FloorPlanLanding.tsx       homepage: floor plan + hotspots (React)
    HotspotExpansionModal.tsx  the flip-card modal template
  content/journal/             markdown journal posts
  data/
    spots.ts                   map pin data
    hotspotExpansions.ts       hotspot modal content (synced from Notion)
  layouts/Layout.astro         shared page shell (nav, fonts, footer) --
                                used by journal/map, not the homepage
  pages/
    index.astro                home (floor plan)
    journal/index.astro        journal list
    journal/[id].astro         single post
    map.astro                  interactive map
scripts/
  sync_notion.py                pulls hotspotExpansions.ts from Notion
```

## Deploying

Connected to Vercel via GitHub — every push to `main` auto-deploys to
production. `helenlan.com` and `www.helenlan.com` are live. Add
`PUBLIC_MAPBOX_TOKEN` as an environment variable in the Vercel dashboard
(Settings → Environment Variables) for the map to work in production.
