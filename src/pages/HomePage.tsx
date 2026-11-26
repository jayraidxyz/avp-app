import React from 'react';
import { ArrowRight, Bookmark, Compass, Play, ShieldCheck } from 'lucide-react';
import { ASSETS } from '../tokens';
import {
  ARCHIVE_DOCUMENTS,
  ArchiveDoc,
  PARTNER_PROTOCOLS,
  THREE_STEP_PILLARS,
} from '../data/toxicologyData';
import { ClayCard } from '../components/ui/ClayCard';
import { CrownIcon } from '../components/ui/CrownIcon';
import { ActionButton } from '../components/ui/ActionButton';
import { MascotMoment } from '../components/ui/MascotMoment';

export type AppRoute = 'home' | 'archive' | 'three-step' | 'lab' | 'partners';

interface HomePageProps {
  bookmarkedIds: Set<string>;
  onToggleBookmark: (doc: ArchiveDoc) => void;
  onOpenDoc: (doc: ArchiveDoc) => void;
  onNavigate: (route: AppRoute) => void;
  onOpenGuide?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  bookmarkedIds,
  onToggleBookmark,
  onOpenDoc,
  onNavigate,
  onOpenGuide,
}) => {
  const latestDocs = ARCHIVE_DOCUMENTS.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Hero Banner: Black with faint red grid, crown watermark on right, mascot cleanly separated (zero text overlap) */}
      <section aria-labelledby="hero-heading">
        <ClayCard className="relative overflow-hidden red-grid-bg p-6 sm:p-8 lg:p-10">
          {/* Subtle Red Crown Watermark on Right */}
          <CrownIcon
            className="pointer-events-none absolute -right-4 -top-4 w-44 h-44 sm:w-56 sm:h-56 stroke-[#E10000]/15 stroke-[1.4]"
            aria-hidden="true"
          />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-4">
              <div className="flex items-center gap-2 text-xs text-[#FF554A] font-heading font-bold uppercase tracking-wider">
                <CrownIcon className="w-4 h-4" glow />
                <span>Web3 Research Archive</span>
              </div>

              <h1
                id="hero-heading"
                className="font-heading font-bold text-[28px] sm:text-[40px] leading-[1.1] tracking-tight text-white [text-wrap:balance]"
              >
                Toxicology Archive
              </h1>

              <p className="text-base text-[#A3A3A3] max-w-xl leading-relaxed">
                Clean Web3 checklists, archived breakdowns, and signal over noise. Filter incentives, load, and real usage before deploying capital.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <ActionButton variant="primary" onClick={() => onNavigate('lab')}>
                  <Play className="w-4 h-4 fill-current" />
                  Watch Breakdown
                </ActionButton>
                <ActionButton variant="secondary" onClick={() => onNavigate('archive')}>
                  Explore Vault
                </ActionButton>
                {onOpenGuide && (
                  <ActionButton variant="ghost" onClick={onOpenGuide}>
                    <Compass className="w-4 h-4 text-[#FF554A]" />
                    <span>How to Navigate</span>
                  </ActionButton>
                )}
              </div>
            </div>

            {/* Mascot Visual Frame — zero text overlapping the artwork */}
            <div className="md:col-span-4 flex justify-center md:justify-end">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1.5 bg-[#050505] ring-2 ring-[#E10000] shadow-[0_0_24px_rgba(225,0,0,0.45)]">
                <img
                  src={ASSETS.mascotAvatar}
                  alt="Toxicology Archive Mascot wearing black cap with neon red crown"
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>
          </div>
        </ClayCard>
      </section>

      {/* 3-Step Framework Cards (01 / 02 / 03) */}
      <section aria-labelledby="framework-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="framework-heading"
            className="font-heading font-bold text-sm sm:text-base uppercase tracking-wider text-[#A3A3A3]"
          >
            3-Step Framework
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('three-step')}
            className="min-h-[44px] px-2 text-xs sm:text-sm font-heading font-bold text-[#FF554A] hover:text-[#FF2A1F] flex items-center gap-1 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] rounded-lg"
          >
            Open Filter
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {THREE_STEP_PILLARS.map((step) => {
            const targetRoute: AppRoute =
              step.num === '01' ? 'three-step' : step.num === '02' ? 'archive' : 'lab';

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => onNavigate(targetRoute)}
                className="text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] rounded-[20px]"
              >
                <ClayCard interactive className="p-5 h-full flex flex-col justify-between gap-3">
                  <div>
                    <span className="font-heading font-bold text-xl text-[#FF554A] tabular-nums block">
                      {step.num}
                    </span>
                    <h3 className="font-heading font-bold text-base sm:text-lg text-white mt-2">
                      {step.shortTitle}
                    </h3>
                    <p className="text-sm text-[#A3A3A3] mt-1 leading-relaxed">{step.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-heading font-bold text-white/80 pt-1">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FF554A]" />
                  </div>
                </ClayCard>
              </button>
            );
          })}
        </div>
      </section>

      {/* Latest Breakdowns & Solana 1.0 Split on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section aria-labelledby="latest-heading" className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2
              id="latest-heading"
              className="font-heading font-bold text-sm sm:text-base uppercase tracking-wider text-[#A3A3A3]"
            >
              Latest Breakdowns
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('archive')}
              className="min-h-[44px] px-2 text-xs sm:text-sm font-heading font-bold text-[#FF554A] hover:text-[#FF2A1F] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] rounded-lg"
            >
              Show All
            </button>
          </div>

          <div className="space-y-3">
            {latestDocs.map((doc) => {
              const saved = bookmarkedIds.has(doc.id);
              return (
                <ClayCard
                  key={doc.id}
                  interactive
                  className="p-4 sm:p-5 flex items-center justify-between gap-3"
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
                      {doc.hot && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-heading font-bold text-white">Featured</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-heading font-bold text-base sm:text-lg text-white mt-1.5 leading-snug">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-[#A3A3A3] mt-1 line-clamp-2">{doc.summary}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleBookmark(doc)}
                    aria-label={saved ? `Remove bookmark for ${doc.title}` : `Bookmark ${doc.title}`}
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
        </section>

        {/* Diagnostic Lab Interactive Spotlight & Partners */}
        <section aria-labelledby="lab-preview-heading" className="lg:col-span-5 space-y-4">
          <h2
            id="lab-preview-heading"
            className="font-heading font-bold text-sm sm:text-base uppercase tracking-wider text-[#A3A3A3]"
          >
            Diagnostic Lab
          </h2>

          <ClayCard className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CrownIcon className="w-5 h-5" glow />
                <span className="font-heading font-bold text-base text-white">
                  5-Stage 3D Token Scanner
                </span>
              </div>
              <span className="text-xs font-heading font-bold text-[#FF554A] tabular-nums">
                Live Data
              </span>
            </div>

            {/* 5-Stage Mini Progress Rail */}
            <div className="space-y-2">
              <div className="h-1.5 w-full rounded-full bg-[#161616] overflow-hidden">
                <div className="h-full w-3/5 bg-[#E10000] rounded-full" />
              </div>
              <div className="flex justify-between text-xs text-[#A3A3A3]">
                <span className="text-white font-medium">01 Identity</span>
                <span>02–03 Safety &amp; LP</span>
                <span>04–05 Flow</span>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-[#A3A3A3]">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FF554A] shrink-0" />
                <span>Mint/freeze authority &amp; EVM contract checks</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FF554A] shrink-0" />
                <span>LP lock ratio, top-10 concentration &amp; flow</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FF554A] shrink-0" />
                <span>Live news headlines &amp; official link resolver</span>
              </li>
            </ul>

            <ActionButton
              variant="secondary"
              className="w-full"
              onClick={() => onNavigate('lab')}
            >
              Open Diagnostic Lab
            </ActionButton>
          </ClayCard>

          {/* Partners & Protocols Compact Strip */}
          <ClayCard className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-[#A3A3A3]">
                Partners &amp; Protocols
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('partners')}
                className="min-h-[44px] px-2 text-xs font-heading font-bold text-[#FF554A] hover:text-[#FF2A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] rounded-lg"
              >
                See All
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PARTNER_PROTOCOLS.slice(0, 6).map((partner) => (
                <button
                  key={partner.id}
                  type="button"
                  onClick={() => onNavigate('partners')}
                  className="min-h-[56px] p-2.5 rounded-[14px] bg-[#161616] border border-[#2A2A2A] hover:border-[#E10000]/60 transition-colors flex flex-col items-start justify-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                >
                  <span className="font-heading font-bold text-xs text-white truncate w-full">
                    {partner.name}
                  </span>
                  <span className="font-mono-handle text-[11px] text-[#A3A3A3] truncate w-full mt-0.5">
                    {partner.handle}
                  </span>
                </button>
              ))}
            </div>
          </ClayCard>
        </section>
      </div>

      {/* Mascot Footer Signal */}
      <MascotMoment
        mode="footer"
        title="ALL CLEAR. NO NOISE."
        subtitle="avptoxicology.vercel.app · Every brief filtered through Incentives, Load, and Real Usage."
      />
    </div>
  );
};
