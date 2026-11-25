import React, { useMemo, useState } from 'react';
import { Bookmark, Search } from 'lucide-react';
import { ARCHIVE_DOCUMENTS, ArchiveCategory, ArchiveDoc } from '../data/toxicologyData';
import { ClayCard } from '../components/ui/ClayCard';
import { CrownIcon } from '../components/ui/CrownIcon';
import { MascotMoment } from '../components/ui/MascotMoment';
import { ActionButton } from '../components/ui/ActionButton';

interface ArchivePageProps {
  bookmarkedIds: Set<string>;
  syncLoading: boolean;
  onToggleBookmark: (doc: ArchiveDoc) => void;
  onOpenDoc: (doc: ArchiveDoc) => void;
  onOpenSolana: () => void;
}

type FilterOption = 'ALL' | 'SAVED' | ArchiveCategory;

const FILTER_OPTIONS: { id: FilterOption; label: string }[] = [
  { id: 'ALL', label: 'All Briefs' },
  { id: 'L1 ARCHITECTURE', label: 'L1 Architecture' },
  { id: 'CHECKLIST', label: 'Checklists' },
  { id: 'TOKENOMICS', label: 'Tokenomics' },
  { id: 'BRIEF', label: 'Briefs' },
  { id: 'SAVED', label: 'Saved Vault' },
];

export const ArchivePage: React.FC<ArchivePageProps> = ({
  bookmarkedIds,
  syncLoading,
  onToggleBookmark,
  onOpenDoc,
  onOpenSolana,
}) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ARCHIVE_DOCUMENTS.filter((doc) => {
      if (activeFilter === 'SAVED' && !bookmarkedIds.has(doc.id)) return false;
      if (activeFilter !== 'ALL' && activeFilter !== 'SAVED' && doc.category !== activeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q)
      );
    });
  }, [search, activeFilter, bookmarkedIds]);

  return (
    <div className="space-y-6">
      {/* Header & Single Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-wider text-[#FF554A]">
            <CrownIcon className="w-4 h-4" />
            <span>Document Vault</span>
          </div>
          <h1 className="font-heading font-bold text-[28px] sm:text-[34px] text-white leading-tight">
            Research Archive
          </h1>
          <p className="text-sm sm:text-base text-[#A3A3A3]">
            Clean checklists, L1 architecture breakdowns, and tokenomics stress briefs.
          </p>
        </div>

        <ActionButton variant="primary" onClick={onOpenSolana}>
          Watch Breakdown
        </ActionButton>
      </div>

      {/* Search & Interactive Filter Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="w-4 h-4 text-[#A3A3A3] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter archive by protocol, checklist, or keyword..."
            aria-label="Search research archive"
            className="w-full min-h-[48px] rounded-full bg-[#0E0E0E] border-[1.5px] border-[#2A2A2A] pl-11 pr-4 text-sm text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#FF554A] focus:border-[#E10000]"
          />
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filter archive by category"
        >
          {FILTER_OPTIONS.map((opt) => {
            const active = activeFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveFilter(opt.id)}
                className={`min-h-[44px] px-4 rounded-full text-xs font-heading font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                  active
                    ? 'bg-[#E10000] text-white'
                    : 'bg-[#0E0E0E] border border-[#2A2A2A] text-[#A3A3A3] hover:text-white'
                }`}
              >
                {opt.label}
                {opt.id === 'SAVED' && (
                  <span className="ml-1.5 tabular-nums">({bookmarkedIds.size})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skeleton Loader when syncing Firestore */}
      {syncLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading saved vault">
          {[1, 2, 3, 4].map((n) => (
            <ClayCard key={n} className="p-5 space-y-3 animate-pulse">
              <div className="h-3 w-28 bg-[#161616] rounded" />
              <div className="h-5 w-3/4 bg-[#161616] rounded" />
              <div className="h-4 w-full bg-[#161616] rounded" />
            </ClayCard>
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <MascotMoment
          mode="empty"
          title="ALL CLEAR. NO NOISE."
          subtitle={
            activeFilter === 'SAVED'
              ? 'No saved briefs in your vault yet. Bookmark any breakdown to persist it across devices.'
              : 'No archive entries matched that query. Clear filters to return to the full vault.'
          }
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch('');
            setActiveFilter('ALL');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => {
            const saved = bookmarkedIds.has(doc.id);
            return (
              <ClayCard
                key={doc.id}
                interactive
                className="p-5 flex items-start justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => onOpenDoc(doc)}
                  className="flex-1 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] rounded-lg"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#A3A3A3]">
                    <CrownIcon className="w-4 h-4 shrink-0" />
                    <span className="font-heading font-bold text-[#FF554A]">{doc.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{doc.readTime}</span>
                    <span aria-hidden="true">·</span>
                    <span>{doc.date}</span>
                  </div>
                  <h2 className="font-heading font-bold text-lg text-white mt-2 leading-snug">
                    {doc.title}
                  </h2>
                  <p className="text-sm text-[#A3A3A3] mt-1.5 leading-relaxed">{doc.summary}</p>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleBookmark(doc)}
                  aria-label={saved ? `Remove ${doc.title} from vault` : `Save ${doc.title} to vault`}
                  className={`min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                    saved
                      ? 'bg-[#E10000] border-[#E10000] text-white'
                      : 'bg-[#161616] border-[#2A2A2A] text-[#A3A3A3] hover:text-white hover:border-[#E10000]/50'
                  }`}
                >
                  <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
                </button>
              </ClayCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
