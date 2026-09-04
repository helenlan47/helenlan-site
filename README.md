# helenlan.com

Personal site: a journal + an interactive world map of favorite spots
(restaurants, shows, galleries, gardens). Built with Astro, Tailwind CSS,
and Mapbox GL JS.

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

## Structure

```
src/
  content/journal/    markdown journal posts
  data/spots.ts        map pin data
  layouts/Layout.astro shared page shell (nav, fonts, footer)
  pages/
    index.astro         home
    journal/index.astro journal list
    journal/[id].astro  single post
    map.astro           interactive map
```

## Deploying

Push to GitHub, connect the repo to Vercel or Netlify, add
`PUBLIC_MAPBOX_TOKEN` as an environment variable there too, then point
the `helenlan.com` domain at it.
