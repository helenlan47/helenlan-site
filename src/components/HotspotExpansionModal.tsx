import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HotspotExpansion, ExpansionSection, Subject } from '../data/hotspotExpansions';

interface Props {
  title: string;
  expansion: HotspotExpansion;
  onClose: () => void;
}

function SectionCard({
  section,
  onEnlarge,
}: {
  section: ExpansionSection;
  onEnlarge: (subject: Subject) => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="w-full sm:w-56 h-64 sm:h-80 cursor-pointer select-none"
      style={{ perspective: 1200 }}
      onClick={() => setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      aria-label={`${section.label} -- click to ${flipped ? 'go back' : 'expand'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-xl border flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            borderColor: 'var(--color-line)',
            backgroundColor: 'var(--color-paper)',
          }}
        >
          <span className="font-serif text-xl" style={{ color: 'var(--color-ink)' }}>
            {section.label}
          </span>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-xl border p-3 overflow-y-auto"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderColor: 'var(--color-line)',
            backgroundColor: 'var(--color-paper)',
          }}
        >
          <p
            className="text-xs font-medium mb-2 uppercase tracking-wide"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {section.label}
          </p>
          <div className="space-y-3">
            {section.subjects.slice(0, 3).map((subject, i) => (
              <div key={i} className="flex gap-2 items-center">
                <img
                  src={subject.photo || '/placeholder-photo.svg'}
                  alt={subject.caption}
                  className="w-12 h-12 rounded-md object-cover flex-shrink-0 cursor-zoom-in"
                  style={{ border: '1px solid var(--color-line)' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-photo.svg';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (subject.photo) onEnlarge(subject);
                  }}
                />
                {subject.link ? (
                  <a
                    href={subject.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs leading-snug hover:underline"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {subject.caption}
                  </a>
                ) : (
                  <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>
                    {subject.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function HotspotExpansionModal({ title, expansion, onClose }: Props) {
  const [enlarged, setEnlarged] = useState<Subject | null>(null);

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(33,29,24,0.4)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        key="content"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 sm:p-8"
          style={{ backgroundColor: 'var(--color-paper)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-sm"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            close ✕
          </button>

          <h2 className="font-serif text-2xl mb-3" style={{ color: 'var(--color-ink)' }}>
            {title}
          </h2>
          <p className="text-sm mb-6 max-w-lg" style={{ color: 'var(--color-ink-soft)' }}>
            {expansion.intro}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {expansion.sections.map((section) => (
              <SectionCard key={section.id} section={section} onEnlarge={setEnlarged} />
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Lightbox -- click anywhere to dismiss */}
      {enlarged && (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 cursor-zoom-out"
          style={{ background: 'rgba(20,17,14,0.85)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setEnlarged(null)}
        >
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            src={enlarged.photo}
            alt={enlarged.caption}
            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
