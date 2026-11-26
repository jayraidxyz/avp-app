import React from 'react';
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  Globe,
  Layers,
  Newspaper,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import {
  Stage1IdentityData,
  Stage2SafetyData,
  Stage3LiquidityData,
  Stage4MarketData,
  Stage5NarrativeData,
  StageResponse,
} from '../../types/lab';
import {
  formatAccountAge,
  formatPairAge,
  formatRelativeTime,
  formatUsd,
} from '../../utils/labParser';
import { ClayCard } from '../ui/ClayCard';

interface NewsAndXPanelProps {
  stage1: StageResponse<Stage1IdentityData> | null;
  stage2: StageResponse<Stage2SafetyData> | null;
  stage3: StageResponse<Stage3LiquidityData> | null;
  stage4: StageResponse<Stage4MarketData> | null;
  stage5: StageResponse<Stage5NarrativeData> | null;
  loadingStage: number | null;
  onRetryStage: (stage: number) => void;
}

const StageFailureCard: React.FC<{
  stage: number;
  title: string;
  error?: string;
  onRetry: () => void;
}> = ({ stage, title, error, onRetry }) => (
  <ClayCard className="p-5 space-y-3 border-[#E10000]/40">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[#FF554A] shrink-0" />
        <h3 className="font-heading font-bold text-sm text-white">
          0{stage} · {title}
        </h3>
      </div>
      <span className="font-mono-handle text-[11px] text-[#FF554A]">ERR</span>
    </div>
    <p className="text-xs text-[#A3A3A3]">
      {error || `Stage ${stage} unavailable, source timed out`}
    </p>
    <button
      type="button"
      onClick={onRetry}
      className="min-h-[44px] px-4 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-[#E10000] text-xs font-heading font-bold text-white inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
    >
      <RefreshCw className="w-3.5 h-3.5 text-[#FF554A]" />
      <span>Retry</span>
    </button>
  </ClayCard>
);

const StageSkeletonCard: React.FC<{ title: string }> = ({ title }) => (
  <ClayCard className="p-5 space-y-3 animate-pulse">
    <div className="text-xs font-heading font-bold text-[#A3A3A3]">{title}</div>
    <div className="h-4 w-2/3 bg-[#161616] rounded" />
    <div className="h-4 w-full bg-[#161616] rounded" />
    <div className="h-4 w-1/2 bg-[#161616] rounded" />
  </ClayCard>
);

const StatRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight = false,
}) => (
  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#2A2A2A]/60 last:border-b-0 text-xs">
    <span className="text-[#A3A3A3]">{label}</span>
    <span
      className={`font-mono-handle font-medium text-right ${
        highlight ? 'text-[#FF554A]' : 'text-white'
      }`}
    >
      {value}
    </span>
  </div>
);

export const NewsAndXPanel: React.FC<NewsAndXPanelProps> = ({
  stage1,
  stage2,
  stage3,
  stage4,
  stage5,
  loadingStage,
  onRetryStage,
}) => {
  const s1 = stage1?.data;
  const s2 = stage2?.data;
  const s3 = stage3?.data;
  const s4 = stage4?.data;
  const s5 = stage5?.data;

  const maxTxn = Math.max(
    1,
    ...(s4?.txns || []).flatMap((b) => [b.buys, b.sells]),
  );

  return (
    <div className="space-y-6">
      {/* Stages 1-4 Measured Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stage 1: Identity */}
        {loadingStage === 1 && !stage1 ? (
          <StageSkeletonCard title="01 · Identity" />
        ) : stage1 && !stage1.ok ? (
          <StageFailureCard
            stage={1}
            title="Identity"
            error={stage1.error}
            onRetry={() => onRetryStage(1)}
          />
        ) : s1 ? (
          <ClayCard className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FF554A]" />
                <h3 className="font-heading font-bold text-sm text-white">01 · Identity</h3>
              </div>
              <span className="font-mono-handle text-[11px] text-[#A3A3A3] uppercase">
                {s1.chainId}
              </span>
            </div>
            <div>
              <StatRow label="Token" value={`${s1.name} (${s1.symbol})`} />
              <StatRow label="DEX" value={s1.dexId} />
              <StatRow label="Pair Age" value={formatPairAge(s1.pairCreatedAt)} />
              <StatRow
                label="Duplicate Ticker Matches"
                value={
                  s1.duplicateTickerCount > 0
                    ? `${s1.duplicateTickerCount} Flag observed`
                    : 'Not detected'
                }
                highlight={s1.duplicateTickerCount > 0}
              />
              <StatRow label="Market Cap / FDV" value={formatUsd(s1.marketCap ?? s1.fdv)} />
              <StatRow
                label="CoinGecko"
                value={
                  s1.coingeckoId
                    ? `${s1.coingeckoId}${s1.coingeckoRank ? ` (#${s1.coingeckoRank})` : ''}`
                    : 'Not listed'
                }
              />
            </div>
          </ClayCard>
        ) : null}

        {/* Stage 2: Contract Safety */}
        {loadingStage === 2 && !stage2 ? (
          <StageSkeletonCard title="02 · Contract safety" />
        ) : stage2 && !stage2.ok ? (
          <StageFailureCard
            stage={2}
            title="Contract safety"
            error={stage2.error}
            onRetry={() => onRetryStage(2)}
          />
        ) : s2 ? (
          <ClayCard className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#FF554A]" />
                <h3 className="font-heading font-bold text-sm text-white">02 · Contract safety</h3>
              </div>
              <span className="font-mono-handle text-[11px] text-[#A3A3A3] uppercase">
                {s2.chainType}
              </span>
            </div>
            {!s2.supported ? (
              <p className="text-xs text-[#A3A3A3] leading-relaxed">
                {s2.unsupportedReason || 'Contract scanner does not support this chain yet.'}
              </p>
            ) : s2.chainType === 'solana' ? (
              <div>
                <StatRow
                  label="Mint Authority"
                  value={s2.mintAuthorityStatus === 'Active' ? 'Flag observed (Active)' : s2.mintAuthorityStatus || 'Unknown'}
                  highlight={s2.mintAuthorityStatus === 'Active'}
                />
                <StatRow
                  label="Freeze Authority"
                  value={s2.freezeAuthorityStatus === 'Active' ? 'Flag observed (Active)' : s2.freezeAuthorityStatus || 'Unknown'}
                  highlight={s2.freezeAuthorityStatus === 'Active'}
                />
                <StatRow
                  label="Mutable Metadata"
                  value={
                    s2.mutableMetadata === true
                      ? 'Mutable'
                      : s2.mutableMetadata === false
                        ? 'Immutable'
                        : 'Not reported'
                  }
                />
                <StatRow
                  label="RugCheck Score"
                  value={s2.rugcheckScore !== null && s2.rugcheckScore !== undefined ? String(s2.rugcheckScore) : 'N/A'}
                />
                <StatRow
                  label="Reported Risks"
                  value={
                    (s2.rugcheckRisks?.length || 0) > 0
                      ? `${s2.rugcheckRisks?.length} Flag observed`
                      : 'Not detected'
                  }
                  highlight={(s2.rugcheckRisks?.length || 0) > 0}
                />
              </div>
            ) : (
              <div>
                <StatRow
                  label="Source Verified"
                  value={s2.isOpenSource === true ? 'Verified' : s2.isOpenSource === false ? 'Unverified' : 'Not reported'}
                  highlight={s2.isOpenSource === false}
                />
                <StatRow
                  label="Honeypot Check"
                  value={s2.isHoneypot === true ? 'Flag observed' : 'Not detected'}
                  highlight={s2.isHoneypot === true}
                />
                <StatRow
                  label="Entry / Exit Tax"
                  value={`${s2.buyTaxPct ?? 'N/A'}% / ${s2.sellTaxPct ?? 'N/A'}%`}
                  highlight={(s2.buyTaxPct ?? 0) > 5 || (s2.sellTaxPct ?? 0) > 5}
                />
                <StatRow
                  label="Ownership Renounced"
                  value={s2.ownershipRenounced ? 'Renounced' : 'Flag observed (Active owner)'}
                  highlight={!s2.ownershipRenounced}
                />
                <StatRow
                  label="Proxy / Blacklist"
                  value={`${s2.isProxy ? 'Proxy observed' : 'No proxy'} · ${s2.isBlacklisted ? 'Blacklist observed' : 'Not detected'}`}
                  highlight={Boolean(s2.isProxy || s2.isBlacklisted)}
                />
              </div>
            )}
          </ClayCard>
        ) : null}

        {/* Stage 3: Liquidity and Holders */}
        {loadingStage === 3 && !stage3 ? (
          <StageSkeletonCard title="03 · Liquidity & holders" />
        ) : stage3 && !stage3.ok ? (
          <StageFailureCard
            stage={3}
            title="Liquidity and holders"
            error={stage3.error}
            onRetry={() => onRetryStage(3)}
          />
        ) : s3 ? (
          <ClayCard className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF554A]" />
                <h3 className="font-heading font-bold text-sm text-white">
                  03 · Liquidity &amp; holders
                </h3>
              </div>
              {s3.extraProviderUsed && (
                <span className="font-mono-handle text-[11px] text-[#A3A3A3]">
                  +{s3.extraProviderUsed}
                </span>
              )}
            </div>
            <div>
              <StatRow
                label="Pool Liquidity"
                value={formatUsd(s3.liquidityUsd)}
                highlight={s3.liquidityUsd < 10_000}
              />
              <StatRow
                label="LP Locked / Burned"
                value={
                  s3.lpLockedOrBurnedPct !== null
                    ? `${s3.lpLockedOrBurnedPct}%`
                    : 'Not detected'
                }
                highlight={s3.lpLockDetected === false}
              />
              <StatRow
                label="Top 10 Concentration"
                value={s3.top10HolderPct !== null ? `${s3.top10HolderPct}%` : 'Not reported'}
                highlight={s3.top10HolderPct !== null && s3.top10HolderPct > 35}
              />
              <StatRow
                label="Deployer Share"
                value={s3.deployerSharePct !== null ? `${s3.deployerSharePct}%` : 'Not reported'}
              />
              <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#2A2A2A]/60 last:border-b-0 text-xs">
                <span className="text-[#A3A3A3]">Holder Count</span>
                {s3.holderCount !== null ? (
                  <span className="font-mono-handle font-medium text-right text-white">
                    {s3.holderCount.toLocaleString()}
                  </span>
                ) : (
                  <a
                    href={s3.holderSourceUrl || 'https://rugcheck.xyz/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono-handle font-medium text-right text-[#FF554A] hover:text-[#FF2A1F] underline underline-offset-2 inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] rounded"
                  >
                    <span>
                      Not reported by source ({s3.holderSourceName || 'RugCheck/DexScreener'})
                    </span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>
          </ClayCard>
        ) : null}

        {/* Stage 4: Market Activity & Transactions Chart */}
        {loadingStage === 4 && !stage4 ? (
          <StageSkeletonCard title="04 · Market activity" />
        ) : stage4 && !stage4.ok ? (
          <StageFailureCard
            stage={4}
            title="Market activity"
            error={stage4.error}
            onRetry={() => onRetryStage(4)}
          />
        ) : s4 ? (
          <ClayCard className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FF554A]" />
                <h3 className="font-heading font-bold text-sm text-white">04 · Market activity</h3>
              </div>
              {s4.priceUsd !== null && (
                <span className="font-mono-handle text-xs text-white">
                  ${s4.priceUsd < 0.01 ? s4.priceUsd.toExponential(3) : s4.priceUsd.toFixed(4)}
                </span>
              )}
            </div>

            <div>
              <StatRow label="24h Volume" value={formatUsd(s4.volume24hUsd)} />
              <StatRow
                label="Volume / Liquidity Ratio"
                value={
                  s4.volumeToLiquidityRatio !== null
                    ? `${s4.volumeToLiquidityRatio}x${s4.washTradingHint ? ' (Wash-trading hint)' : ''}`
                    : 'N/A'
                }
                highlight={s4.washTradingHint}
              />
              <StatRow
                label="Inflow / Outflow Ratio (24h)"
                value={s4.buySellRatio24h !== null ? `${s4.buySellRatio24h}x` : 'N/A'}
              />
              <StatRow
                label="Price Delta (1h / 24h)"
                value={`${s4.priceChange.h1 ?? 'N/A'}% / ${s4.priceChange.h24 ?? 'N/A'}%`}
              />
            </div>

            {/* Transactions Flow SVG Bar Chart */}
            <div className="pt-2 border-t border-[#2A2A2A] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#A3A3A3]">
                <span>Transactions flow</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white inline-block" /> Buys
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#E10000] inline-block" /> Sells
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#737373] font-mono-handle">
                Legend: White = Buys · Red = Sells · Counts show measured swap txns per window.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {s4.txns.map((bucket) => {
                  const noActivity = bucket.buys === 0 && bucket.sells === 0;
                  const inPct = noActivity ? 6 : Math.max(8, Math.round((bucket.buys / maxTxn) * 100));
                  const outPct = noActivity ? 6 : Math.max(8, Math.round((bucket.sells / maxTxn) * 100));
                  return (
                    <div
                      key={bucket.window}
                      title={`Buys / Sells in the last ${bucket.window}: ${bucket.buys} buys, ${bucket.sells} sells`}
                      className="bg-[#050505] border border-[#2A2A2A] rounded-xl p-2 flex flex-col items-center gap-1.5"
                    >
                      <span
                        title="Swap buys vs. sells recorded in this time window"
                        className="font-mono-handle text-[10px] text-[#A3A3A3] underline decoration-dotted underline-offset-2 cursor-help"
                      >
                        Buys / Sells
                      </span>
                      <div className="w-full h-14 flex items-end justify-center gap-1.5">
                        <div
                          className={`w-3 rounded-t ${noActivity ? 'bg-[#2A2A2A]' : 'bg-white'}`}
                          style={{ height: `${inPct}%` }}
                          title={`Buys: ${bucket.buys}`}
                        />
                        <div
                          className={`w-3 rounded-t ${noActivity ? 'bg-[#2A2A2A]' : 'bg-[#E10000]'}`}
                          style={{ height: `${outPct}%` }}
                          title={`Sells: ${bucket.sells}`}
                        />
                      </div>
                      <span className="font-mono-handle text-[11px] text-[#A3A3A3]">
                        {bucket.window}
                      </span>
                      {noActivity ? (
                        <span className="font-mono-handle text-[10px] text-[#737373]">
                          No activity
                        </span>
                      ) : (
                        <span className="font-mono-handle text-[10px] text-white tabular-nums">
                          {bucket.buys}/{bucket.sells}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ClayCard>
        ) : null}
      </div>

      {/* Stage 5: Narrative, Links, News & X Panel */}
      {loadingStage === 5 && !stage5 ? (
        <StageSkeletonCard title="05 · Narrative, links & social intel" />
      ) : stage5 && !stage5.ok ? (
        <StageFailureCard
          stage={5}
          title="Narrative and social"
          error={stage5.error}
          onRetry={() => onRetryStage(5)}
        />
      ) : s5 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Latest News + Official Link Checks */}
          <div className="lg:col-span-7 space-y-4">
            <ClayCard className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-[#FF554A]" />
                  <h3 className="font-heading font-bold text-sm text-white">
                    Latest on this coin
                  </h3>
                </div>
                <span className="font-mono-handle text-[11px] text-[#A3A3A3]">
                  {s5.news.length} headlines
                </span>
              </div>

              {s5.news.length === 0 ? (
                <div className="p-4 rounded-[14px] bg-[#050505] border border-[#2A2A2A] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#A3A3A3]">
                    No recent reporting found
                  </p>
                  <a
                    href={s5.newsSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3.5 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-heading font-bold text-white inline-flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                  >
                    <span>Search Google News</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <ul className="space-y-3">
                  {s5.news.slice(0, 6).map((item, idx) => {
                    const timeInfo = formatRelativeTime(item.publishedAt);
                    return (
                      <li
                        key={`${item.url}-${idx}`}
                        className="pb-3 border-b border-[#2A2A2A]/70 last:border-b-0 last:pb-0 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm text-white leading-snug">{item.title}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#A3A3A3] font-mono-handle">
                            <span>{item.source}</span>
                            <span aria-hidden="true">·</span>
                            <time
                              dateTime={item.publishedAt}
                              title={timeInfo.fullDate}
                              className="underline decoration-dotted underline-offset-2 cursor-help"
                            >
                              {timeInfo.relative}
                            </time>
                          </div>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] px-3 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-heading font-bold text-white inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                        >
                          <span>Read more</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ClayCard>

            {/* Official Links Resolution Check */}
            <ClayCard className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#FF554A]" />
                <h3 className="font-heading font-bold text-sm text-white">
                  Claimed project links
                </h3>
              </div>

              {s5.links.length === 0 ? (
                <p className="text-xs text-[#A3A3A3]">
                  No official websites or social links listed in DexScreener metadata.
                </p>
              ) : (
                <div className="space-y-2">
                  {s5.links.map((link) => (
                    <div
                      key={link.url}
                      className="flex items-center justify-between gap-3 py-2 border-b border-[#2A2A2A]/60 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-heading font-bold text-white capitalize block">
                          {link.label}
                        </span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono-handle text-[11px] text-[#A3A3A3] hover:text-white truncate block underline underline-offset-2"
                        >
                          {link.url}
                        </a>
                      </div>
                      <span
                        className={`font-mono-handle text-[11px] px-2.5 py-1 rounded-full border shrink-0 ${
                          link.resolves
                            ? 'text-white border-[#2A2A2A] bg-[#161616]'
                            : 'text-[#FF554A] border-[#E10000]/50 bg-[#E10000]/10'
                        }`}
                      >
                        {link.resolves ? `Resolves (${link.statusCode ?? 200})` : 'Unreachable'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ClayCard>
          </div>

          {/* X Snapshot Card */}
          <div className="lg:col-span-5">
            <ClayCard className="p-5 space-y-4 h-full">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading font-bold text-sm text-white">X snapshot</h3>
                <a
                  href={s5.xSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-heading font-bold text-white inline-flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                >
                  <span>Open on X</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {s5.xAccount && (
                <div className="p-3 rounded-[14px] bg-[#050505] border border-[#2A2A2A] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={s5.xAccount.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono-handle text-xs font-bold text-[#FF554A] hover:underline inline-flex items-center gap-1"
                    >
                      <span>{s5.xAccount.handle}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="font-mono-handle text-[11px] text-white">
                      {s5.xAccount.followersCount !== null
                        ? `${s5.xAccount.followersCount.toLocaleString()} followers`
                        : 'Followers N/A'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#A3A3A3] font-mono-handle">
                    <span>Age: {formatAccountAge(s5.xAccount.createdAt)}</span>
                    <span>Cadence: {s5.xAccount.cadencePerWeek ?? 'N/A'} posts/wk</span>
                  </div>
                </div>
              )}

              {!s5.xConfigured ? (
                <div className="p-4 rounded-[14px] bg-[#050505] border border-[#2A2A2A] space-y-3">
                  <div className="space-y-1">
                    <p className="font-heading font-bold text-xs text-white">
                      Connect X API to enable
                    </p>
                    <p className="text-xs text-[#A3A3A3] leading-relaxed">
                      Set <span className="font-mono-handle text-white">X_BEARER_TOKEN</span> on the server to display live X mentions and official account metrics. No placeholder posts are generated.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={s5.xSearchByAddressUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-heading font-bold text-white inline-flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                    >
                      <span>Search by contract</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={s5.xSearchByTickerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-xs font-heading font-bold text-white inline-flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                    >
                      <span>Search by ticker</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {s5.xProfileUrl && (
                      <a
                        href={s5.xProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] px-3 rounded-full bg-[#161616] border border-[#E10000]/60 hover:border-[#E10000] text-xs font-heading font-bold text-[#FF554A] inline-flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                      >
                        <span>{s5.xProfileHandle || 'Official Profile'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ) : s5.xError ? (
                <p className="text-xs text-[#FF554A]">{s5.xError}</p>
              ) : s5.xPosts.length === 0 ? (
                <p className="text-xs text-[#A3A3A3]">No recent X posts matched this query.</p>
              ) : (
                <div className="space-y-3">
                  {s5.xPosts.map((post) => {
                    const postTime = formatRelativeTime(post.createdAt);
                    const totalEngagement =
                      typeof post.engagementCount === 'number'
                        ? post.engagementCount
                        : post.likes + post.reposts + (post.replies || 0);
                    return (
                      <div
                        key={post.id}
                        className="p-3 rounded-[14px] bg-[#050505] border border-[#2A2A2A] space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-mono-handle text-[#FF554A] truncate">
                            {post.authorHandle}
                          </span>
                          <span
                            title={postTime.fullDate}
                            className="font-mono-handle text-[11px] text-[#A3A3A3] shrink-0"
                          >
                            {totalEngagement} engagements · {postTime.relative}
                          </span>
                        </div>
                        <p className="text-xs text-[#D4D4D4] line-clamp-3 leading-relaxed">
                          {post.text}
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="font-mono-handle text-[10px] text-[#737373]">
                            {post.likes} likes · {post.reposts} reposts · {post.replies ?? 0} replies
                          </span>
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[36px] px-2.5 rounded-full bg-[#161616] border border-[#2A2A2A] hover:border-white text-[11px] font-heading font-bold text-white inline-flex items-center gap-1 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                          >
                            <span>Open on X</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ClayCard>
          </div>
        </div>
      ) : null}
    </div>
  );
};
