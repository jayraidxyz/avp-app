import React, { useState } from 'react';
import { Bookmark, Check, ChevronDown, ChevronRight, Copy, ExternalLink, Terminal } from 'lucide-react';
import { TerminalFinding } from '../../types/lab';

interface DiagnosticsTerminalProps {
  findings: TerminalFinding[];
  isScanning: boolean;
  tokenSymbol: string;
  tokenName: string;
  chainId: string;
  address: string;
  dataCoverageCount: number;
  flagsObservedCount: number;
  isSavedInWatchlist: boolean;
  onSaveWatchlist: () => void;
}

const SEVERITY_STYLE: Record<TerminalFinding['severity'], string> = {
  INFO: 'text-white bg-[#161616] border-[#2A2A2A]',
  FLAG: 'text-[#FF554A] bg-[#E10000]/15 border-[#E10000]/50',
  WARN: 'text-[#F2F2F2] bg-[#262626] border-[#404040]',
  ERR: 'text-[#FF554A] bg-[#1A0505] border-[#E10000]',
};

export const DiagnosticsTerminal: React.FC<DiagnosticsTerminalProps> = ({
  findings,
  isScanning,
  tokenSymbol,
  tokenName,
  chainId,
  address,
  dataCoverageCount,
  flagsObservedCount,
  isSavedInWatchlist,
  onSaveWatchlist,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const toggleRow = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyReport = async () => {
    const lines = [
      `Toxicology Archive — Diagnostic Lab Report`,
      `Token: ${tokenName} (${tokenSymbol}) · Chain: ${chainId}`,
      `Address: ${address}`,
      `Data Coverage: ${dataCoverageCount}/5 sources responded · Flags Observed: ${flagsObservedCount}`,
      '',
      ...findings.map(
        (f) => `[${f.timestamp}] [${f.severity}] ${f.label}: ${f.summary} (Source: ${f.sourceName})`,
      ),
      '',
      'Informational only. Not financial advice. Verify independently.',
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in restricted iframe fallback
    }
  };

  const shareText = encodeURIComponent(
    `Diagnostic Lab telemetry for $${tokenSymbol || tokenName} on ${chainId}: ${flagsObservedCount} flag(s) observed across ${dataCoverageCount}/5 data sources. Informational only.`,
  );
  const shareUrl = `https://x.com/intent/tweet?text=${shareText}`;

  return (
    <section
      aria-labelledby="diagnostics-terminal-heading"
      className="clay-card p-4 sm:p-5 flex flex-col h-full min-h-[430px] max-h-[560px]"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-4 h-4 text-[#FF554A] shrink-0" />
          <h2
            id="diagnostics-terminal-heading"
            className="font-heading font-bold text-sm uppercase tracking-wider text-white truncate"
          >
            Diagnostics Terminal
          </h2>
        </div>

        <span className="font-mono-handle text-[11px] text-[#A3A3A3] tabular-nums">
          {findings.length} {findings.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Scrollable Log Body */}
      <div
        className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 font-mono-handle text-xs"
        aria-live="polite"
      >
        {findings.length === 0 && !isScanning && (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center px-4 text-[#A3A3A3] space-y-2">
            <span className="text-white font-heading font-bold text-sm">
              Awaiting Target Input
            </span>
            <p className="text-xs leading-relaxed max-w-xs">
              Enter a contract address, ticker, @handle, or DexScreener/Pump.fun link to stream live 5-stage telemetry.
            </p>
          </div>
        )}

        {findings.map((item) => {
          const isOpen = expandedIds.has(item.id);
          return (
            <div
              key={item.id}
              className="rounded-[12px] bg-[#050505] border border-[#2A2A2A] overflow-hidden"
            >
              <div className="flex items-start gap-1">
                <button
                  type="button"
                  onClick={() => toggleRow(item.id)}
                  aria-expanded={isOpen}
                  className="flex-1 min-w-0 min-h-[44px] px-3 py-2 text-left flex items-start gap-2 hover:bg-[#161616]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF554A]"
                >
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#A3A3A3] mt-0.5 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#A3A3A3] mt-0.5 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[#737373] tabular-nums">[{item.timestamp}]</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${SEVERITY_STYLE[item.severity]}`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-white font-semibold">{item.label}</span>
                    </div>
                    <p className="text-[#D4D4D4] break-words leading-relaxed">{item.summary}</p>
                  </div>
                </button>

                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${item.sourceName} source for ${item.label}`}
                  title={`${item.sourceName}: Open source`}
                  className="min-h-[44px] px-2.5 mr-1 inline-flex items-center gap-1 text-[11px] text-[#FF554A] hover:text-[#FF2A1F] underline underline-offset-2 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] rounded"
                >
                  <span>Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {isOpen && (
                <div className="px-3 pb-3 pt-1 border-t border-[#2A2A2A]/70 bg-[#0B0B0B] space-y-2">
                  <pre className="text-[11px] text-[#A3A3A3] whitespace-pre-wrap break-all bg-[#050505] p-2 rounded-lg border border-[#2A2A2A]">
                    {item.rawValue}
                  </pre>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#737373]">{item.sourceName}</span>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[36px] inline-flex items-center gap-1 text-[11px] text-[#FF554A] hover:text-[#FF2A1F] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] rounded px-1"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isScanning && (
          <div className="space-y-2 animate-pulse" aria-label="Streaming stage telemetry">
            <div className="h-12 rounded-[12px] bg-[#161616] border border-[#2A2A2A]" />
            <div className="h-12 rounded-[12px] bg-[#161616] border border-[#2A2A2A]" />
          </div>
        )}
      </div>

      {/* Footer Actions (>= 44px touch targets) */}
      <div className="pt-3 border-t border-[#2A2A2A] flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopyReport}
          disabled={findings.length === 0}
          className="min-h-[44px] flex-1 px-3 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-heading font-bold text-white disabled:opacity-40 flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#FF554A]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy report'}</span>
        </button>

        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={findings.length === 0}
          className={`min-h-[44px] flex-1 px-3 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-heading font-bold text-white flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
            findings.length === 0 ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Share to X</span>
        </a>

        <button
          type="button"
          onClick={onSaveWatchlist}
          disabled={!address}
          className={`min-h-[44px] flex-1 px-3 rounded-full border text-xs font-heading font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] disabled:opacity-40 ${
            isSavedInWatchlist
              ? 'bg-[#E10000]/15 border-[#E10000] text-[#FF554A]'
              : 'bg-[#161616] border-[#2A2A2A] hover:border-white text-white'
          }`}
        >
          <Bookmark
            className="w-3.5 h-3.5"
            fill={isSavedInWatchlist ? 'currentColor' : 'none'}
          />
          <span>{isSavedInWatchlist ? 'Saved' : 'Save to Watchlist'}</span>
        </button>
      </div>
    </section>
  );
};
