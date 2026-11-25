import React, { useEffect } from 'react';
import { Bookmark, X } from 'lucide-react';
import { ArchiveDoc } from '../data/toxicologyData';
import { CrownIcon } from './ui/CrownIcon';
import { ActionButton } from './ui/ActionButton';

interface DocumentReaderModalProps {
  doc: ArchiveDoc | null;
  isBookmarked: boolean;
  onToggleBookmark: (doc: ArchiveDoc) => void;
  onClose: () => void;
  onOpenSolana3D?: () => void;
}

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({
  doc,
  isBookmarked,
  onToggleBookmark,
  onClose,
  onOpenSolana3D,
}) => {
  useEffect(() => {
    if (!doc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto clay-card rounded-b-none sm:rounded-[20px] p-5 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#A3A3A3]">
              <CrownIcon className="w-4 h-4" />
              <span className="text-[#FF554A] font-heading font-bold">{doc.category}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{doc.readTime}</span>
              <span aria-hidden="true">·</span>
              <span>{doc.date}</span>
              <span aria-hidden="true">·</span>
              <span className="font-heading font-bold text-white">{doc.verdict}</span>
            </div>
            <h2 id="reader-title" className="font-heading font-bold text-2xl sm:text-[28px] leading-tight text-white">
              {doc.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleBookmark(doc)}
              aria-label={isBookmarked ? `Remove ${doc.title} from saved vault` : `Save ${doc.title} to vault`}
              className={`min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                isBookmarked
                  ? 'bg-[#E10000] border-[#E10000] text-white'
                  : 'bg-[#161616] border-[#2A2A2A] text-[#A3A3A3] hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close document reader"
              className="min-h-[44px] min-w-[44px] rounded-full bg-[#161616] border border-[#2A2A2A] text-[#A3A3A3] hover:text-white flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <p className="text-base text-[#F2F2F2] leading-relaxed border-b border-[#2A2A2A] pb-5">
          {doc.summary}
        </p>

        <div className="space-y-6">
          {doc.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                <CrownIcon className="w-4 h-4 shrink-0" />
                <span>{section.heading}</span>
              </h3>
              <ul className="space-y-2.5 pl-1">
                {section.points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm sm:text-base text-[#A3A3A3] leading-relaxed">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#E10000] shrink-0" aria-hidden="true" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="pt-4 border-t border-[#2A2A2A] flex flex-wrap items-center justify-between gap-3">
          {doc.id === 'solana-1-0-architecture' && onOpenSolana3D ? (
            <ActionButton
              variant="primary"
              onClick={() => {
                onClose();
                onOpenSolana3D();
              }}
            >
              Open 55s 3D Breakdown
            </ActionButton>
          ) : (
            <ActionButton variant="secondary" onClick={onClose}>
              Done Reading
            </ActionButton>
          )}
          <span className="text-xs text-[#A3A3A3]">Toxicology Archive Research Brief</span>
        </div>
      </div>
    </div>
  );
};
