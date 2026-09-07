import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Hotspot {
  id: string;
  title: string;
  top: string;
  left: string;
  category: string;
  details: string;
}

// Positions are percentages matching label locations in
// /public/floorplan-illustrated.jpg (2174x1984, illustrated apartment with
// labels removed -- anchors sit exactly where the text used to be).
// Re-measure if you swap the image.
const HOTSPOTS: Hotspot[] = [
  {
    id: 'espresso',
    title: 'Espresso Machine',
    top: '4.3%',
    left: '42.5%',
    category: 'Kitchen',
    details: 'Current Favorite Beans: Ethiopian Yirgacheffe (Light Roast) for bright fruit notes.',
  },
  {
    id: 'bookshelf',
    title: 'Bookshelf',
    top: '29.2%',
    left: '4.4%',
    category: 'Living Room',
    details: 'Top reads on rotation -- placeholder, swap in your real favorites.',
  },
  {
    id: 'favorite-artists',
    title: 'Favorite Artists Collection',
    top: '34.8%',
    left: '15.0%',
    category: 'Living Room',
    details: 'A coffee table book of favorite artists -- placeholder, add yours.',
  },
  {
    id: 'snack-pantry',
    title: 'Snack Pantry',
    top: '40.3%',
    left: '41.4%',
    category: 'Kitchen',
    details: 'Go-to snacks -- placeholder, swap for your real favorites.',
  },
  {
    id: 'wine-fridge',
    title: 'Wine Fridge',
    top: '25.8%',
    left: '51.4%',
    category: 'Kitchen',
    details: 'A few bottles always on hand -- placeholder wine picks.',
  },
  {
    id: 'travel-magnets',
    title: 'Travel Magnets',
    top: '38.7%',
    left: '58.9%',
    category: 'Kitchen',
    details: 'Recent travels: Tokyo, Kyoto, Copenhagen, Mexico City.',
  },
  {
    id: 'skincare-routine',
    title: 'Skincare Routine',
    top: '44.2%',
    left: '48.1%',
    category: 'Bathroom',
    details: 'Daily Routine: Gentle Cleanser, Vitamin C Serum, Hyaluronic Acid, SPF 50.',
  },
  {
    id: 'book-collection',
    title: 'Book Collection',
    top: '60.3%',
    left: '12.9%',
    category: 'Living Room',
    details: 'A small personal library at the desk -- placeholder, add your books.',
  },
  {
    id: 'style-closet',
    title: 'Style Closet',
    top: '57.8%',
    left: '83.8%',
    category: 'Bedroom',
    details: 'Signature pieces and go-to silhouettes -- placeholder style notes.',
  },
  {
    id: 'sports-closet',
    title: 'Sports Closet',
    top: '82.7%',
    left: '19.3%',
    category: 'Entry',
    details: 'Gear for staying active -- placeholder.',
  },
  {
    id: 'shoe-closet',
    title: 'Shoe Closet',
    top: '80.2%',
    left: '37.3%',
    category: 'Entry',
    details: 'Favorite pairs, by rotation -- placeholder.',
  },
];

export default function FloorPlanLanding() {
  const [activeSpot, setActiveSpot] = useState<Hotspot | null>(null);

  return (
    <div className="relative w-full h-screen bg-neutral-900 text-white overflow-hidden flex flex-col items-center justify-center">
      {/* Header / Navigation */}
      <header className="absolute top-6 left-8 z-20">
        <h1 className="text-2xl font-serif tracking-wide text-amber-100">My NYC Apartment</h1>
        <p className="text-xs text-neutral-400 mt-1">Click any hotspot to explore my space & interests</p>
      </header>

      {/* Main Floor Plan Container */}
      <div className="relative w-full max-w-3xl aspect-[2174/1984] rounded-xl shadow-2xl overflow-hidden border border-neutral-800 bg-white">
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
            onClick={() => setActiveSpot(spot)}
            style={{ top: spot.top, left: spot.left }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
          >
            {/* Animated Pulse Pin */}
            <span className="relative flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-amber-500 border-2 border-white items-center justify-center text-[10px] font-bold text-neutral-900">
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
    </div>
  );
}
