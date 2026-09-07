// Data for the floor-plan landing page and each room's interactive hotspots.
// All hotspot content below is placeholder — swap in your real picks.

export interface HotspotItem {
  title: string;
  subtitle?: string;
  note: string;
}

export interface Hotspot {
  id: string;
  label: string;
  /** position within the room's 0 0 900 600 viewBox */
  x: number;
  y: number;
  items: HotspotItem[];
}

export interface Room {
  id: string;
  name: string;
  /** axis-aligned rect in the shared floor-plan viewBox (0 0 900 600) */
  plan: { x: number; y: number; width: number; height: number };
  hotspots: Hotspot[];
}

export const rooms: Room[] = [
  {
    id: 'entry',
    name: 'Entry',
    plan: { x: 40, y: 40, width: 820, height: 100 },
    hotspots: [
      {
        id: 'shoe-cabinet',
        label: 'Shoe cabinet',
        x: 150,
        y: 300,
        items: [
          { title: 'Example: white leather sneakers', subtitle: 'everyday', note: 'Placeholder — swap in a real favorite pair.' },
          { title: 'Example: black ankle boots', subtitle: 'fall/winter', note: 'Another placeholder pair.' },
        ],
      },
    ],
  },
  {
    id: 'living-dining',
    name: 'Living Room / Dining Area',
    plan: { x: 40, y: 140, width: 390, height: 240 },
    hotspots: [
      {
        id: 'coffee-table-book',
        label: 'Coffee table book',
        x: 260,
        y: 340,
        items: [
          { title: 'Example: an artist you love', subtitle: 'painter', note: 'Placeholder — replace with real favorite artists.' },
          { title: 'Example: another artist', subtitle: 'photographer', note: 'Placeholder entry.' },
        ],
      },
    ],
  },
  {
    id: 'working-area',
    name: 'Working Area',
    plan: { x: 40, y: 380, width: 390, height: 180 },
    hotspots: [
      {
        id: 'bookshelf',
        label: 'Bookshelf',
        x: 200,
        y: 150,
        items: [
          { title: 'Example: a favorite book', subtitle: 'author', note: 'Placeholder — swap for real books on your shelf.' },
          { title: 'Example: another book', subtitle: 'author', note: 'Placeholder entry.' },
        ],
      },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    plan: { x: 520, y: 140, width: 300, height: 240 },
    hotspots: [
      {
        id: 'espresso-machine',
        label: 'Espresso machine',
        x: 150,
        y: 130,
        items: [
          { title: 'Example: single-origin Ethiopia', subtitle: 'coffee beans', note: 'Placeholder — swap for your real beans.' },
        ],
      },
      {
        id: 'wine-fridge',
        label: 'Wine fridge',
        x: 450,
        y: 130,
        items: [
          { title: 'Example: a favorite Burgundy', subtitle: 'red', note: 'Placeholder wine pick.' },
          { title: 'Example: a favorite Sancerre', subtitle: 'white', note: 'Placeholder wine pick.' },
        ],
      },
      {
        id: 'fridge-magnets',
        label: 'Fridge magnets',
        x: 150,
        y: 400,
        items: [
          { title: 'Example: Kyoto, Japan', note: 'Placeholder — swap for real places you\'ve traveled.' },
          { title: 'Example: Lisbon, Portugal', note: 'Placeholder entry.' },
        ],
      },
      {
        id: 'snack-cabinet',
        label: 'Snack cabinet',
        x: 450,
        y: 400,
        items: [
          { title: 'Example: a favorite snack', note: 'Placeholder — swap for real favorites.' },
        ],
      },
    ],
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    plan: { x: 520, y: 380, width: 300, height: 100 },
    hotspots: [
      {
        id: 'closet',
        label: 'Walk-in closet',
        x: 450,
        y: 300,
        items: [
          { title: 'Example: a signature silhouette', note: 'Placeholder — describe your real style.' },
        ],
      },
    ],
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    plan: { x: 520, y: 480, width: 300, height: 80 },
    hotspots: [
      {
        id: 'vanity-mirror',
        label: 'Vanity mirror',
        x: 450,
        y: 300,
        items: [
          { title: 'Example: cleanser', subtitle: 'AM/PM', note: 'Placeholder — swap for your real skincare routine.' },
          { title: 'Example: SPF', subtitle: 'AM', note: 'Placeholder entry.' },
        ],
      },
    ],
  },
  {
    id: 'hallway',
    name: 'Hallway',
    plan: { x: 430, y: 140, width: 90, height: 420 },
    hotspots: [],
  },
];

export function getRoom(id: string): Room | undefined {
  return rooms.find((r) => r.id === id);
}
