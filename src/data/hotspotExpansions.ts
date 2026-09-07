// Rich "expansion" content for hotspots that get the full modal treatment
// (intro + flip-card sections), rather than the simple bottom-drawer list.
// Add an entry here and it's automatically picked up by hotspot id.

export interface Subject {
  /** Path (e.g. /photos/foo.jpg) or URL. Omit to show a placeholder tile. */
  photo?: string;
  /** One line describing the photo. */
  caption: string;
}

export interface ExpansionSection {
  id: string;
  label: string;
  /** Max 3 -- the flipped card shows these as a small grid. */
  subjects: Subject[];
}

export interface HotspotExpansion {
  hotspotId: string;
  /** A couple of sentences, shown above the sections. */
  intro: string;
  sections: ExpansionSection[];
}

export const hotspotExpansions: HotspotExpansion[] = [
  {
    hotspotId: 'espresso',
    intro:
      'Placeholder intro -- replace with 1-2 real sentences about your ' +
      'taste in coffee (roast preference, ritual, how you take it).',
    sections: [
      {
        id: 'beans',
        label: 'Beans',
        subjects: [
          { caption: 'Placeholder: Ethiopian Yirgacheffe, light roast' },
          { caption: 'Placeholder: a second bean you love' },
          { caption: 'Placeholder: a third bean you love' },
        ],
      },
      {
        id: 'cafes',
        label: 'Cafes',
        subjects: [
          { caption: 'Placeholder: a favorite cafe, neighborhood' },
          { caption: 'Placeholder: a second favorite cafe' },
          { caption: 'Placeholder: a third favorite cafe' },
        ],
      },
      {
        id: 'matcha',
        label: 'Matcha',
        subjects: [
          { caption: 'Placeholder: a matcha brand or grade you like' },
          { caption: 'Placeholder: a matcha ritual or tool' },
          { caption: 'Placeholder: a matcha spot you love' },
        ],
      },
    ],
  },
];

export function getExpansion(hotspotId: string): HotspotExpansion | undefined {
  return hotspotExpansions.find((e) => e.hotspotId === hotspotId);
}
