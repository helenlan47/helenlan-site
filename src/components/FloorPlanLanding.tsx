import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getExpansion } from '../data/hotspotExpansions';
import HotspotExpansionModal from './HotspotExpansionModal';

interface Hotspot {
  id: string;
  title: string;
  top: string;
  left: string;
  category: string;
  details: string;
}

// Positions are percentages anchored to the actual furniture icons in
// /public/floorplan-illustrated.jpg (2174x1984, unlabeled illustration).
// Re-measure if you swap the image -- icon positions shift between
// image generations even at the same aspect ratio.
const HOTSPOTS: Hotspot[] = [
  {
    id: 'espresso',
    title: 'Espresso Machine',
    top: '16.7%',
    left: '42.5%',
    category: 'Kitchen',
    details: 'Current Favorite Beans: Ethiopian Yirgacheffe (Light Roast) for bright fruit notes.',
  },
  {
    id: 'bookshelf',
    title: 'Bookshelf',
    top: '27.4%',
    left: '6.0%',
    category: 'Living Room',
    details: 'Top reads on rotation -- placeholder, swap in your real favorites.',
  },
  {
    id: 'favorite-artists',
    title: 'Favorite Artists Collection',
    top: '23.6%',
    left: '15.0%',
    category: 'Living Room',
    details: 'A coffee table book of favorite artists -- placeholder, add yours.',
  },
  {
    id: 'snack-pantry',
    title: 'Snack Pantry',
    top: '32.9%',
    left: '39.5%',
    category: 'Kitchen',
    details: 'Go-to snacks -- placeholder, swap for your real favorites.',
  },
  {
    id: 'wine-fridge',
    title: 'Wine Fridge',
    top: '39.2%',
    left: '58.0%',
    category: 'Kitchen',
    details: 'A few bottles always on hand -- placeholder wine picks.',
  },
  {
    id: 'travel-magnets',
    title: 'Travel Magnets',
    top: '32.6%',
    left: '58.0%',
    category: 'Kitchen',
    details: 'Recent travels: Tokyo, Kyoto, Copenhagen, Mexico City.',
  },
  {
    id: 'skincare-routine',
    title: 'Skincare Routine',
    top: '54.5%',
    left: '47.3%',
    category: 'Bathroom',
    details: 'Daily Routine: Gentle Cleanser, Vitamin C Serum, Hyaluronic Acid, SPF 50.',
  },
  {
    id: 'book-collection',
    title: 'Book Collection',
    top: '55.3%',
    left: '6.0%',
    category: 'Living Room',
    details: 'A small personal library at the desk -- placeholder, add your books.',
  },
  {
    id: 'style-closet',
    title: 'Style Closet',
    top: '56.4%',
    left: '85.0%',
    category: 'Bedroom',
    details: 'Signature pieces and go-to silhouettes -- placeholder style notes.',
  },
  {
    id: 'sports-closet',
    title: 'Sports Closet',
    top: '78.9%',
    left: '9.0%',
    category: 'Entry',
    details: 'Gear for staying active -- placeholder.',
  },
  {
    id: 'shoe-closet',
    title: 'Shoe Closet',
    top: '71.2%',
    left: '27.0%',
    category: 'Entry',
    details: 'Favorite pairs, by rotation -- placeholder.',
  },
];

export default function FloorPlanLanding() {
  const [activeSpot, setActiveSpot] = useState<Hotspot | null>(null);
  const [expansionSpot, setExpansionSpot] = useState<Hotspot | null>(null);

  function handleHotspotClick(spot: Hotspot) {
    if (getExpansion(spot.id)) {
      setExpansionSpot(spot);
    } else {
      setActiveSpot(spot);
    }
  }

  return (
    <div className="relative w-full min-h-screen bg-white text-neutral-900 overflow-hidden flex flex-col items-center justify-center">
      {/* Header / Navigation -- in normal flow so it always sits right
          above the floor plan, wherever that lands vertically */}
      <header className="text-center mb-4">
        <h1 className="text-2xl font-serif tracking-wide text-neutral-800">a glimpse into Helen</h1>
      </header>

      {/* Main Floor Plan Container */}
      <div className="relative w-full max-w-3xl aspect-[2174/1984]">
        {/* Render Floor Plan Image */}
        <img
          src="/floorplan-illustrated.jpg"
          alt="Illustrated apartment floor plan"
          className="w-full h-full object-contain"
        />

        {/* Hotspots Overlay Layer */}
        {HOTSPOTS.map((spot) => (
          <button
            key={spot.id}
            onClick={() => handleHotspotClick(spot)}
            style={{ top: spot.top, left: spot.left }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
          >
            {/* Animated Pulse Pin */}
            <span className="relative flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-amber-500 items-center justify-center text-[10px] font-bold text-neutral-900">
                +
              </span>
            </span>

            {/* Hover Tooltip Label */}
            <span className="absolute left-1/2 -translate-x-1/2 bottom-8 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/90 text-amber-200 text-xs py-1 px-2.5 rounded whitespace-nowrap pointer-events-none border border-neutral-700">
              {spot.title}
            </span>
          </button>
        ))}
      </div>

      {/* Detail Modal / Drawer */}
      <AnimatePresence>
        {activeSpot && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 max-w-md w-full bg-neutral-800/95 backdrop-blur-md border border-neutral-700 p-6 rounded-2xl shadow-2xl z-30"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] font-mono tracking-wider uppercase text-amber-400">
                  {activeSpot.category}
                </span>
                <h3 className="text-xl font-serif text-amber-50">{activeSpot.title}</h3>
              </div>
              <button
                onClick={() => setActiveSpot(null)}
                className="text-neutral-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed mt-2">{activeSpot.details}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rich expansion modal (template -- add more hotspots to
          hotspotExpansions.ts to opt them into this instead of the
          simple drawer above) */}
      {expansionSpot && (
        <HotspotExpansionModal
          title={expansionSpot.title}
          expansion={getExpansion(expansionSpot.id)!}
          onClose={() => setExpansionSpot(null)}
        />
      )}
    </div>
  );
}
