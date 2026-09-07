// Rich "expansion" content for hotspots that get the full modal treatment
// (intro + flip-card sections), rather than the simple bottom-drawer list.
// Add an entry here and it's automatically picked up by hotspot id.

export interface Subject {
  /** Path (e.g. /photos/foo.jpg) or URL. Omit to show a placeholder tile. */
  photo?: string;
  /** One line describing the photo. */
  caption: string;
  /** Optional -- makes the caption a link (opens in a new tab). */
  link?: string;
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
          {
            caption: "CoRo: Morgan's Blend [Berkeley, CA]",
            link: 'https://www.corocoffeeroom.com/corocoffeebrand/coro-morgans-blend',
            photo: '/coffee-beans-morgans-blend.jpeg',
          },
          {
            caption: 'Black and White Coffee Roasters: Hambela Natural (EA Decaf) [Raleigh, NC]',
            link: 'https://www.blackwhiteroasters.com/collections/all-coffee',
            photo: '/coffee-beans-black-and-white-decaf.jpeg',
          },
          {
            caption: 'Moonwake: Granja Paraiso 92 Thermal Shock Caturra [San Jose, CA]',
            link: 'https://moonwakecoffeeroasters.com/products/granja-paraiso-92-thermal-shock-caturra-colombia',
            photo: '/coffee-beans-moonwake-granja-pariso-92.jpeg',
          },
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
