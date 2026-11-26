import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Compass,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  WifiOff,
} from 'lucide-react';
import {
  LabCandidatePair,
  Stage1IdentityData,
  Stage2SafetyData,
  Stage3LiquidityData,
  Stage4MarketData,
  Stage5NarrativeData,
  StageResponse,
  TerminalFinding,
  WatchlistItem,
} from '../types/lab';
import {
  buildDeterministicRecap,
  formatElapsedSince,
  formatPairAge,
  formatUsd,
  parseLabInput,
} from '../utils/labParser';
import { ClayCard } from '../components/ui/ClayCard';
import { CrownIcon } from '../components/ui/CrownIcon';
import { ActionButton } from '../components/ui/ActionButton';
import { MascotMoment } from '../components/ui/MascotMoment';
import { LabScannerStage } from '../components/lab/LabScannerStage';
import { DiagnosticsTerminal } from '../components/lab/DiagnosticsTerminal';
import { NewsAndXPanel } from '../components/lab/NewsAndXPanel';

const WATCHLIST_KEY = 'toxicology_lab_watchlist_v1';

const EXAMPLE_CHIPS = [
  { label: 'BONK', query: 'BONK' },
  { label: 'PEPE', query: 'PEPE' },
  {
    label: 'Try a pasted contract',
    query: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  },
  { label: '@bonk_inu', query: '@bonk_inu' },
];

const STAGE_TITLES: Record<number, string> = {
  1: '01 · Scanning Identity & Duplicates',
  2: '02 · Inspecting Contract Safety',
  3: '03 · Measuring Liquidity & Holders',
  4: '04 · Analyzing Market Activity',
  5: '05 · Checking Narrative & Social Links',
};

interface DiagnosticLabPageProps {
  onOpenGuide?: () => void;
}

export const DiagnosticLabPage: React.FC<DiagnosticLabPageProps> = ({ onOpenGuide }) => {
  const [inputText, setInputText] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<LabCandidatePair[]>([]);
  const [selectedPair, setSelectedPair] = useState<LabCandidatePair | null>(null);

  const [stage1, setStage1] = useState<StageResponse<Stage1IdentityData> | null>(null);
  const [stage2, setStage2] = useState<StageResponse<Stage2SafetyData> | null>(null);
  const [stage3, setStage3] = useState<StageResponse<Stage3LiquidityData> | null>(null);
  const [stage4, setStage4] = useState<StageResponse<Stage4MarketData> | null>(null);
  const [stage5, setStage5] = useState<StageResponse<Stage5NarrativeData> | null>(null);

  const [loadingStage, setLoadingStage] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [elapsedLabel, setElapsedLabel] = useState('—');
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  const [aiRecap, setAiRecap] = useState<string | null>(null);
  const [aiRecapLoading, setAiRecapLoading] = useState(false);
  const [aiRecapError, setAiRecapError] = useState<string | null>(null);

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      return raw ? (JSON.parse(raw) as WatchlistItem[]) : [];
    } catch {
      return [];
    }
  });

  const scanTokenRef = useRef(0);
  const xHandleHintRef = useRef('');
  const parsedInput = useMemo(() => parseLabInput(inputText), [inputText]);

  // Network online/offline listeners
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Freshness timer ticker ("Updated Xs ago")
  useEffect(() => {
    setElapsedLabel(formatElapsedSince(lastUpdatedAt));
    if (!lastUpdatedAt) return;
    const id = window.setInterval(() => {
      setElapsedLabel(formatElapsedSince(lastUpdatedAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [lastUpdatedAt]);

  const fetchSingleStage = useCallback(
    async (
      stageNum: number,
      pair: LabCandidatePair,
      xHandleHint = '',
    ): Promise<StageResponse<unknown>> => {
      const qs = new URLSearchParams({
        chain: pair.chainId,
        address: pair.baseToken.address,
        pairAddress: pair.pairAddress,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        ...(xHandleHint ? { xHandle: xHandleHint } : {}),
      });
      const resp = await fetch(`/api/lab/stage/${stageNum}?${qs.toString()}`);
      const json = (await resp.json()) as StageResponse<unknown>;
      return json;
    },
    [],
  );

  const runStagesForPair = useCallback(
    async (pair: LabCandidatePair, silentRefresh = false) => {
      const runId = ++scanTokenRef.current;
      setSelectedPair(pair);
      if (!silentRefresh) {
        setStage1(null);
        setStage2(null);
        setStage3(null);
        setStage4(null);
        setStage5(null);
        setAiRecap(null);
        setAiRecapError(null);
      }
      setIsScanning(true);

      const setters = [
        (r: StageResponse<unknown>) => setStage1(r as StageResponse<Stage1IdentityData>),
        (r: StageResponse<unknown>) => setStage2(r as StageResponse<Stage2SafetyData>),
        (r: StageResponse<unknown>) => setStage3(r as StageResponse<Stage3LiquidityData>),
        (r: StageResponse<unknown>) => setStage4(r as StageResponse<Stage4MarketData>),
        (r: StageResponse<unknown>) => setStage5(r as StageResponse<Stage5NarrativeData>),
      ];

      for (let s = 1; s <= 5; s++) {
        if (scanTokenRef.current !== runId) return;
        setLoadingStage(s);
        try {
          const result = await fetchSingleStage(s, pair, xHandleHintRef.current);
          if (scanTokenRef.current !== runId) return;
          setters[s - 1](result);
        } catch {
          if (scanTokenRef.current !== runId) return;
          setters[s - 1]({
            stage: s,
            title: STAGE_TITLES[s],
            ok: false,
            data: null,
            findings: [
              {
                id: `s${s}_net_err_${Date.now()}`,
                stage: s,
                timestamp: new Date().toTimeString().slice(0, 8),
                severity: 'ERR',
                label: `Stage ${s} network error`,
                summary: `Stage ${s} unavailable, source timed out`,
                rawValue: 'Network request failed',
                sourceName: 'Lab Proxy',
                sourceUrl: pair.url,
              },
            ],
            sources: [{ source: `Stage ${s}`, ok: false, latencyMs: 0, cached: false }],
            error: `Stage ${s} unavailable, source timed out`,
            fetchedAt: Date.now(),
          });
        }
      }

      if (scanTokenRef.current === runId) {
        setLoadingStage(null);
        setIsScanning(false);
        setLastUpdatedAt(Date.now());
      }
    },
    [fetchSingleStage],
  );

  // 30-second auto-poll while a pair is active & online
  useEffect(() => {
    if (!selectedPair || isScanning || isOffline) return;
    const id = window.setInterval(() => {
      runStagesForPair(selectedPair, true);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [selectedPair, isScanning, isOffline, runStagesForPair]);

  const handleRetryStage = async (stageNum: number) => {
    if (!selectedPair) return;
    setLoadingStage(stageNum);
    try {
      const result = await fetchSingleStage(stageNum, selectedPair, xHandleHintRef.current);
      if (stageNum === 1) setStage1(result as StageResponse<Stage1IdentityData>);
      if (stageNum === 2) setStage2(result as StageResponse<Stage2SafetyData>);
      if (stageNum === 3) setStage3(result as StageResponse<Stage3LiquidityData>);
      if (stageNum === 4) setStage4(result as StageResponse<Stage4MarketData>);
      if (stageNum === 5) setStage5(result as StageResponse<Stage5NarrativeData>);
      setLastUpdatedAt(Date.now());
    } finally {
      setLoadingStage(null);
    }
  };

  const handleSubmit = async (queryOverride?: string) => {
    const queryValue = (queryOverride ?? inputText).trim();
    const parsed = parseLabInput(queryValue);
    if (!parsed.valid) {
      setResolveError(parsed.error || 'Enter a valid contract address, ticker, @handle, or URL.');
      return;
    }

    if (isOffline) {
      setResolveError('You appear to be offline. Reconnect to query live sources.');
      return;
    }

    xHandleHintRef.current = parsed.kind === 'x_handle' ? parsed.normalized : '';
    setResolveError(null);
    setResolving(true);
    setCandidates([]);

    try {
      const resp = await fetch(`/api/lab/resolve?q=${encodeURIComponent(queryValue)}`);
      const json = await resp.json();
      if (!resp.ok) {
        setResolveError(json.error || 'Unable to resolve token query.');
        setResolving(false);
        return;
      }

      const found: LabCandidatePair[] = json.candidates || [];
      if (found.length === 0) {
        setResolveError('No matching pairs returned from DexScreener for that input.');
        setResolving(false);
        return;
      }

      setCandidates(found);
      setResolving(false);

      if (found.length === 1 || parsed.kind === 'dexscreener_url') {
        runStagesForPair(found[0]);
      } else {
        // Pre-select highest-liquidity match only if exact address was pasted; for names/tickers let user pick or start after pick
        if (parsed.kind === 'evm_address' || parsed.kind === 'solana_address' || parsed.kind === 'pumpfun_url') {
          runStagesForPair(found[0]);
        }
      }
    } catch {
      setResolveError('Network error resolving target. Check connection and retry.');
      setResolving(false);
    }
  };

  const allStages = [stage1, stage2, stage3, stage4, stage5];
  const completedStages = allStages.filter((s) => s !== null).length;
  const dataCoverageCount = allStages.filter((s) => s?.ok).length;
  const failedSources: string[] = [];
  allStages.forEach((st) => {
    if (!st) return;
    if (!st.ok) {
      const failedNames = (st.sources || [])
        .filter((src) => !src.ok)
        .map((src) => src.source);
      failedSources.push(
        failedNames.length > 0
          ? `${failedNames.join(', ')} (Stage ${st.stage})`
          : `Stage ${st.stage} (${st.title})`,
      );
    } else {
      (st.sources || []).forEach((src) => {
        if (!src.ok && src.statusCode !== 404 && !/Unsupported chain/i.test(src.error || '')) {
          failedSources.push(`${src.source} (Stage ${st.stage})`);
        }
      });
    }
  });
  const allFindings: TerminalFinding[] = allStages.flatMap((s) => s?.findings || []);
  const flagsObservedCount = allFindings.filter((f) => f.severity === 'FLAG').length;
  const scanPercent = (completedStages / 5) * 100;
  const scanFinished = completedStages === 5 && !isScanning;

  const activeStageNum = loadingStage || (completedStages < 5 ? completedStages + 1 : 5);
  const stageLabel = isScanning
    ? STAGE_TITLES[activeStageNum] || 'Scanning...'
    : scanFinished
      ? `Scan Complete · ${selectedPair?.baseToken.symbol || 'Target'}`
      : selectedPair
        ? `Ready · ${selectedPair.baseToken.symbol}`
        : 'Scanner Standby';

  const pairKey = selectedPair
    ? `${selectedPair.chainId}:${selectedPair.baseToken.address}`
    : '';
  const isSavedInWatchlist = Boolean(
    pairKey && watchlist.some((w) => w.key === pairKey),
  );

  const handleToggleWatchlist = () => {
    if (!selectedPair) return;
    setWatchlist((prev) => {
      const exists = prev.some((item) => item.key === pairKey);
      const next = exists
        ? prev.filter((item) => item.key !== pairKey)
        : [
            {
              key: pairKey,
              chainId: selectedPair.chainId,
              address: selectedPair.baseToken.address,
              pairAddress: selectedPair.pairAddress,
              symbol: selectedPair.baseToken.symbol,
              name: selectedPair.baseToken.name,
              savedAt: Date.now(),
              flagsObserved: flagsObservedCount,
              coverage: `${dataCoverageCount}/5`,
            },
            ...prev,
          ].slice(0, 20);
      try {
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const handleRemoveWatchlistItem = (key: string) => {
    setWatchlist((prev) => {
      const next = prev.filter((item) => item.key !== key);
      try {
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const handleGenerateAiRecap = async () => {
    if (!selectedPair || !scanFinished) return;
    setAiRecapLoading(true);
    setAiRecapError(null);

    const summaryPayload = {
      token: selectedPair.baseToken,
      chain: selectedPair.chainId,
      identity: stage1?.data,
      safety: stage2?.data,
      liquidity: stage3?.data
        ? {
            liquidityUsd: stage3.data.liquidityUsd,
            lpLockedOrBurnedPct: stage3.data.lpLockedOrBurnedPct,
            top10HolderPct: stage3.data.top10HolderPct,
            holderCount: stage3.data.holderCount,
          }
        : null,
      market: stage4?.data,
      links: {
        claimedCount: stage5?.data?.links.length ?? 0,
        resolvedCount: stage5?.data?.links.filter((l) => l.resolves).length ?? 0,
      },
      flagsObserved: flagsObservedCount,
    };

    const deterministicFallback = buildDeterministicRecap(summaryPayload);

    try {
      const resp = await fetch('/api/lab/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryPayload }),
      });
      const json = (await resp.json()) as {
        ok?: boolean;
        message?: string;
        recap?: string;
      };
      if (!resp.ok || json.ok === false) {
        setAiRecapError('Summary temporarily unavailable.');
        setAiRecap(json.recap || deterministicFallback);
      } else {
        setAiRecap(json.recap || deterministicFallback);
      }
    } catch {
      setAiRecapError('Summary temporarily unavailable.');
      setAiRecap(deterministicFallback);
    } finally {
      setAiRecapLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Offline Banner */}
      {isOffline && (
        <div
          role="alert"
          className="clay-card p-3.5 border-[#E10000] flex items-center gap-3 text-xs text-white"
        >
          <WifiOff className="w-4 h-4 text-[#FF554A] shrink-0" />
          <span>Network offline detected. Live token screening pauses until connection resumes.</span>
        </div>
      )}

      {/* Header + Positioning Copy */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-wider text-[#FF554A]">
            <CrownIcon className="w-4 h-4" glow />
            <span>Live 5-Stage Screening</span>
          </div>
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="min-h-[44px] px-3.5 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-[#E10000] text-xs font-heading font-bold text-white inline-flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
            >
              <Compass className="w-3.5 h-3.5 text-[#FF554A]" />
              <span>App &amp; 3D Guide</span>
            </button>
          )}
        </div>
        <h1 className="font-heading font-bold text-[28px] sm:text-[36px] leading-tight text-white">
          Diagnostic Lab
        </h1>
        <p className="text-sm sm:text-base text-[#A3A3A3] max-w-3xl leading-relaxed">
          Most people don&apos;t lose in Web3 because they&apos;re early or late. They lose because they can&apos;t tell real infrastructure from packaged poison. This page is a live lab: security filters, narrative autopsies, high-signal breakdowns. No paid groups. No recycled alpha.
        </p>
      </div>

      {/* Smart Single Input + Example Chips */}
      <ClayCard className="p-4 sm:p-5 space-y-3">
        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#A3A3A3] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              autoComplete="off"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (resolveError) setResolveError(null);
              }}
              placeholder="Paste contract (0x... / Solana), ticker, @handle, DexScreener or Pump.fun link"
              aria-label="Token contract address, ticker, X handle, or DEX link"
              className="w-full min-h-[48px] rounded-full bg-[#050505] border-[1.5px] border-[#2A2A2A] pl-11 pr-4 text-sm text-white placeholder:text-[#737373] font-mono-handle focus:outline-none focus:ring-2 focus:ring-[#FF554A] focus:border-[#E10000]"
            />
          </div>

          <ActionButton
            type="submit"
            variant="primary"
            disabled={resolving || isOffline}
            className="sm:w-auto w-full shrink-0"
          >
            {resolving ? 'Resolving...' : 'Run Diagnosis'}
          </ActionButton>
        </form>

        {/* Auto-detect chip + Example chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {inputText.trim().length > 0 && (
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-mono-handle border ${
                  parsedInput.valid
                    ? 'bg-[#E10000]/15 border-[#E10000]/50 text-[#FF554A]'
                    : 'bg-[#161616] border-[#E10000] text-[#FF554A]'
                }`}
              >
                {parsedInput.label}
              </span>
            )}

            {EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setInputText(chip.query);
                  setResolveError(null);
                  handleSubmit(chip.query);
                }}
                className="min-h-[44px] px-3.5 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-mono-handle text-[#D4D4D4] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {selectedPair && (
            <div className="flex items-center gap-2 text-xs text-[#A3A3A3] font-mono-handle">
              <span>{elapsedLabel}</span>
              <button
                type="button"
                onClick={() => runStagesForPair(selectedPair, true)}
                disabled={isScanning || isOffline}
                aria-label="Refresh scan telemetry"
                className="min-h-[44px] px-3 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-heading font-bold text-white inline-flex items-center gap-1.5 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          )}
        </div>

        {resolveError && (
          <p role="alert" className="text-xs text-[#FF554A] pt-1">
            {resolveError}
          </p>
        )}
      </ClayCard>

      {/* Candidate Picker (Anti-Fake-Ticker Selection Step) */}
      {candidates.length > 1 && (
        <section aria-labelledby="candidate-picker-heading" className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2
              id="candidate-picker-heading"
              className="font-heading font-bold text-xs uppercase tracking-wider text-[#A3A3A3]"
            >
              Multiple matching pairs ({candidates.length}) — verify chain &amp; liquidity
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {candidates.slice(0, 6).map((pair) => {
              const isSelected = selectedPair?.pairAddress === pair.pairAddress;
              return (
                <button
                  key={`${pair.chainId}-${pair.pairAddress}`}
                  type="button"
                  onClick={() => runStagesForPair(pair)}
                  className={`min-h-[56px] p-3 rounded-[16px] border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                    isSelected
                      ? 'bg-[#E10000]/15 border-[#E10000]'
                      : 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-white/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading font-bold text-sm text-white truncate">
                      {pair.baseToken.symbol}/{pair.quoteToken.symbol || 'USD'}
                    </span>
                    <span className="font-mono-handle text-[11px] text-[#FF554A] uppercase shrink-0">
                      {pair.chainId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#A3A3A3] font-mono-handle mt-1">
                    <span>Liq: {formatUsd(pair.liquidityUsd)}</span>
                    <span>{formatPairAge(pair.pairCreatedAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Primary Workspace: Mobile Stacked / Desktop 2-Column (3D Scanner Left + Terminal Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <LabScannerStage
            completedStages={completedStages}
            activeStage={activeStageNum}
            stageLabel={stageLabel}
            scanPercent={scanPercent}
            dataCoverageCount={dataCoverageCount}
            failedSources={failedSources}
            flagsObservedCount={flagsObservedCount}
            scanFinished={scanFinished}
            onOpenGuide={onOpenGuide}
          />
        </div>

        <div className="lg:col-span-5">
          <DiagnosticsTerminal
            findings={allFindings}
            isScanning={isScanning}
            tokenSymbol={selectedPair?.baseToken.symbol || ''}
            tokenName={selectedPair?.baseToken.name || ''}
            chainId={selectedPair?.chainId || ''}
            address={selectedPair?.baseToken.address || ''}
            dataCoverageCount={dataCoverageCount}
            flagsObservedCount={flagsObservedCount}
            isSavedInWatchlist={isSavedInWatchlist}
            onSaveWatchlist={handleToggleWatchlist}
          />
        </div>
      </div>

      {/* Measured Breakdowns + News + X Snapshot */}
      {selectedPair ? (
        <div className="space-y-6">
          <NewsAndXPanel
            stage1={stage1}
            stage2={stage2}
            stage3={stage3}
            stage4={stage4}
            stage5={stage5}
            loadingStage={loadingStage}
            onRetryStage={handleRetryStage}
          />

          {/* Optional Neutral Gemini Recap */}
          {scanFinished && (
            <ClayCard className="p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF554A]" />
                  <h3 className="font-heading font-bold text-sm text-white">
                    Neutral telemetry recap (optional)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAiRecap}
                  disabled={aiRecapLoading || isOffline}
                  className="min-h-[44px] px-4 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-heading font-bold text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                >
                  {aiRecapLoading ? 'Summarizing...' : 'Summarize Measured Facts'}
                </button>
              </div>
              {aiRecapError && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#FF554A] bg-[#050505] border border-[#E10000]/45 rounded-[14px] px-3.5 py-2.5">
                  <span>{aiRecapError}</span>
                  <button
                    type="button"
                    onClick={handleGenerateAiRecap}
                    disabled={aiRecapLoading || isOffline}
                    className="min-h-[44px] px-3.5 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-[#E10000] text-xs font-heading font-bold text-white inline-flex items-center gap-1.5 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#FF554A] ${aiRecapLoading ? 'animate-spin' : ''}`} />
                    <span>Retry</span>
                  </button>
                </div>
              )}
              {aiRecap && (
                <p className="text-sm text-[#D4D4D4] leading-relaxed bg-[#050505] p-3.5 rounded-[14px] border border-[#2A2A2A] font-mono-handle">
                  {aiRecap}
                </p>
              )}
            </ClayCard>
          )}
        </div>
      ) : (
        <MascotMoment
          mode="empty"
          title="DIAGNOSTIC LAB STANDBY"
          subtitle="Paste a token address, ticker, @handle, or DexScreener/Pump.fun URL above to run the 5-stage telemetry scan."
        />
      )}

      {/* Local Watchlist */}
      {watchlist.length > 0 && (
        <section aria-labelledby="watchlist-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#FF554A]" />
            <h2
              id="watchlist-heading"
              className="font-heading font-bold text-sm uppercase tracking-wider text-[#A3A3A3]"
            >
              Saved Watchlist ({watchlist.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {watchlist.map((item) => (
              <ClayCard
                key={item.key}
                className="p-4 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    setInputText(item.address);
                    handleSubmit(item.address);
                  }}
                  className="flex-1 text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm text-white truncate">
                      {item.symbol}
                    </span>
                    <span className="font-mono-handle text-[11px] text-[#FF554A] uppercase">
                      {item.chainId}
                    </span>
                  </div>
                  <p className="font-mono-handle text-[11px] text-[#A3A3A3] truncate mt-0.5">
                    {item.address}
                  </p>
                  <p className="font-mono-handle text-[11px] text-[#737373] mt-0.5">
                    Flags: {item.flagsObserved} · Coverage: {item.coverage}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveWatchlistItem(item.key)}
                  aria-label={`Remove ${item.symbol} from watchlist`}
                  className="min-h-[44px] min-w-[44px] rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-[#E10000] text-[#A3A3A3] hover:text-[#FF554A] flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </ClayCard>
            ))}
          </div>
        </section>
      )}

      {/* Mandatory Result Screen Footer */}
      <footer className="pt-4 border-t border-[#2A2A2A] text-center">
        <p className="text-xs font-mono-handle text-[#A3A3A3]">
          Informational only. Not financial advice. Verify independently.
        </p>
      </footer>
    </div>
  );
};
