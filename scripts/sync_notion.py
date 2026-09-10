#!/usr/bin/env python3
"""Sync src/data/hotspotExpansions.ts from the Notion page (Helen's House).

Convention:
  H1 "<Title>" (optionally prefixed "Hotspot ")
                               -> a hotspot. Matched to a known hotspot id
                                  (HOTSPOTS[].id in FloorPlanLanding.tsx)
                                  if the title, lowercased, either exactly
                                  equals or is a leading-word match of a
                                  known hotspot title (e.g. "Wine" matches
                                  "Wine Fridge"). The "Hotspot " prefix is
                                  just an explicit way to mark it ready.
  paragraph(s) right after    -> intro text (until the first section)
  Section can be written two ways, both supported:
    (a) explicit: H2 "<Section>", followed by its list items as siblings
        (Notion's block tree is flat -- items under a heading are
        siblings, not children of the heading)
    (b) implicit: a top-level list item with nested children IS the
        section (its own text is the section label, its children are
        the section's items) -- used when there's no H2 layer
  Within a section, a list item is either:
    - a "tier" grouping (e.g. "Went back for") whose own nested list
      items are the actual subjects -- only this tier is synced today;
      other tiers (Liked, Not again) are parsed but not yet surfaced
      in the UI, or
    - directly a subject (plain caption), when tiers aren't used
  subject's nested items      -> "link: <url>" and/or "photo: <filename>"
                                  lines, parsed as the Subject's fields.
                                  photo values are used as /<filename> --
                                  drop the actual file in public/.

H1 headings that don't match any known hotspot are parsed but not
written -- treated as drafts not yet wired to a real hotspot.

Usage: python3 scripts/sync_notion.py [--write]
  Without --write, prints a summary of what it found and would change.
"""
import json
import os
import re
import sys
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_PATH = os.path.join(REPO_ROOT, "src/data/hotspotExpansions.ts")

TIER_NAME = "went back for"

# id mapping: matches the `id` field of HOTSPOTS in FloorPlanLanding.tsx
TITLE_TO_ID = {
    "espresso machine": "espresso",
    "bookshelf": "bookshelf",
    "favorite artists collection": "favorite-artists",
    "snack pantry": "snack-pantry",
    "wine fridge": "wine-fridge",
    "travel magnets": "travel-magnets",
    "skincare routine": "skincare-routine",
    "book collection": "book-collection",
    "style closet": "style-closet",
    "sports closet": "sports-closet",
    "shoe closet": "shoe-closet",
}


def resolve_hotspot(raw_title):
    """Match an H1 title to a known hotspot id. Strips a leading
    'Hotspot ' if present, then matches exactly or as a leading-word
    prefix (e.g. 'Wine' -> 'wine fridge')."""
    t = raw_title.strip()
    if t.lower().startswith("hotspot "):
        t = t[len("hotspot "):].strip()
    key = t.lower()
    if key in TITLE_TO_ID:
        return t, TITLE_TO_ID[key]
    for title, hid in TITLE_TO_ID.items():
        if title == key or title.startswith(key + " "):
            return t, hid
    return t, None


def load_env():
    env = {}
    path = os.path.join(REPO_ROOT, ".env")
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k] = v
    return env


ENV = load_env()
TOKEN = ENV.get("NOTION_TOKEN")
PAGE_ID = ENV.get("NOTION_PAGE_ID")


def notion_get(url):
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Notion-Version": "2022-06-28",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def get_children(block_id):
    results = []
    url = f"https://api.notion.com/v1/blocks/{block_id}/children?page_size=100"
    while url:
        data = notion_get(url)
        results.extend(data["results"])
        if data.get("has_more"):
            url = f"https://api.notion.com/v1/blocks/{block_id}/children?page_size=100&start_cursor={data['next_cursor']}"
        else:
            url = None
    return results


def plain_text(block):
    t = block["type"]
    rich = block.get(t, {}).get("rich_text", [])
    return "".join(r["plain_text"] for r in rich).strip()


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def is_list_item(block):
    return block["type"] in ("numbered_list_item", "bulleted_list_item")


def parse_subject(item_block):
    """A subject leaf: its own text is the caption; its children (if any)
    are 'link: ...' / 'photo: ...' lines."""
    caption = plain_text(item_block).rstrip(":").strip()
    subject = {"caption": caption}
    if item_block.get("has_children"):
        for child in get_children(item_block["id"]):
            if not is_list_item(child):
                continue
            text = plain_text(child)
            if text.lower().startswith("link:"):
                subject["link"] = text.split(":", 1)[1].strip()
            elif text.lower().startswith("photo:"):
                fname = text.split(":", 1)[1].strip()
                subject["photo"] = f"/{fname}"
    return subject


def parse_list_item_as_section_content(item, subjects):
    """A list item within a section (either a sibling of an explicit H2,
    or a child of an implicit-section grouping item). Either a tier
    grouper (with the actual subjects nested inside it) or, if tiers
    aren't used, a subject directly."""
    text = plain_text(item)
    if not text:
        return
    if text.lower() == TIER_NAME and item.get("has_children"):
        for sub in get_children(item["id"]):
            if is_list_item(sub) and plain_text(sub):
                subjects.append(parse_subject(sub))
    elif text.lower() in ("liked", "not again"):
        return  # parsed tiers, not yet synced
    else:
        subjects.append(parse_subject(item))


def parse_implicit_section(item):
    """A top-level list item with children, when no H2 governs it: its
    own text is the section label, its children are the section's list
    items (same tier-or-direct handling as an explicit section)."""
    label = plain_text(item)
    subjects = []
    for child in get_children(item["id"]):
        if is_list_item(child):
            parse_list_item_as_section_content(child, subjects)
    return label, subjects[:3]


def main():
    if not TOKEN or not PAGE_ID:
        print("Missing NOTION_TOKEN or NOTION_PAGE_ID in .env", file=sys.stderr)
        sys.exit(1)

    blocks = get_children(PAGE_ID)

    hotspots = []  # (title, has_prefix, intro, sections)
    i = 0
    while i < len(blocks):
        b = blocks[i]
        if b["type"] == "heading_1":
            raw_title = plain_text(b)
            clean_title, hotspot_id = resolve_hotspot(raw_title)
            i += 1
            intro_parts = []
            sections = []
            expecting_h2_items = False  # True right after an explicit H2
            while i < len(blocks) and blocks[i]["type"] != "heading_1":
                cur = blocks[i]
                if cur["type"] == "heading_2":
                    sections.append([plain_text(cur), []])
                    expecting_h2_items = True
                elif is_list_item(cur) and expecting_h2_items:
                    # explicit section: this item is a sibling of the H2
                    parse_list_item_as_section_content(cur, sections[-1][1])
                elif is_list_item(cur) and cur.get("has_children"):
                    # implicit section: this item IS the section (each
                    # such top-level item starts its own new section)
                    sections.append(list(parse_implicit_section(cur)))
                elif cur["type"] == "paragraph" and not sections:
                    text = plain_text(cur)
                    if text:
                        intro_parts.append(text)
                i += 1
            sections = [(label, subs[:3]) for label, subs in sections]
            hotspots.append((clean_title, hotspot_id, " ".join(intro_parts), sections))
        else:
            i += 1

    print(f"Found {len(hotspots)} H1 heading(s) on the page:\n")
    ready = []
    for title, hotspot_id, intro, sections in hotspots:
        tag = f"SYNC -> {hotspot_id}" if hotspot_id else "skip (no matching hotspot)"
        print(f"  [{tag}] {title}")
        if intro:
            print(f"      intro: {intro[:70]}")
        for label, subjects in sections:
            print(f"      - {label}: {len(subjects)} item(s)")
            for s in subjects:
                extra = []
                if "link" in s:
                    extra.append("link")
                if "photo" in s:
                    extra.append("photo")
                extra_s = f" ({', '.join(extra)})" if extra else ""
                print(f"          * {s['caption']}{extra_s}")
        has_content = any(subjects for _, subjects in sections)
        if hotspot_id and has_content:
            ready.append((hotspot_id, intro, sections))
        elif hotspot_id and not has_content:
            print("      (no populated sections yet -- not synced, left as-is on the site)")
        print()

    if "--write" not in sys.argv:
        print("(dry run -- pass --write to update hotspotExpansions.ts)")
        return

    write_ts(ready)
    print(f"Wrote {OUT_PATH}")


def ts_string(s):
    return json.dumps(s)


def write_ts(hotspot_list):
    entries = []
    for hotspot_id, intro, sections in hotspot_list:
        if not intro:
            intro = f"Placeholder intro -- replace with 1-2 real sentences about {hotspot_id.replace('-', ' ')}."
        section_entries = []
        for label, subjects in sections:
            if not subjects:
                continue
            subj_entries = []
            for s in subjects:
                fields = [f"caption: {ts_string(s['caption'])}"]
                if "link" in s:
                    fields.append(f"link: {ts_string(s['link'])}")
                if "photo" in s:
                    fields.append(f"photo: {ts_string(s['photo'])}")
                subj_entries.append("        { " + ", ".join(fields) + " },")
            section_entries.append(
                f"""      {{
        id: {ts_string(slugify(label))},
        label: {ts_string(label)},
        subjects: [
{chr(10).join(subj_entries)}
        ],
      }},"""
            )
        entries.append(
            f"""  {{
    hotspotId: {ts_string(hotspot_id)},
    intro: {ts_string(intro)},
    sections: [
{chr(10).join(section_entries)}
    ],
  }},"""
        )

    content = f"""// Rich "expansion" content for hotspots that get the full modal treatment
// (intro + flip-card sections), rather than the simple bottom-drawer list.
//
// GENERATED by scripts/sync_notion.py -- do not hand-edit past the header;
// re-run `python3 scripts/sync_notion.py --write` to refresh from Notion.

export interface Subject {{
  /** Path (e.g. /photos/foo.jpg) or URL. Omit to show a placeholder tile. */
  photo?: string;
  /** One line describing the photo. */
  caption: string;
  /** Optional -- makes the caption a link (opens in a new tab). */
  link?: string;
}}

export interface ExpansionSection {{
  id: string;
  label: string;
  /** Max 3 -- the flipped card shows these as a small grid. */
  subjects: Subject[];
}}

export interface HotspotExpansion {{
  hotspotId: string;
  /** A couple of sentences, shown above the sections. */
  intro: string;
  sections: ExpansionSection[];
}}

export const hotspotExpansions: HotspotExpansion[] = [
{chr(10).join(entries)}
];

export function getExpansion(hotspotId: string): HotspotExpansion | undefined {{
  return hotspotExpansions.find((e) => e.hotspotId === hotspotId);
}}
"""
    with open(OUT_PATH, "w") as f:
        f.write(content)


if __name__ == "__main__":
    main()
