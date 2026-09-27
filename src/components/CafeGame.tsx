import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startCafe, createLofi, VIEW_W, VIEW_H, type Thing } from './cafeEngine';
import { createIdentity, createLocalTransport, SAGEHEN_NUMBER, type Identity } from './cafeNetwork';
import { HOTSPOTS } from './FloorPlanLanding';
import HotspotExpansionModal from './HotspotExpansionModal';
import { getExpansion, type HotspotExpansion } from '../data/hotspotExpansions';

interface Card {
  kicker?: string;
  title: string;
  body: string;
  links?: { label: string; href: string }[];
}

// Café objects that reuse the apartment's hotspot content (and so stay in
// sync with Notion via hotspotExpansions.ts).
const HOTSPOT_FOR: Record<string, string> = {
  espresso: 'espresso',
  bakery: 'bakery',
  wine: 'wine-fridge',
  books: 'bookshelf',
  postcards: 'travel-magnets',
  restroom: 'skincare-routine',
  coat: 'style-closet',
  shoes: 'shoe-closet',
};

// Titles for café-only content that has no apartment hotspot.
const CAFE_TITLES: Record<string, string> = { bakery: 'Bakery' };

// What the jukebox plays: "Margaret" (feat. Bleachers) by Lana Del Rey, via
// Spotify's embed so it's properly licensed. Logged-in Spotify users hear
// the full song; everyone else gets a 30-second preview.
const JUKEBOX_EMBED = 'https://open.spotify.com/embed/track/1o82DwNisONAd2mu1RcGE6?utm_source=generator&theme=0';

const CAT_LINES = [
  'Mochi purrs without opening her eyes.',
  'Mochi stretches one paw toward you, then goes back to sleep.',
  'Mochi is off duty. Please see the barista.',
  'A slow blink. You have been approved.',
];

const WINDOW_LINES = {
  day: 'Sunny out. People are walking by with iced lattes.',
  sunset: 'Golden hour. The street is turning pink.',
  night: 'The streetlights are on. Good night to stay in.',
};

export default function CafeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const promptRef = useRef<HTMLButtonElement>(null);
  const labelLayerRef = useRef<HTMLDivElement>(null);
  const promptLabelRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<ReturnType<typeof startCafe> | null>(null);
  const lofiRef = useRef<ReturnType<typeof createLofi> | null>(null);
  const toastTimer = useRef(0);

  const [card, setCard] = useState<Card | null>(null);
  const [expansion, setExpansion] = useState<{ title: string; data: HotspotExpansion } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [music, setMusic] = useState(false);
  const [width, setWidth] = useState(VIEW_W * 2);
  const [me, setMe] = useState<Identity | null>(null);
  const [online, setOnline] = useState(1);
  const [chirp, setChirp] = useState(false);

  // The engine runs outside React, so it reads live state through refs.
  const pausedRef = useRef(false);
  pausedRef.current = card !== null || expansion !== null || chirp;
  const musicRef = useRef(false);
  musicRef.current = music;
  const [jukebox, setJukebox] = useState(false);
  const jukeboxRef = useRef(false);
  jukeboxRef.current = jukebox;
  const interactRef = useRef<(t: Thing) => void>(() => {});

  function showToast(text: string) {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }

  function toggleMusic() {
    lofiRef.current ??= createLofi();
    if (musicRef.current) {
      lofiRef.current.stop();
      showToast('Lo-fi off.');
    } else {
      lofiRef.current.start();
      showToast('♪ Soft lo-fi on.');
    }
    setMusic((m) => !m);
  }

  interactRef.current = (thing: Thing) => {
    const hotspotId = HOTSPOT_FOR[thing.id];
    if (hotspotId) {
      const spot = HOTSPOTS.find((s) => s.id === hotspotId);
      const data = getExpansion(hotspotId);
      const title = spot?.title ?? CAFE_TITLES[hotspotId] ?? thing.label;
      if (data) setExpansion({ title, data });
      else setCard({ kicker: spot?.category, title, body: spot?.details ?? '' });
      return;
    }
    switch (thing.id) {
      case 'journal':
        return setCard({
          kicker: 'Corner table',
          title: 'Journal',
          body: "Someone left their notebook open. It's mine — you're welcome to read it.",
          links: [{ label: 'Open the journal →', href: '/journal' }],
        });
      case 'sign':
        return setCard({
          kicker: 'Chalkboard',
          title: "Today's specials",
          body: 'Now open: the café! Walk around, order a coffee, and poke at things. (Placeholder — swap in what’s new with you.)',
        });
      case 'door':
        return setCard({
          kicker: 'Front door',
          title: 'Heading out?',
          body: 'A few other places you can find me.',
          links: [
            { label: 'Map of favorite spots →', href: '/map' },
            { label: 'Journal →', href: '/journal' },
            { label: 'The old apartment →', href: '/apartment' },
          ],
        });
      case 'window': {
        const h = new Date().getHours();
        return showToast(WINDOW_LINES[h >= 7 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'sunset' : 'night']);
      }
      case 'jukebox':
        if (musicRef.current) toggleMusic(); // don't play over the song
        return setJukebox(true);
      case 'cat':
        return showToast(CAT_LINES[Math.floor(Math.random() * CAT_LINES.length)]);
    }
  };

  useEffect(() => {
    const identity = createIdentity();
    const transport = createLocalTransport();
    setMe(identity);
    if (identity.num === SAGEHEN_NUMBER) setChirp(true);

    const engine = startCafe(canvasRef.current!, {
      me: identity,
      transport,
      labelLayer: labelLayerRef.current!,
      onCount: setOnline,
      onInteract: (t) => interactRef.current(t),
      isPaused: () => pausedRef.current,
      isMusicOn: () => musicRef.current || jukeboxRef.current,
      onNearest: (thing, x, y) => {
        const el = promptRef.current;
        if (!el) return;
        const show = thing !== null && !pausedRef.current;
        el.style.display = show ? 'flex' : 'none';
        if (!show) return;
        el.style.left = `${(x / VIEW_W) * 100}%`;
        el.style.top = `${(y / VIEW_H) * 100}%`;
        if (promptLabelRef.current!.textContent !== thing.label) promptLabelRef.current!.textContent = thing.label;
      },
    });
    engineRef.current = engine;

    function fit() {
      const s = Math.min((window.innerWidth - 32) / VIEW_W, (window.innerHeight - 150) / VIEW_H);
      setWidth(Math.round(VIEW_W * (s >= 3 ? Math.floor(s) : Math.max(s, 1))));
    }
    fit();
    window.addEventListener('resize', fit);

    return () => {
      engine.stop();
      transport.close();
      lofiRef.current?.stop();
      window.removeEventListener('resize', fit);
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setCard(null);
        setExpansion(null);
        setChirp(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-6 select-none"
      style={{ backgroundColor: '#2b1f1a', color: '#f3e7d6' }}
    >
      <header className="text-center mb-4">
        <h1 className="text-2xl font-serif tracking-wide">helen's café</h1>
        <nav className="mt-2 flex gap-4 justify-center text-sm" style={{ color: '#c9b49a' }}>
          <a href="/journal" className="hover:underline" style={{ color: 'inherit' }}>journal</a>
          <a href="/map" className="hover:underline" style={{ color: 'inherit' }}>map</a>
          <button
            onClick={() => {
              if (!musicRef.current) setJukebox(false);
              toggleMusic();
            }}
            className="hover:underline"
          >
            {music ? 'lo-fi: on' : 'lo-fi: off'}
          </button>
        </nav>
        {me && (
          <p className="mt-1 text-xs" style={{ color: '#a8927a' }}>
            you're <span style={{ color: '#f3e7d6' }}>cecil {me.num}</span> · {online} {online === 1 ? 'cecil' : 'cecils'} in the café
          </p>
        )}
      </header>

      <div className="relative" style={{ width, maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          className="block w-full rounded-lg shadow-2xl touch-none cursor-pointer"
          style={{ imageRendering: 'pixelated', aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
          aria-label="A pixel-art café you can walk around in"
        />
        <div ref={labelLayerRef} className="absolute inset-0 pointer-events-none" />
        <button
          ref={promptRef}
          onClick={() => engineRef.current?.interactNearest()}
          className="absolute items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs shadow-lg"
          style={{
            display: 'none',
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'var(--color-paper)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-line)',
          }}
        >
          <kbd className="rounded px-1 font-mono text-[10px]" style={{ backgroundColor: 'var(--color-line)' }}>E</kbd>
          <span ref={promptLabelRef} />
        </button>
      </div>

      <p className="mt-4 text-xs text-center" style={{ color: '#a8927a' }}>
        Tap where you want to go, or walk with WASD / arrow keys and press E.
      </p>

      {/* Jukebox mini-player: stays open (and keeps playing) while you walk around */}
      <AnimatePresence>
        {jukebox && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-4 right-4 z-30 w-[min(352px,calc(100%-2rem))] rounded-2xl p-2 shadow-2xl"
            style={{ backgroundColor: '#8b3a3a' }}
          >
            <div className="flex items-center justify-between px-1 pb-1.5 text-xs" style={{ color: '#ffe6a8' }}>
              <span>♪ jukebox · press play</span>
              <button onClick={() => setJukebox(false)} aria-label="Close jukebox" className="px-1">
                ✕
              </button>
            </div>
            <iframe
              title="Jukebox: Margaret by Lana Del Rey"
              src={JUKEBOX_EMBED}
              width="100%"
              height="152"
              className="block rounded-xl border-0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 max-w-sm w-[calc(100%-2rem)] text-center text-sm rounded-xl px-4 py-3 shadow-2xl z-30"
            style={{ backgroundColor: 'var(--color-paper)', color: 'var(--color-ink)' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {card && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCard(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-md w-[calc(100%-2rem)] rounded-2xl p-6 shadow-2xl"
              style={{ backgroundColor: 'var(--color-paper)', color: 'var(--color-ink)' }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  {card.kicker && (
                    <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: 'var(--color-accent)' }}>
                      {card.kicker}
                    </span>
                  )}
                  <h3 className="text-xl font-serif">{card.title}</h3>
                </div>
                <button onClick={() => setCard(null)} className="text-lg p-1" style={{ color: 'var(--color-ink-soft)' }} aria-label="Close">
                  ✕
                </button>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>{card.body}</p>
              {card.links && (
                <div className="mt-4 flex flex-col gap-1.5 text-sm">
                  {card.links.map((l) => (
                    <a key={l.href} href={l.href} className="hover:underline">{l.label}</a>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chirp && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChirp(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-xs w-[calc(100%-2rem)] rounded-2xl p-6 text-center shadow-2xl cursor-pointer"
              style={{ backgroundColor: '#fff', border: '4px solid #1f3bb3', color: '#1f3bb3' }}
              onClick={() => setChirp(false)}
            >
              <p className="text-3xl font-serif font-semibold">chirp chirp!</p>
              <p className="mt-2 text-sm" style={{ color: '#3a4a8a' }}>
                You're cecil 47, so today you're Cecil the Sagehen.
              </p>
              <p className="mt-3 text-xs" style={{ color: '#ff5a2a' }}>tap to start waddling</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {expansion && (
        <HotspotExpansionModal title={expansion.title} expansion={expansion.data} onClose={() => setExpansion(null)} />
      )}
    </div>
  );
}
