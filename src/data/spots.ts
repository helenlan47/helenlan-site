export type SpotCategory = 'restaurant' | 'show' | 'gallery' | 'garden';

export interface Spot {
  name: string;
  category: SpotCategory;
  city: string;
  country: string;
  lat: number;
  lng: number;
  note: string;
  link?: string;
}

// Example pins — replace these with your own. lat/lng: look up any address
// on https://www.latlong.net or right-click a point on Google Maps.
export const spots: Spot[] = [
  {
    name: 'Example: Theodora',
    category: 'restaurant',
    city: 'Brooklyn',
    country: 'USA',
    lat: 40.6893,
    lng: -73.9748,
    note: 'A placeholder pin — swap this for a real favorite spot.',
  },
  {
    name: 'Example: Ryoan-ji',
    category: 'garden',
    city: 'Kyoto',
    country: 'Japan',
    lat: 35.0345,
    lng: 135.7183,
    note: 'Another placeholder — delete once you add your own spots.',
  },
];
