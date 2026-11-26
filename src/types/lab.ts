export type InputKind =
  | 'evm_address'
  | 'solana_address'
  | 'x_handle'
  | 'dexscreener_url'
  | 'pumpfun_url'
  | 'ticker_query'
  | 'invalid';

export interface ParsedInput {
  raw: string;
  kind: InputKind;
  label: string;
  normalized: string;
  chainHint?: string;
  valid: boolean;
  error?: string;
}

export interface LabCandidatePair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    symbol: string;
  };
  priceUsd: string | null;
  liquidityUsd: number;
  volume24hUsd: number;
  pairCreatedAt: number | null;
  fdv: number | null;
  marketCap: number | null;
  url: string;
}

export interface SourceStatus {
  source: string;
  ok: boolean;
  statusCode?: number;
  latencyMs: number;
  cached: boolean;
  rateLimited?: boolean;
  error?: string;
}

export type TerminalSeverity = 'INFO' | 'FLAG' | 'WARN' | 'ERR';

export interface TerminalFinding {
  id: string;
  stage: number;
  timestamp: string;
  severity: TerminalSeverity;
  label: string;
  summary: string;
  rawValue: string;
  sourceName: string;
  sourceUrl: string;
}

export interface Stage1IdentityData {
  name: string;
  symbol: string;
  address: string;
  chainId: string;
  pairAddress: string;
  dexId: string;
  ageHours: number | null;
  pairCreatedAt: number | null;
  duplicateTickerCount: number;
  coingeckoId: string | null;
  coingeckoRank: number | null;
  fdv: number | null;
  marketCap: number | null;
}

export interface Stage2SafetyData {
  chainType: 'solana' | 'evm' | 'unsupported';
  supported: boolean;
  unsupportedReason?: string;
  // Solana fields
  mintAuthorityStatus?: 'Revoked' | 'Active' | 'Unknown';
  freezeAuthorityStatus?: 'Revoked' | 'Active' | 'Unknown';
  mutableMetadata?: boolean | null;
  rugcheckScore?: number | null;
  rugcheckRisks?: { name: string; level: string; description: string }[];
  // EVM fields
  isOpenSource?: boolean | null;
  isHoneypot?: boolean | null;
  buyTaxPct?: number | null;
  sellTaxPct?: number | null;
  ownershipRenounced?: boolean | null;
  isProxy?: boolean | null;
  isBlacklisted?: boolean | null;
  isMintable?: boolean | null;
}

export interface Stage3LiquidityData {
  liquidityUsd: number;
  lpLockedOrBurnedPct: number | null;
  lpLockDetected: boolean | null;
  top10HolderPct: number | null;
  deployerSharePct: number | null;
  holderCount: number | null;
  holderSourceName: string;
  holderSourceUrl: string;
  topHolders: { address: string; pct: number; isInsider?: boolean }[];
  extraProviderUsed: string | null;
}

export interface TxnBucket {
  window: '5m' | '1h' | '6h' | '24h';
  buys: number;
  sells: number;
}

export interface Stage4MarketData {
  priceUsd: number | null;
  volume24hUsd: number;
  liquidityUsd: number;
  volumeToLiquidityRatio: number | null;
  washTradingHint: boolean;
  buySellRatio24h: number | null;
  priceChange: {
    m5: number | null;
    h1: number | null;
    h6: number | null;
    h24: number | null;
  };
  txns: TxnBucket[];
}

export interface LinkCheckResult {
  label: string;
  url: string;
  resolves: boolean;
  statusCode: number | null;
}

export interface NewsItem {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
}

export interface XPostItem {
  id: string;
  authorHandle: string;
  authorName: string;
  text: string;
  createdAt: string;
  likes: number;
  reposts: number;
  replies: number;
  engagementCount: number;
  url: string;
}

export interface XAccountSnapshot {
  handle: string;
  createdAt: string | null;
  followersCount: number | null;
  tweetCount: number | null;
  cadencePerWeek: number | null;
  url: string;
}

export interface Stage5NarrativeData {
  links: LinkCheckResult[];
  news: NewsItem[];
  newsSearchUrl: string;
  xConfigured: boolean;
  xSearchUrl: string;
  xSearchByAddressUrl: string;
  xSearchByTickerUrl: string;
  xProfileUrl: string | null;
  xProfileHandle: string | null;
  xPosts: XPostItem[];
  xAccount: XAccountSnapshot | null;
  xError?: string;
}

export interface StageResponse<T> {
  stage: number;
  title: string;
  ok: boolean;
  data: T | null;
  findings: TerminalFinding[];
  sources: SourceStatus[];
  error?: string;
  fetchedAt: number;
}

export interface ResolveResponse {
  detectedType: InputKind;
  normalizedQuery: string;
  candidates: LabCandidatePair[];
  sourceStatus: SourceStatus;
}

export interface WatchlistItem {
  key: string;
  chainId: string;
  address: string;
  pairAddress: string;
  symbol: string;
  name: string;
  savedAt: number;
  flagsObserved: number;
  coverage: string;
}
