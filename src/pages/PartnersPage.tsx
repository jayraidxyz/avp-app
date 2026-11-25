import React, { useState } from 'react';
import { Activity, Box, CheckCircle2, Cpu, Layers, Shield } from 'lucide-react';
import { PARTNER_PROTOCOLS, UX_AUDIT_CHECKLIST } from '../data/toxicologyData';
import { ClayCard } from '../components/ui/ClayCard';
import { CrownIcon } from '../components/ui/CrownIcon';
import { ResearchStudio } from '../components/ResearchStudio';

const PartnerGlyph: React.FC<{ glyph: (typeof PARTNER_PROTOCOLS)[number]['glyph'] }> = ({ glyph }) => {
  const cls = 'w-5 h-5 text-[#FF554A]';
  switch (glyph) {
    case 'crown':
      return <CrownIcon className="w-5 h-5" glow />;
    case 'solana':
      return <Layers className={cls} />;
    case 'vortex':
      return <Cpu className={cls} />;
    case 'cube':
      return <Box className={cls} />;
    case 'shield':
      return <Shield className={cls} />;
    default:
      return <Activity className={cls} />;
  }
};

export const PartnersPage: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');

  const domains = ['ALL', ...Array.from(new Set(PARTNER_PROTOCOLS.map((p) => p.domain)))];
  const visiblePartners =
    selectedDomain === 'ALL'
      ? PARTNER_PROTOCOLS
      : PARTNER_PROTOCOLS.filter((p) => p.domain === selectedDomain);

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-wider text-[#FF554A]">
          <CrownIcon className="w-4 h-4" />
          <span>Ecosystem &amp; Studio</span>
        </div>
        <h1 className="font-heading font-bold text-[28px] sm:text-[34px] text-white leading-tight">
          Partners &amp; Research Lab
        </h1>
        <p className="text-sm sm:text-base text-[#A3A3A3]">
          Audited Web3 protocols, live Gemini signal assistant, and visual brief generator.
        </p>
      </div>

      {/* Domain Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter partner domains">
        {domains.map((domain) => {
          const active = selectedDomain === domain;
          return (
            <button
              key={domain}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedDomain(domain)}
              className={`min-h-[44px] px-4 rounded-full text-xs font-heading font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                active
                  ? 'bg-[#E10000] text-white'
                  : 'bg-[#0E0E0E] border border-[#2A2A2A] text-[#A3A3A3] hover:text-white'
              }`}
            >
              {domain === 'ALL' ? 'All Protocols' : domain}
            </button>
          );
        })}
      </div>

      {/* Partner Protocol Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visiblePartners.map((partner) => (
          <ClayCard key={partner.id} interactive className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="w-11 h-11 rounded-[14px] bg-[#161616] border border-[#2A2A2A] flex items-center justify-center">
                <PartnerGlyph glyph={partner.glyph} />
              </div>
              <span className="text-xs font-heading font-bold text-[#FF554A]">
                {partner.status}
              </span>
            </div>

            <div>
              <h2 className="font-heading font-bold text-lg text-white">{partner.name}</h2>
              <div className="flex items-center gap-2 text-xs text-[#A3A3A3] mt-0.5">
                <span className="font-mono-handle text-[#F2F2F2]">{partner.handle}</span>
                <span aria-hidden="true">·</span>
                <span>{partner.domain}</span>
              </div>
            </div>

            <p className="text-sm text-[#A3A3A3] leading-relaxed">{partner.summary}</p>
            <p className="text-xs text-[#F2F2F2] pt-2 border-t border-[#2A2A2A]">{partner.focus}</p>
          </ClayCard>
        ))}
      </div>

      {/* Gemini Multi-Turn Research Studio & 1K/2K/4K Cover Generator */}
      <section aria-labelledby="studio-heading" className="space-y-4">
        <h2
          id="studio-heading"
          className="font-heading font-bold text-sm uppercase tracking-wider text-[#A3A3A3]"
        >
          AI Research Studio
        </h2>
        <ResearchStudio />
      </section>

      {/* Strict UX Pass/Fail Checklist */}
      <section aria-labelledby="checklist-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="checklist-heading"
            className="font-heading font-bold text-sm uppercase tracking-wider text-[#A3A3A3]"
          >
            UX &amp; Accessibility Verification Checklist
          </h2>
          <span className="text-xs font-heading font-bold text-[#FF554A] tabular-nums">
            7 / 7 PASS
          </span>
        </div>

        <ClayCard className="divide-y divide-[#2A2A2A]">
          {UX_AUDIT_CHECKLIST.map((item) => (
            <div key={item.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-heading font-bold text-sm sm:text-base text-white">
                  {item.rule}
                </h3>
                <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">{item.spec}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-heading font-bold text-[#FF554A] shrink-0 pt-0.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{item.status}</span>
              </div>
            </div>
          ))}
        </ClayCard>
      </section>
    </div>
  );
};
