import express, { Router } from 'express';
import dns from 'dns/promises';
import net from 'net';
import { GoogleGenAI } from '@google/genai';
import {
  LabCandidatePair,
  LinkCheckResult,
  NewsItem,
  SourceStatus,
  Stage1IdentityData,
  Stage2SafetyData,
  Stage3LiquidityData,
  Stage4MarketData,
  Stage5NarrativeData,
  StageResponse,
  TerminalFinding,
  XAccountSnapshot,
  XPostItem,
} from '../src/types/lab';

const CACHE_TTL_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 8_000;

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const apiCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T): void {
  if (apiCache.size > 400) {
    const now = Date.now();
    for (const [k, v] of apiCache.entries()) {
      if (v.expiresAt < now) apiCache.delete(k);
    }
  }
  apiCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

function nowTimeTag(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

async function fetchJsonWithRetry<T>(
  sourceName: string,
  url: string,
  init: RequestInit = {},
  retries = 1,
): Promise<{ data: T | null; status: SourceStatus }> {
  const cacheKey = `json:${sourceName}:${url}`;
  const cached = getCached<T>(cacheKey);
  if (cached !== null) {
    return {
      data: cached,
      status: {
        source: sourceName,
        ok: true,
        statusCode: 200,
        latencyMs: 0,
        cached: true,
      },
    };
  }

  let lastError = 'Unknown upstream error';
  let lastCode: number | undefined;
  let rateLimited = false;
  const started = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const resp = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ToxicologyArchiveLab/1.0',
          ...(init.headers || {}),
        },
      });
      clearTimeout(timer);
      lastCode = resp.status;

      if (resp.status === 429) {
        rateLimited = true;
        lastError = `${sourceName} rate limit reached (429).`;
        break;
      }

      if (!resp.ok) {
        lastError = `${sourceName} returned HTTP ${resp.status}`;
        if (resp.status >= 500 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
        break;
      }

      const json = (await resp.json()) as T;
      setCached(cacheKey, json);
      return {
        data: json,
        status: {
          source: sourceName,
          ok: true,
          statusCode: resp.status,
          latencyMs: Date.now() - started,
          cached: false,
        },
      };
    } catch (err) {
      clearTimeout(timer);
      lastError =
        err instanceof Error && err.name === 'AbortError'
          ? `${sourceName} timed out after 8s`
          : err instanceof Error
            ? err.message
            : 'Network request failed';
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
    }
  }

  return {
    data: null,
    status: {
      source: sourceName,
      ok: false,
      statusCode: lastCode,
      latencyMs: Date.now() - started,
      cached: false,
      rateLimited,
      error: lastError,
    },
  };
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return (
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    );
  }
  return true;
}

async function checkPublicUrlSafe(rawUrl: string): Promise<URL | null> {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      return null;
    }
    if (net.isIP(host)) {
      return isPrivateIp(host) ? null : parsed;
    }
    const resolved = await dns.lookup(host).catch(() => null);
    if (!resolved || isPrivateIp(resolved.address)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function checkLinkResolves(label: string, rawUrl: string): Promise<LinkCheckResult> {
  const safeUrl = await checkPublicUrlSafe(rawUrl);
  if (!safeUrl) {
    return { label, url: rawUrl, resolves: false, statusCode: null };
  }

  const cacheKey = `link:${safeUrl.toString()}`;
  const cached = getCached<LinkCheckResult>(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    let resp = await fetch(safeUrl.toString(), {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'ToxicologyArchiveLab/1.0' },
    });
    if (resp.status === 405 || resp.status === 403) {
      resp = await fetch(safeUrl.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'ToxicologyArchiveLab/1.0' },
      });
    }
    clearTimeout(timer);
    const result: LinkCheckResult = {
      label,
      url: safeUrl.toString(),
      resolves: resp.status >= 200 && resp.status < 400,
      statusCode: resp.status,
    };
    setCached(cacheKey, result);
    return result;
  } catch {
    clearTimeout(timer);
    const result: LinkCheckResult = {
      label,
      url: safeUrl.toString(),
      resolves: false,
      statusCode: null,
    };
    setCached(cacheKey, result);
    return result;
  }
}

const GOPLUS_CHAIN_MAP: Record<string, string> = {
  ethereum: '1',
  eth: '1',
  bsc: '56',
  polygon: '137',
  arbitrum: '42161',
  optimism: '10',
  avalanche: '43114',
  fantom: '250',
  base: '8453',
  linea: '59144',
  blast: '81457',
};

const COINGECKO_PLATFORM_MAP: Record<string, string> = {
  solana: 'solana',
  ethereum: 'ethereum',
  base: 'base',
  arbitrum: 'arbitrum-one',
  bsc: 'binance-smart-chain',
  polygon: 'polygon-pos',
  optimism: 'optimistic-ethereum',
  avalanche: 'avalanche',
};

interface DexScreenerPairRaw {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  txns?: Record<string, { buys?: number; sells?: number }>;
  volume?: Record<string, number>;
  priceChange?: Record<string, number>;
  liquidity?: { usd?: number; base?: number; quote?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    websites?: { label?: string; url?: string }[];
    socials?: { type?: string; url?: string }[];
  };
}

function mapDexPair(p: DexScreenerPairRaw): LabCandidatePair {
  return {
    chainId: String(p.chainId || 'unknown'),
    dexId: String(p.dexId || 'unknown'),
    pairAddress: String(p.pairAddress || ''),
    baseToken: {
      address: String(p.baseToken?.address || ''),
      name: String(p.baseToken?.name || 'Unknown Token'),
      symbol: String(p.baseToken?.symbol || '???'),
    },
    quoteToken: {
      symbol: String(p.quoteToken?.symbol || ''),
    },
    priceUsd: p.priceUsd ? String(p.priceUsd) : null,
    liquidityUsd: Number(p.liquidity?.usd || 0),
    volume24hUsd: Number(p.volume?.h24 || 0),
    pairCreatedAt: typeof p.pairCreatedAt === 'number' ? p.pairCreatedAt : null,
    fdv: typeof p.fdv === 'number' ? p.fdv : null,
    marketCap: typeof p.marketCap === 'number' ? p.marketCap : null,
    url: String(p.url || `https://dexscreener.com/${p.chainId || ''}/${p.pairAddress || ''}`),
  };
}

function isValidChainId(chain: string): boolean {
  return /^[a-z0-9_-]{2,32}$/i.test(chain);
}

function isValidTokenAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseGoogleNewsRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of itemMatches.slice(0, 24)) {
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const pubMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    if (titleMatch && linkMatch) {
      const rawTitle = decodeXmlEntities(titleMatch[1]);
      const source = sourceMatch ? decodeXmlEntities(sourceMatch[1]) : 'Google News';
      // Strip redundant " - Publisher" suffix that Google News RSS appends
      const cleanedTitle =
        source && rawTitle.endsWith(` - ${source}`)
          ? rawTitle.slice(0, rawTitle.length - ` - ${source}`.length).trim()
          : rawTitle;
      items.push({
        title: cleanedTitle,
        url: decodeXmlEntities(linkMatch[1]),
        publishedAt: pubMatch ? decodeXmlEntities(pubMatch[1]) : 'Recent',
        source,
      });
    }
  }
  return items;
}

const PRICE_LISTING_URL_PATTERNS = [
  /coinmarketcap\.com/i,
  /binance\.com\/[^/]+\/price/i,
  /binance\.com\/en\/price/i,
  /cryptorank\.io/i,
  /coindesk\.com\/price/i,
  /coingecko\.com/i,
  /coinbase\.com\/price/i,
  /crypto\.com\/price/i,
  /kraken\.com\/prices/i,
  /tradingview\.com\/symbols/i,
  /forbes\.com\/digital-assets\/assets/i,
  /bitget\.com\/price/i,
  /okx\.com\/price/i,
  /bybit\.com\/en\/coin-price/i,
  /gate\.io\/price/i,
  /mexc\.com\/price/i,
];

const PRICE_LISTING_TITLE_PATTERNS = [
  /\bprice today\b/i,
  /\blive chart\b/i,
  /\bconverter\b/i,
  /\blive price\b/i,
  /\bprice prediction\b/i,
  /\bto usd\b/i,
  /\busd price\b/i,
  /\bmarket cap\s*&\s*chart\b/i,
  /\bprice,?\s*chart\b/i,
];

const PREFERRED_REPORTING_SOURCES =
  /\b(reuters|bloomberg|coindesk|the block|theblock|decrypt|cointelegraph|dl news|dlnews|blockworks|unchained|fortune|wsj|financial times|techcrunch|beincrypto|cryptoslate|defiant|wired|cnbc|axios)\b/i;

function titleTokens(title: string): Set<string> {
  const norm = title
    .toLowerCase()
    .replace(/\s+[-|–—]\s+[^-|–—]+$/, '')
    .replace(/[^a-z0-9\s]/g, ' ');
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'as', 'is', 'at', 'by']);
  return new Set(
    norm
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stop.has(w)),
  );
}

function areTitlesNearIdentical(a: string, b: string): boolean {
  const normA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normB = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normA || !normB) return false;
  if (normA === normB || normA.includes(normB) || normB.includes(normA)) return true;
  const tokA = titleTokens(a);
  const tokB = titleTokens(b);
  if (tokA.size === 0 || tokB.size === 0) return false;
  let overlap = 0;
  for (const t of tokA) {
    if (tokB.has(t)) overlap++;
  }
  const union = new Set([...tokA, ...tokB]).size;
  return union > 0 && overlap / union >= 0.68;
}

function filterAndRankNews(rawItems: NewsItem[]): NewsItem[] {
  const filtered = rawItems.filter((item) => {
    const title = item.title || '';
    const url = item.url || '';
    const source = item.source || '';
    if (PRICE_LISTING_URL_PATTERNS.some((re) => re.test(url))) return false;
    if (PRICE_LISTING_TITLE_PATTERNS.some((re) => re.test(title))) return false;
    if (/^(coinmarketcap|cryptorank|coingecko)$/i.test(source.trim())) return false;
    return title.trim().length > 10;
  });

  // Sort reporting outlets higher while keeping recent articles fresh
  const scored = filtered.map((item) => {
    const ts = Date.parse(item.publishedAt);
    const recencyScore = Number.isFinite(ts) ? ts : 0;
    const isReporting =
      PREFERRED_REPORTING_SOURCES.test(item.source) ||
      PREFERRED_REPORTING_SOURCES.test(item.url);
    return { item, recencyScore, isReporting };
  });

  scored.sort((a, b) => {
    if (a.isReporting !== b.isReporting) return a.isReporting ? -1 : 1;
    return b.recencyScore - a.recencyScore;
  });

  const deduped: NewsItem[] = [];
  for (const entry of scored) {
    const duplicate = deduped.some((kept) => areTitlesNearIdentical(kept.title, entry.item.title));
    if (!duplicate) {
      deduped.push(entry.item);
    }
    if (deduped.length >= 6) break;
  }

  return deduped;
}

function sanitizeNoAdviceText(raw: string): string {
  return raw
    .replace(/\b(buy|sell|safe|scam)\b/gi, '[redacted]')
    .replace(/\bgo for it\b/gi, 'review independently')
    .trim();
}

function formatCompactUsdServer(val: unknown): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return 'N/A';
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${Math.round(num).toLocaleString()}`;
}

function buildDeterministicRecapServer(summaryPayload: Record<string, unknown>): string {
  const liqObj = (summaryPayload.liquidity as Record<string, unknown> | null) ?? null;
  const mktObj = (summaryPayload.market as Record<string, unknown> | null) ?? null;
  const linksObj = (summaryPayload.links as Record<string, unknown> | null) ?? null;

  const liqText =
    liqObj && liqObj.liquidityUsd !== null && liqObj.liquidityUsd !== undefined
      ? formatCompactUsdServer(liqObj.liquidityUsd)
      : 'N/A';
  const volText =
    mktObj && mktObj.volume24hUsd !== null && mktObj.volume24hUsd !== undefined
      ? formatCompactUsdServer(mktObj.volume24hUsd)
      : 'N/A';
  const top10Val = liqObj?.top10HolderPct;
  const top10Text =
    typeof top10Val === 'number' && Number.isFinite(top10Val)
      ? `${top10Val}%`
      : 'not reported';
  const claimedCount = Number(linksObj?.claimedCount ?? 0);
  const resolvedCount = Number(linksObj?.resolvedCount ?? 0);
  const linksText =
    claimedCount > 0 ? `${claimedCount} (${resolvedCount} resolved)` : 'none';
  const flagsObserved = Number(summaryPayload.flagsObserved ?? 0);

  return `Liquidity ${liqText} · 24h volume ${volText} · Top-10 holders ${top10Text} · Links claimed: ${linksText} · Flags observed: ${Number.isFinite(flagsObserved) ? flagsObserved : 0}.`;
}

export function createLabRouter(): Router {
  const router = express.Router();

  // Resolve any input (contract, ticker, X handle, DexScreener/Pump.fun URL) to candidate pairs
  router.get('/resolve', async (req, res) => {
    const rawQ = String(req.query.q || '').trim();
    if (!rawQ || rawQ.length > 200) {
      return res.status(400).json({ error: 'Provide a valid contract address, ticker, handle, or URL.' });
    }

    // Detect input type server-side
    let endpoint = '';
    let detectedType = 'ticker_query';
    let normalized = rawQ;

    const dexMatch = rawQ.match(/dexscreener\.com\/([a-z0-9_-]+)\/([a-zA-Z0-9]+)/i);
    const pumpMatch = rawQ.match(/pump\.fun\/(?:coin\/)?([1-9A-HJ-NP-Za-km-z]{32,44})/i);

    if (dexMatch) {
      detectedType = 'dexscreener_url';
      const chain = dexMatch[1];
      const addr = dexMatch[2];
      normalized = `${chain}/${addr}`;
      endpoint = `https://api.dexscreener.com/latest/dex/pairs/${encodeURIComponent(chain)}/${encodeURIComponent(addr)}`;
    } else if (pumpMatch) {
      detectedType = 'pumpfun_url';
      normalized = pumpMatch[1];
      endpoint = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(normalized)}`;
    } else if (/^0x[a-fA-F0-9]{40}$/.test(rawQ)) {
      detectedType = 'evm_address';
      endpoint = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(rawQ)}`;
    } else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(rawQ)) {
      detectedType = 'solana_address';
      endpoint = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(rawQ)}`;
    } else if (/^0x[a-fA-F0-9]+$/i.test(rawQ)) {
      return res.status(400).json({
        error: 'Incomplete or malformed EVM address. Expected 42 characters starting with 0x.',
      });
    } else if (/^@[a-zA-Z0-9_]{1,30}$/.test(rawQ)) {
      detectedType = 'x_handle';
      normalized = rawQ.slice(1);
      endpoint = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(normalized)}`;
    } else {
      const cleaned = rawQ.replace(/^\$/, '').trim();
      normalized = cleaned;
      endpoint = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(cleaned)}`;
    }

    const { data, status } = await fetchJsonWithRetry<{
      pairs?: DexScreenerPairRaw[] | null;
      pair?: DexScreenerPairRaw | null;
    }>('DexScreener', endpoint);

    // Fallback to tokens search if dexscreener link was actually a token address rather than pair address
    let rawPairs: DexScreenerPairRaw[] = [];
    if (data?.pairs && Array.isArray(data.pairs)) {
      rawPairs = data.pairs;
    } else if (data?.pair) {
      rawPairs = [data.pair];
    } else if (dexMatch && isValidTokenAddress(dexMatch[2])) {
      const fallback = await fetchJsonWithRetry<{ pairs?: DexScreenerPairRaw[] | null }>(
        'DexScreener',
        `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(dexMatch[2])}`,
      );
      if (fallback.data?.pairs) rawPairs = fallback.data.pairs;
    }

    const candidates = rawPairs
      .filter((p) => p.baseToken?.address && p.pairAddress)
      .map(mapDexPair)
      .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
      .slice(0, 12);

    return res.json({
      detectedType,
      normalizedQuery: normalized,
      candidates,
      sourceStatus: status,
    });
  });

  // Stage 1: Identity
  router.get('/stage/1', async (req, res) => {
    const chainId = String(req.query.chain || '').trim();
    const address = String(req.query.address || '').trim();
    const pairAddress = String(req.query.pairAddress || '').trim();

    if (!isValidChainId(chainId) || !isValidTokenAddress(address)) {
      return res.status(400).json({ error: 'Invalid chain or token address.' });
    }

    const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`;
    const dexRes = await fetchJsonWithRetry<{ pairs?: DexScreenerPairRaw[] | null }>('DexScreener', dexUrl);
    const sources: SourceStatus[] = [dexRes.status];

    if (!dexRes.status.ok) {
      const errResp: StageResponse<Stage1IdentityData> = {
        stage: 1,
        title: 'Identity',
        ok: false,
        data: null,
        findings: [
          {
            id: `s1_err_${Date.now()}`,
            stage: 1,
            timestamp: nowTimeTag(),
            severity: 'ERR',
            label: 'Identity lookup failed',
            summary: dexRes.status.error || 'DexScreener unavailable',
            rawValue: JSON.stringify(dexRes.status),
            sourceName: 'DexScreener',
            sourceUrl: dexUrl,
          },
        ],
        sources,
        error: dexRes.status.error || 'Stage 1 unavailable, source timed out',
        fetchedAt: Date.now(),
      };
      return res.json(errResp);
    }

    const pairs = dexRes.data?.pairs || [];
    const targetPair =
      pairs.find((p) => p.pairAddress === pairAddress) ||
      pairs.find((p) => p.chainId === chainId) ||
      pairs[0];

    const symbol = targetPair?.baseToken?.symbol || String(req.query.symbol || 'UNKNOWN');
    const name = targetPair?.baseToken?.name || String(req.query.name || 'Unknown Token');
    const createdAt = targetPair?.pairCreatedAt || null;
    const ageHours = createdAt ? Math.max(0, Math.round((Date.now() - createdAt) / 3600000)) : null;

    // Duplicate ticker check via DexScreener search
    const dupUrl = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`;
    const dupRes = await fetchJsonWithRetry<{ pairs?: DexScreenerPairRaw[] | null }>(
      'DexScreener Search',
      dupUrl,
    );
    sources.push(dupRes.status);

    const uniqueAddresses = new Set<string>();
    (dupRes.data?.pairs || []).forEach((p) => {
      if (
        p.baseToken?.symbol?.toLowerCase() === symbol.toLowerCase() &&
        p.baseToken?.address &&
        p.baseToken.address.toLowerCase() !== address.toLowerCase()
      ) {
        uniqueAddresses.add(p.baseToken.address.toLowerCase());
      }
    });

    // CoinGecko optional metadata
    let coingeckoId: string | null = null;
    let coingeckoRank: number | null = null;
    const cgPlatform = COINGECKO_PLATFORM_MAP[chainId.toLowerCase()];
    if (cgPlatform) {
      const cgHeaders: Record<string, string> = {};
      if (process.env.COINGECKO_API_KEY) {
        cgHeaders['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
      }
      const cgUrl = `https://api.coingecko.com/api/v3/coins/${cgPlatform}/contract/${encodeURIComponent(address)}`;
      const cgRes = await fetchJsonWithRetry<{ id?: string; market_cap_rank?: number }>(
        'CoinGecko',
        cgUrl,
        { headers: cgHeaders },
        0,
      );
      sources.push(cgRes.status);
      if (cgRes.data?.id) {
        coingeckoId = cgRes.data.id;
        coingeckoRank = cgRes.data.market_cap_rank ?? null;
      }
    }

    const data: Stage1IdentityData = {
      name,
      symbol,
      address,
      chainId: targetPair?.chainId || chainId,
      pairAddress: targetPair?.pairAddress || pairAddress,
      dexId: targetPair?.dexId || 'unknown',
      ageHours,
      pairCreatedAt: createdAt,
      duplicateTickerCount: uniqueAddresses.size,
      coingeckoId,
      coingeckoRank,
      fdv: typeof targetPair?.fdv === 'number' ? targetPair.fdv : null,
      marketCap: typeof targetPair?.marketCap === 'number' ? targetPair.marketCap : null,
    };

    const ts = nowTimeTag();
    const pairLink = targetPair?.url || `https://dexscreener.com/${chainId}/${address}`;
    const findings: TerminalFinding[] = [
      {
        id: `s1_meta_${Date.now()}`,
        stage: 1,
        timestamp: ts,
        severity: 'INFO',
        label: 'Token identity',
        summary: `${name} (${symbol}) on ${data.chainId} via ${data.dexId}`,
        rawValue: JSON.stringify({ address, pairAddress: data.pairAddress, chainId: data.chainId }),
        sourceName: 'DexScreener',
        sourceUrl: pairLink,
      },
      {
        id: `s1_age_${Date.now()}`,
        stage: 1,
        timestamp: ts,
        severity: ageHours !== null && ageHours < 24 ? 'FLAG' : 'INFO',
        label: 'Pair age',
        summary:
          ageHours === null
            ? 'Pair creation timestamp: not reported'
            : ageHours < 24
              ? `Pair age: ${ageHours}h (newly deployed < 24h)`
              : `Pair age: ${Math.floor(ageHours / 24)}d (${ageHours}h)`,
        rawValue: JSON.stringify({ pairCreatedAt: createdAt, ageHours }),
        sourceName: 'DexScreener',
        sourceUrl: pairLink,
      },
      {
        id: `s1_dup_${Date.now()}`,
        stage: 1,
        timestamp: ts,
        severity: uniqueAddresses.size > 0 ? 'FLAG' : 'INFO',
        label: 'Ticker uniqueness',
        summary:
          uniqueAddresses.size > 0
            ? `Ticker ${symbol} shared by ${uniqueAddresses.size} other contract(s)`
            : `No duplicate ${symbol} contracts in top search results`,
        rawValue: JSON.stringify({ duplicateContracts: uniqueAddresses.size }),
        sourceName: 'DexScreener Search',
        sourceUrl: `https://dexscreener.com/search?q=${encodeURIComponent(symbol)}`,
      },
    ];

    if (coingeckoId) {
      findings.push({
        id: `s1_cg_${Date.now()}`,
        stage: 1,
        timestamp: ts,
        severity: 'INFO',
        label: 'CoinGecko listing',
        summary: `Listed on CoinGecko (${coingeckoId}${coingeckoRank ? `, rank #${coingeckoRank}` : ''})`,
        rawValue: JSON.stringify({ coingeckoId, coingeckoRank }),
        sourceName: 'CoinGecko',
        sourceUrl: `https://www.coingecko.com/en/coins/${coingeckoId}`,
      });
    }

    return res.json({
      stage: 1,
      title: 'Identity',
      ok: true,
      data,
      findings,
      sources,
      fetchedAt: Date.now(),
    } satisfies StageResponse<Stage1IdentityData>);
  });

  // Stage 2: Contract safety (RugCheck for Solana, GoPlus for EVM)
  router.get('/stage/2', async (req, res) => {
    const chainId = String(req.query.chain || '').trim().toLowerCase();
    const address = String(req.query.address || '').trim();

    if (!isValidChainId(chainId) || !isValidTokenAddress(address)) {
      return res.status(400).json({ error: 'Invalid chain or token address.' });
    }

    const ts = nowTimeTag();

    if (chainId === 'solana') {
      const rugUrl = `https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(address)}/report`;
      const rugRes = await fetchJsonWithRetry<{
        mintAuthority?: string | null;
        freezeAuthority?: string | null;
        tokenMeta?: { mutable?: boolean };
        score?: number;
        risks?: { name?: string; level?: string; description?: string }[];
      }>('RugCheck', rugUrl);

      if (!rugRes.status.ok || !rugRes.data) {
        return res.json({
          stage: 2,
          title: 'Contract safety',
          ok: false,
          data: null,
          findings: [
            {
              id: `s2_err_${Date.now()}`,
              stage: 2,
              timestamp: ts,
              severity: 'ERR',
              label: 'RugCheck unavailable',
              summary: rugRes.status.error || 'Stage 2 unavailable, source timed out',
              rawValue: JSON.stringify(rugRes.status),
              sourceName: 'RugCheck',
              sourceUrl: `https://rugcheck.xyz/tokens/${address}`,
            },
          ],
          sources: [rugRes.status],
          error: rugRes.status.error || 'Stage 2 unavailable, source timed out',
          fetchedAt: Date.now(),
        } satisfies StageResponse<Stage2SafetyData>);
      }

      const d = rugRes.data;
      const mintActive = Boolean(d.mintAuthority);
      const freezeActive = Boolean(d.freezeAuthority);
      const mutableMeta = typeof d.tokenMeta?.mutable === 'boolean' ? d.tokenMeta.mutable : null;
      const risks = (d.risks || []).map((r) => ({
        name: String(r.name || 'Risk'),
        level: String(r.level || 'info'),
        description: String(r.description || ''),
      }));

      const data: Stage2SafetyData = {
        chainType: 'solana',
        supported: true,
        mintAuthorityStatus: mintActive ? 'Active' : 'Revoked',
        freezeAuthorityStatus: freezeActive ? 'Active' : 'Revoked',
        mutableMetadata: mutableMeta,
        rugcheckScore: typeof d.score === 'number' ? d.score : null,
        rugcheckRisks: risks,
      };

      const rugPage = `https://rugcheck.xyz/tokens/${address}`;
      const findings: TerminalFinding[] = [
        {
          id: `s2_mint_${Date.now()}`,
          stage: 2,
          timestamp: ts,
          severity: mintActive ? 'FLAG' : 'INFO',
          label: 'Mint authority',
          summary: mintActive
            ? `Mint authority active (${d.mintAuthority})`
            : 'Mint authority: revoked',
          rawValue: JSON.stringify({ mintAuthority: d.mintAuthority ?? null }),
          sourceName: 'RugCheck',
          sourceUrl: rugPage,
        },
        {
          id: `s2_freeze_${Date.now()}`,
          stage: 2,
          timestamp: ts,
          severity: freezeActive ? 'FLAG' : 'INFO',
          label: 'Freeze authority',
          summary: freezeActive
            ? `Freeze authority active (${d.freezeAuthority})`
            : 'Freeze authority: revoked',
          rawValue: JSON.stringify({ freezeAuthority: d.freezeAuthority ?? null }),
          sourceName: 'RugCheck',
          sourceUrl: rugPage,
        },
        {
          id: `s2_mut_${Date.now()}`,
          stage: 2,
          timestamp: ts,
          severity: mutableMeta === true ? 'WARN' : 'INFO',
          label: 'Token metadata',
          summary:
            mutableMeta === true
              ? 'Metadata mutability: mutable'
              : mutableMeta === false
                ? 'Metadata mutability: immutable'
                : 'Metadata mutability: not reported',
          rawValue: JSON.stringify({ mutable: mutableMeta, risksCount: risks.length }),
          sourceName: 'RugCheck',
          sourceUrl: rugPage,
        },
      ];

      return res.json({
        stage: 2,
        title: 'Contract safety',
        ok: true,
        data,
        findings,
        sources: [rugRes.status],
        fetchedAt: Date.now(),
      } satisfies StageResponse<Stage2SafetyData>);
    }

    // EVM via GoPlus
    const goPlusChain = GOPLUS_CHAIN_MAP[chainId];
    if (!goPlusChain) {
      const data: Stage2SafetyData = {
        chainType: 'unsupported',
        supported: false,
        unsupportedReason: `Contract security scanner does not support chain "${chainId}" yet.`,
      };
      return res.json({
        stage: 2,
        title: 'Contract safety',
        ok: true,
        data,
        findings: [
          {
            id: `s2_unsup_${Date.now()}`,
            stage: 2,
            timestamp: ts,
            severity: 'WARN',
            label: 'Chain support',
            summary: `Contract audit not available for chain "${chainId}"`,
            rawValue: JSON.stringify({ chainId }),
            sourceName: 'GoPlus Security',
            sourceUrl: 'https://gopluslabs.io/',
          },
        ],
        sources: [
          {
            source: 'GoPlus Security',
            ok: false,
            latencyMs: 0,
            cached: false,
            error: `Unsupported chain: ${chainId}`,
          },
        ],
        fetchedAt: Date.now(),
      } satisfies StageResponse<Stage2SafetyData>);
    }

    const gpUrl = `https://api.gopluslabs.io/api/v1/token_security/${goPlusChain}?contract_addresses=${encodeURIComponent(address.toLowerCase())}`;
    const gpRes = await fetchJsonWithRetry<{
      result?: Record<string, Record<string, unknown>>;
    }>('GoPlus Security', gpUrl);

    if (!gpRes.status.ok || !gpRes.data?.result) {
      return res.json({
        stage: 2,
        title: 'Contract safety',
        ok: false,
        data: null,
        findings: [
          {
            id: `s2_gperr_${Date.now()}`,
            stage: 2,
            timestamp: ts,
            severity: 'ERR',
            label: 'GoPlus unavailable',
            summary: gpRes.status.error || 'Stage 2 unavailable, source timed out',
            rawValue: JSON.stringify(gpRes.status),
            sourceName: 'GoPlus Security',
            sourceUrl: `https://gopluslabs.io/token-security/${goPlusChain}/${address}`,
          },
        ],
        sources: [gpRes.status],
        error: gpRes.status.error || 'Stage 2 unavailable, source timed out',
        fetchedAt: Date.now(),
      } satisfies StageResponse<Stage2SafetyData>);
    }

    const tokenData = gpRes.data.result[address.toLowerCase()] || Object.values(gpRes.data.result)[0] || {};
    const buyTax = tokenData.buy_tax !== undefined ? Number(tokenData.buy_tax) * 100 : null;
    const sellTax = tokenData.sell_tax !== undefined ? Number(tokenData.sell_tax) * 100 : null;
    const honeypot = tokenData.is_honeypot === '1' ? true : tokenData.is_honeypot === '0' ? false : null;
    const openSource = tokenData.is_open_source === '1' ? true : tokenData.is_open_source === '0' ? false : null;
    const isProxy = tokenData.is_proxy === '1' ? true : tokenData.is_proxy === '0' ? false : null;
    const isBlacklisted = tokenData.is_blacklisted === '1' ? true : tokenData.is_blacklisted === '0' ? false : null;
    const isMintable = tokenData.is_mintable === '1' ? true : tokenData.is_mintable === '0' ? false : null;
    const ownerAddr = String(tokenData.owner_address || '');
    const renounced =
      ownerAddr === '' ||
      ownerAddr === '0x0000000000000000000000000000000000000000' ||
      ownerAddr === '0x000000000000000000000000000000000000dead';

    const data: Stage2SafetyData = {
      chainType: 'evm',
      supported: true,
      isOpenSource: openSource,
      isHoneypot: honeypot,
      buyTaxPct: buyTax !== null && Number.isFinite(buyTax) ? Number(buyTax.toFixed(2)) : null,
      sellTaxPct: sellTax !== null && Number.isFinite(sellTax) ? Number(sellTax.toFixed(2)) : null,
      ownershipRenounced: renounced,
      isProxy,
      isBlacklisted,
      isMintable,
    };

    const gpPage = `https://gopluslabs.io/token-security/${goPlusChain}/${address}`;
    const findings: TerminalFinding[] = [
      {
        id: `s2_hp_${Date.now()}`,
        stage: 2,
        timestamp: ts,
        severity: honeypot ? 'FLAG' : 'INFO',
        label: 'Honeypot simulation',
        summary: honeypot === true ? 'Honeypot behavior: Flag observed' : 'Honeypot behavior: Not detected',
        rawValue: JSON.stringify({ is_honeypot: tokenData.is_honeypot, is_open_source: tokenData.is_open_source }),
        sourceName: 'GoPlus Security',
        sourceUrl: gpPage,
      },
      {
        id: `s2_tax_${Date.now()}`,
        stage: 2,
        timestamp: ts,
        severity: (data.buyTaxPct ?? 0) > 5 || (data.sellTaxPct ?? 0) > 5 ? 'FLAG' : 'INFO',
        label: 'Transfer taxes',
        summary: `Entry tax: ${data.buyTaxPct ?? 'N/A'}% · Exit tax: ${data.sellTaxPct ?? 'N/A'}%`,
        rawValue: JSON.stringify({ buyTaxPct: data.buyTaxPct, sellTaxPct: data.sellTaxPct }),
        sourceName: 'GoPlus Security',
        sourceUrl: gpPage,
      },
      {
        id: `s2_own_${Date.now()}`,
        stage: 2,
        timestamp: ts,
        severity: !renounced || isProxy || isBlacklisted ? 'FLAG' : 'INFO',
        label: 'Ownership & permissions',
        summary: `Owner renounced: ${renounced ? 'yes' : 'not detected'} · Proxy: ${isProxy ? 'observed' : 'not detected'} · Blacklist: ${isBlacklisted ? 'observed' : 'not detected'}`,
        rawValue: JSON.stringify({ owner_address: ownerAddr, isProxy, isBlacklisted, isMintable }),
        sourceName: 'GoPlus Security',
        sourceUrl: gpPage,
      },
    ];

    return res.json({
      stage: 2,
      title: 'Contract safety',
      ok: true,
      data,
      findings,
      sources: [gpRes.status],
      fetchedAt: Date.now(),
    } satisfies StageResponse<Stage2SafetyData>);
  });

  // Stage 3: Liquidity and holders
  router.get('/stage/3', async (req, res) => {
    const chainId = String(req.query.chain || '').trim().toLowerCase();
    const address = String(req.query.address || '').trim();
    const pairAddress = String(req.query.pairAddress || '').trim();

    if (!isValidChainId(chainId) || !isValidTokenAddress(address)) {
      return res.status(400).json({ error: 'Invalid chain or token address.' });
    }

    const ts = nowTimeTag();
    const sources: SourceStatus[] = [];

    const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`;
    const dexRes = await fetchJsonWithRetry<{ pairs?: DexScreenerPairRaw[] | null }>('DexScreener', dexUrl);
    sources.push(dexRes.status);

    const pairs = dexRes.data?.pairs || [];
    const targetPair =
      pairs.find((p) => p.pairAddress === pairAddress) ||
      pairs.find((p) => p.chainId?.toLowerCase() === chainId) ||
      pairs[0];

    const liquidityUsd = Number(targetPair?.liquidity?.usd || 0);
    let lpLockedOrBurnedPct: number | null = null;
    let lpLockDetected: boolean | null = null;
    let top10HolderPct: number | null = null;
    let deployerSharePct: number | null = null;
    let holderCount: number | null = null;
    let holderSourceName = chainId === 'solana' ? 'RugCheck/DexScreener' : 'GoPlus/DexScreener';
    let holderSourceUrl =
      chainId === 'solana'
        ? `https://rugcheck.xyz/tokens/${address}`
        : `https://dexscreener.com/${chainId}/${address}`;
    let topHolders: { address: string; pct: number; isInsider?: boolean }[] = [];
    let extraProviderUsed: string | null = null;

    if (chainId === 'solana') {
      const rugUrl = `https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(address)}/report`;
      const rugRes = await fetchJsonWithRetry<{
        creator?: string;
        topHolders?: { address?: string; pct?: number; insider?: boolean }[];
        markets?: { pubkey?: string; lp?: { lpLockedPct?: number } }[];
      }>('RugCheck', rugUrl);
      sources.push(rugRes.status);

      if (rugRes.data) {
        const holders = rugRes.data.topHolders || [];
        topHolders = holders.slice(0, 10).map((h) => ({
          address: String(h.address || ''),
          pct: Number((Number(h.pct || 0)).toFixed(2)),
          isInsider: Boolean(h.insider),
        }));
        if (topHolders.length > 0) {
          top10HolderPct = Number(
            topHolders.reduce((acc, h) => acc + h.pct, 0).toFixed(2),
          );
        }
        const creator = rugRes.data.creator;
        if (creator) {
          const creatorRow = holders.find((h) => h.address === creator);
          deployerSharePct = creatorRow ? Number(Number(creatorRow.pct || 0).toFixed(2)) : 0;
        }
        const lpPcts = (rugRes.data.markets || [])
          .map((m) => m.lp?.lpLockedPct)
          .filter((v): v is number => typeof v === 'number');
        if (lpPcts.length > 0) {
          const maxLock = Math.max(...lpPcts);
          lpLockedOrBurnedPct = Number(maxLock.toFixed(1));
          lpLockDetected = maxLock > 50;
        }
      }

      // Optional Helius or Birdeye holder telemetry if configured
      if (process.env.BIRDEYE_API_KEY) {
        const beUrl = `https://public-api.birdeye.so/defi/token_overview?address=${encodeURIComponent(address)}`;
        const beRes = await fetchJsonWithRetry<{ data?: { holder?: number } }>(
          'Birdeye',
          beUrl,
          { headers: { 'X-API-KEY': process.env.BIRDEYE_API_KEY } },
          0,
        );
        sources.push(beRes.status);
        if (typeof beRes.data?.data?.holder === 'number') {
          holderCount = beRes.data.data.holder;
          extraProviderUsed = 'Birdeye';
          holderSourceName = 'Birdeye';
          holderSourceUrl = `https://birdeye.so/token/${address}?chain=solana`;
        }
      } else if (process.env.HELIUS_API_KEY) {
        const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(process.env.HELIUS_API_KEY)}`;
        const hRes = await fetchJsonWithRetry<{ result?: { value?: unknown[] } }>(
          'Helius',
          heliusUrl,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getTokenLargestAccounts',
              params: [address],
            }),
          },
          0,
        );
        sources.push(hRes.status);
        if (hRes.data?.result?.value) {
          extraProviderUsed = 'Helius';
        }
      }
    } else {
      const goPlusChain = GOPLUS_CHAIN_MAP[chainId];
      if (goPlusChain) {
        const gpUrl = `https://api.gopluslabs.io/api/v1/token_security/${goPlusChain}?contract_addresses=${encodeURIComponent(address.toLowerCase())}`;
        const gpRes = await fetchJsonWithRetry<{
          result?: Record<
            string,
            {
              holder_count?: string;
              creator_percent?: string;
              creator_address?: string;
              holders?: { address?: string; percent?: string; is_locked?: number }[];
              lp_holders?: { percent?: string; is_locked?: number }[];
            }
          >;
        }>('GoPlus Security', gpUrl);
        sources.push(gpRes.status);

        const tData = gpRes.data?.result?.[address.toLowerCase()] || Object.values(gpRes.data?.result || {})[0];
        holderSourceName = 'GoPlus/DexScreener';
        holderSourceUrl = `https://gopluslabs.io/token-security/${goPlusChain}/${address}`;
        if (tData) {
          holderCount = tData.holder_count ? Number(tData.holder_count) : null;
          deployerSharePct = tData.creator_percent
            ? Number((Number(tData.creator_percent) * 100).toFixed(2))
            : null;
          topHolders = (tData.holders || []).slice(0, 10).map((h) => ({
            address: String(h.address || ''),
            pct: Number((Number(h.percent || 0) * 100).toFixed(2)),
          }));
          if (topHolders.length > 0) {
            top10HolderPct = Number(topHolders.reduce((acc, h) => acc + h.pct, 0).toFixed(2));
          }
          const lockedLp = (tData.lp_holders || [])
            .filter((lp) => lp.is_locked === 1)
            .reduce((acc, lp) => acc + Number(lp.percent || 0) * 100, 0);
          if ((tData.lp_holders || []).length > 0) {
            lpLockedOrBurnedPct = Number(Math.min(100, lockedLp).toFixed(1));
            lpLockDetected = lpLockedOrBurnedPct > 50;
          }
        }
      }
    }

    const anySourceOk = sources.some((s) => s.ok);
    if (!anySourceOk) {
      return res.json({
        stage: 3,
        title: 'Liquidity and holders',
        ok: false,
        data: null,
        findings: [
          {
            id: `s3_err_${Date.now()}`,
            stage: 3,
            timestamp: ts,
            severity: 'ERR',
            label: 'Liquidity telemetry failed',
            summary: 'Stage 3 unavailable, source timed out',
            rawValue: JSON.stringify(sources),
            sourceName: 'DexScreener / Security API',
            sourceUrl: dexUrl,
          },
        ],
        sources,
        error: 'Stage 3 unavailable, source timed out',
        fetchedAt: Date.now(),
      } satisfies StageResponse<Stage3LiquidityData>);
    }

    const data: Stage3LiquidityData = {
      liquidityUsd,
      lpLockedOrBurnedPct,
      lpLockDetected,
      top10HolderPct,
      deployerSharePct,
      holderCount,
      holderSourceName,
      holderSourceUrl,
      topHolders,
      extraProviderUsed,
    };

    const refUrl = targetPair?.url || `https://dexscreener.com/${chainId}/${address}`;
    const findings: TerminalFinding[] = [
      {
        id: `s3_liq_${Date.now()}`,
        stage: 3,
        timestamp: ts,
        severity: liquidityUsd < 10_000 ? 'FLAG' : 'INFO',
        label: 'Pool liquidity',
        summary: `Liquidity USD: $${Math.round(liquidityUsd).toLocaleString()}`,
        rawValue: JSON.stringify({ liquidityUsd }),
        sourceName: 'DexScreener',
        sourceUrl: refUrl,
      },
      {
        id: `s3_lp_${Date.now()}`,
        stage: 3,
        timestamp: ts,
        severity: lpLockDetected === false ? 'FLAG' : 'INFO',
        label: 'LP lock / burn',
        summary:
          lpLockedOrBurnedPct !== null
            ? `Liquidity locked/burned: ${lpLockedOrBurnedPct}%`
            : 'Liquidity locked: not detected',
        rawValue: JSON.stringify({ lpLockedOrBurnedPct, lpLockDetected }),
        sourceName: chainId === 'solana' ? 'RugCheck' : 'GoPlus Security',
        sourceUrl:
          chainId === 'solana'
            ? `https://rugcheck.xyz/tokens/${address}`
            : `https://gopluslabs.io/`,
      },
      {
        id: `s3_top10_${Date.now()}`,
        stage: 3,
        timestamp: ts,
        severity: top10HolderPct !== null && top10HolderPct > 35 ? 'FLAG' : 'INFO',
        label: 'Holder concentration',
        summary:
          top10HolderPct !== null
            ? `Top 10 holders control ${top10HolderPct}%${holderCount ? ` · Holders: ${holderCount.toLocaleString()}` : ''}`
            : 'Top 10 holder distribution: not reported',
        rawValue: JSON.stringify({ top10HolderPct, deployerSharePct, holderCount }),
        sourceName: chainId === 'solana' ? 'RugCheck' : 'GoPlus Security',
        sourceUrl:
          chainId === 'solana'
            ? `https://rugcheck.xyz/tokens/${address}`
            : `https://gopluslabs.io/`,
      },
    ];

    return res.json({
      stage: 3,
      title: 'Liquidity and holders',
      ok: true,
      data,
      findings,
      sources,
      fetchedAt: Date.now(),
    } satisfies StageResponse<Stage3LiquidityData>);
  });

  // Stage 4: Market activity
  router.get('/stage/4', async (req, res) => {
    const chainId = String(req.query.chain || '').trim().toLowerCase();
    const address = String(req.query.address || '').trim();
    const pairAddress = String(req.query.pairAddress || '').trim();

    if (!isValidChainId(chainId) || !isValidTokenAddress(address)) {
      return res.status(400).json({ error: 'Invalid chain or token address.' });
    }

    const ts = nowTimeTag();
    const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`;
    const dexRes = await fetchJsonWithRetry<{ pairs?: DexScreenerPairRaw[] | null }>('DexScreener', dexUrl);

    if (!dexRes.status.ok || !dexRes.data) {
      return res.json({
        stage: 4,
        title: 'Market activity',
        ok: false,
        data: null,
        findings: [
          {
            id: `s4_err_${Date.now()}`,
            stage: 4,
            timestamp: ts,
            severity: 'ERR',
            label: 'Market activity failed',
            summary: dexRes.status.error || 'Stage 4 unavailable, source timed out',
            rawValue: JSON.stringify(dexRes.status),
            sourceName: 'DexScreener',
            sourceUrl: dexUrl,
          },
        ],
        sources: [dexRes.status],
        error: dexRes.status.error || 'Stage 4 unavailable, source timed out',
        fetchedAt: Date.now(),
      } satisfies StageResponse<Stage4MarketData>);
    }

    const pairs = dexRes.data.pairs || [];
    const targetPair =
      pairs.find((p) => p.pairAddress === pairAddress) ||
      pairs.find((p) => p.chainId?.toLowerCase() === chainId) ||
      pairs[0];

    const volume24h = Number(targetPair?.volume?.h24 || 0);
    const liquidityUsd = Number(targetPair?.liquidity?.usd || 0);
    const ratio = liquidityUsd > 0 ? Number((volume24h / liquidityUsd).toFixed(2)) : null;
    const washHint = ratio !== null && ratio > 8;

    const buys24 = Number(targetPair?.txns?.h24?.buys || 0);
    const sells24 = Number(targetPair?.txns?.h24?.sells || 0);
    const buySellRatio = sells24 > 0 ? Number((buys24 / sells24).toFixed(2)) : null;

    const data: Stage4MarketData = {
      priceUsd: targetPair?.priceUsd ? Number(targetPair.priceUsd) : null,
      volume24hUsd: volume24h,
      liquidityUsd,
      volumeToLiquidityRatio: ratio,
      washTradingHint: washHint,
      buySellRatio24h: buySellRatio,
      priceChange: {
        m5: typeof targetPair?.priceChange?.m5 === 'number' ? targetPair.priceChange.m5 : null,
        h1: typeof targetPair?.priceChange?.h1 === 'number' ? targetPair.priceChange.h1 : null,
        h6: typeof targetPair?.priceChange?.h6 === 'number' ? targetPair.priceChange.h6 : null,
        h24: typeof targetPair?.priceChange?.h24 === 'number' ? targetPair.priceChange.h24 : null,
      },
      txns: (['m5', 'h1', 'h6', 'h24'] as const).map((w) => ({
        window: w === 'm5' ? '5m' : w === 'h1' ? '1h' : w === 'h6' ? '6h' : '24h',
        buys: Number(targetPair?.txns?.[w]?.buys || 0),
        sells: Number(targetPair?.txns?.[w]?.sells || 0),
      })),
    };

    const refUrl = targetPair?.url || `https://dexscreener.com/${chainId}/${address}`;
    const findings: TerminalFinding[] = [
      {
        id: `s4_vol_${Date.now()}`,
        stage: 4,
        timestamp: ts,
        severity: washHint ? 'FLAG' : 'INFO',
        label: 'Volume vs liquidity',
        summary: `24h Vol: $${Math.round(volume24h).toLocaleString()} (${ratio ?? 'N/A'}x liquidity${washHint ? ' — elevated turnover hint' : ''})`,
        rawValue: JSON.stringify({ volume24h, liquidityUsd, ratio, washHint }),
        sourceName: 'DexScreener',
        sourceUrl: refUrl,
      },
      {
        id: `s4_tx_${Date.now()}`,
        stage: 4,
        timestamp: ts,
        severity: 'INFO',
        label: '24h orderflow',
        summary: `Inflow txns: ${buys24.toLocaleString()} · Outflow txns: ${sells24.toLocaleString()} · 24h delta: ${data.priceChange.h24 ?? 'N/A'}%`,
        rawValue: JSON.stringify({ txns: data.txns, priceChange: data.priceChange }),
        sourceName: 'DexScreener',
        sourceUrl: refUrl,
      },
    ];

    return res.json({
      stage: 4,
      title: 'Market activity',
      ok: true,
      data,
      findings,
      sources: [dexRes.status],
      fetchedAt: Date.now(),
    } satisfies StageResponse<Stage4MarketData>);
  });

  // Stage 5: Narrative and social (official links check, News RSS/GNews/NewsAPI, X API v2)
  router.get('/stage/5', async (req, res) => {
    const chainId = String(req.query.chain || '').trim().toLowerCase();
    const address = String(req.query.address || '').trim();
    const symbol = String(req.query.symbol || '').trim();
    const name = String(req.query.name || '').trim();
    const xHandleQuery = String(req.query.xHandle || '').trim().replace(/^@/, '');

    if (!isValidChainId(chainId) || !isValidTokenAddress(address)) {
      return res.status(400).json({ error: 'Invalid chain or token address.' });
    }

    const ts = nowTimeTag();
    const sources: SourceStatus[] = [];

    // 1. Gather official links from DexScreener
    const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`;
    const dexRes = await fetchJsonWithRetry<{ pairs?: DexScreenerPairRaw[] | null }>('DexScreener', dexUrl);
    sources.push(dexRes.status);

    const targetPair = (dexRes.data?.pairs || [])[0];
    const tokenName = name || targetPair?.baseToken?.name || symbol || address;
    const tokenSymbol = symbol || targetPair?.baseToken?.symbol || '';

    const rawLinks: { label: string; url: string }[] = [];
    (targetPair?.info?.websites || []).forEach((w) => {
      if (w.url) rawLinks.push({ label: w.label || 'Website', url: w.url });
    });
    let detectedXHandle = xHandleQuery;
    (targetPair?.info?.socials || []).forEach((s) => {
      if (s.url) {
        rawLinks.push({ label: s.type || 'Social', url: s.url });
        if (!detectedXHandle && /(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/i.test(s.url)) {
          const m = s.url.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/i);
          if (m && !['search', 'intent', 'i', 'hashtag'].includes(m[1].toLowerCase())) {
            detectedXHandle = m[1];
          }
        }
      }
    });

    const linkChecks = await Promise.all(
      rawLinks.slice(0, 5).map((l) => checkLinkResolves(l.label, l.url)),
    );

    // 2. News headlines (GNews -> NewsAPI -> free Google News RSS), filtered & deduped to max 6
    let rawNews: NewsItem[] = [];
    const newsSearchUrl = `https://news.google.com/search?q=${encodeURIComponent(`${tokenName} ${tokenSymbol}`.trim())}&hl=en-US&gl=US&ceid=US:en`;
    const newsQuery = [tokenName, tokenSymbol].filter(Boolean).join(' OR ');
    if (process.env.GNEWS_API_KEY) {
      const gnUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(newsQuery)}&lang=en&max=10&apikey=${encodeURIComponent(process.env.GNEWS_API_KEY)}`;
      const gnRes = await fetchJsonWithRetry<{
        articles?: { title: string; url: string; publishedAt: string; source?: { name?: string } }[];
      }>('GNews', gnUrl);
      sources.push(gnRes.status);
      rawNews = (gnRes.data?.articles || []).map((a) => ({
        title: a.title,
        url: a.url,
        publishedAt: a.publishedAt,
        source: a.source?.name || 'GNews',
      }));
    } else if (process.env.NEWS_API_KEY) {
      const naUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(newsQuery)}&language=en&pageSize=15&sortBy=publishedAt`;
      const naRes = await fetchJsonWithRetry<{
        articles?: { title: string; url: string; publishedAt: string; source?: { name?: string } }[];
      }>('NewsAPI', naUrl, { headers: { 'X-Api-Key': process.env.NEWS_API_KEY } });
      sources.push(naRes.status);
      rawNews = (naRes.data?.articles || []).map((a) => ({
        title: a.title,
        url: a.url,
        publishedAt: a.publishedAt,
        source: a.source?.name || 'NewsAPI',
      }));
    } else {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`${tokenName} ${tokenSymbol} crypto -price -converter`)}&hl=en-US&gl=US&ceid=US:en`;
      const cacheKey = `rss:v2:${rssUrl}`;
      const cachedRss = getCached<NewsItem[]>(cacheKey);
      const started = Date.now();
      if (cachedRss) {
        rawNews = cachedRss;
        sources.push({
          source: 'Google News RSS',
          ok: true,
          statusCode: 200,
          latencyMs: 0,
          cached: true,
        });
      } else {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
        try {
          const resp = await fetch(rssUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'ToxicologyArchiveLab/1.0' },
          });
          clearTimeout(timer);
          if (resp.ok) {
            const xml = await resp.text();
            rawNews = parseGoogleNewsRss(xml);
            setCached(cacheKey, rawNews);
            sources.push({
              source: 'Google News RSS',
              ok: true,
              statusCode: resp.status,
              latencyMs: Date.now() - started,
              cached: false,
            });
          } else {
            sources.push({
              source: 'Google News RSS',
              ok: false,
              statusCode: resp.status,
              latencyMs: Date.now() - started,
              cached: false,
              error: `HTTP ${resp.status}`,
            });
          }
        } catch (err) {
          clearTimeout(timer);
          sources.push({
            source: 'Google News RSS',
            ok: false,
            latencyMs: Date.now() - started,
            cached: false,
            error: err instanceof Error ? err.message : 'RSS fetch failed',
          });
        }
      }
    }

    const news = filterAndRankNews(rawNews);

    // 3. X API v2 (optional via X_BEARER_TOKEN, never fabricated)
    const xQueryTerm = tokenSymbol ? `$${tokenSymbol} OR ${address}` : address;
    const xSearchUrl = `https://x.com/search?q=${encodeURIComponent(xQueryTerm)}&src=typed_query&f=live`;
    const xSearchByAddressUrl = `https://x.com/search?q=${encodeURIComponent(address)}&src=typed_query&f=live`;
    const xSearchByTickerUrl = `https://x.com/search?q=${encodeURIComponent(tokenSymbol ? `$${tokenSymbol}` : tokenName)}&src=typed_query&f=live`;
    const xProfileHandle = detectedXHandle ? `@${detectedXHandle}` : null;
    const xProfileUrl = detectedXHandle
      ? `https://x.com/${encodeURIComponent(detectedXHandle)}`
      : null;

    const xConfigured = Boolean(process.env.X_BEARER_TOKEN);
    let xPosts: XPostItem[] = [];
    let xAccount: XAccountSnapshot | null = null;
    let xError: string | undefined;

    if (xConfigured && process.env.X_BEARER_TOKEN) {
      const xHeaders = { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` };
      const searchEndpoint = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(
        `(${tokenSymbol || tokenName} OR ${address}) -is:retweet lang:en`,
      )}&max_results=10&tweet.fields=created_at,public_metrics&expansions=author_id&user.fields=username,name`;

      const xRes = await fetchJsonWithRetry<{
        data?: {
          id: string;
          text: string;
          author_id: string;
          created_at?: string;
          public_metrics?: { like_count?: number; retweet_count?: number; reply_count?: number };
        }[];
        includes?: { users?: { id: string; username: string; name: string }[] };
      }>('X API v2', searchEndpoint, { headers: xHeaders }, 0);
      sources.push(xRes.status);

      if (xRes.status.ok && xRes.data?.data) {
        const userMap = new Map(
          (xRes.data.includes?.users || []).map((u) => [u.id, u]),
        );
        xPosts = xRes.data.data.slice(0, 6).map((t) => {
          const author = userMap.get(t.author_id);
          const handle = author?.username || 'unknown';
          const likes = t.public_metrics?.like_count || 0;
          const reposts = t.public_metrics?.retweet_count || 0;
          const replies = t.public_metrics?.reply_count || 0;
          return {
            id: t.id,
            authorHandle: `@${handle}`,
            authorName: author?.name || handle,
            text: t.text,
            createdAt: t.created_at || '',
            likes,
            reposts,
            replies,
            engagementCount: likes + reposts + replies,
            url: `https://x.com/${handle}/status/${t.id}`,
          };
        });
      } else if (!xRes.status.ok) {
        xError = xRes.status.error;
      }

      if (detectedXHandle) {
        const uRes = await fetchJsonWithRetry<{
          data?: {
            username: string;
            created_at?: string;
            public_metrics?: { followers_count?: number; tweet_count?: number };
          };
        }>(
          'X Account Lookup',
          `https://api.twitter.com/2/users/by/username/${encodeURIComponent(detectedXHandle)}?user.fields=created_at,public_metrics`,
          { headers: xHeaders },
          0,
        );
        sources.push(uRes.status);
        if (uRes.data?.data) {
          const u = uRes.data.data;
          const weeks = u.created_at
            ? Math.max(1, (Date.now() - Date.parse(u.created_at)) / (1000 * 60 * 60 * 24 * 7))
            : null;
          const tweets = u.public_metrics?.tweet_count ?? null;
          xAccount = {
            handle: `@${u.username}`,
            createdAt: u.created_at || null,
            followersCount: u.public_metrics?.followers_count ?? null,
            tweetCount: tweets,
            cadencePerWeek:
              weeks && tweets !== null ? Number((tweets / weeks).toFixed(1)) : null,
            url: `https://x.com/${u.username}`,
          };
        }
      }
    }

    const data: Stage5NarrativeData = {
      links: linkChecks,
      news,
      newsSearchUrl,
      xConfigured,
      xSearchUrl,
      xSearchByAddressUrl,
      xSearchByTickerUrl,
      xProfileUrl,
      xProfileHandle,
      xPosts,
      xAccount,
      xError,
    };

    const brokenLinks = linkChecks.filter((l) => !l.resolves).length;
    const pairRefUrl = targetPair?.url || `https://dexscreener.com/${chainId}/${address}`;
    const findings: TerminalFinding[] = [
      {
        id: `s5_links_${Date.now()}`,
        stage: 5,
        timestamp: ts,
        severity: linkChecks.length === 0 || brokenLinks > 0 ? 'FLAG' : 'INFO',
        label: 'Project links',
        summary:
          linkChecks.length === 0
            ? 'Official project links: none claimed (Flag observed)'
            : `${linkChecks.length - brokenLinks}/${linkChecks.length} official link(s) resolved`,
        rawValue: JSON.stringify(linkChecks),
        sourceName: 'DexScreener Links',
        sourceUrl: pairRefUrl,
      },
      {
        id: `s5_news_${Date.now()}`,
        stage: 5,
        timestamp: ts,
        severity: 'INFO',
        label: 'News coverage',
        summary:
          data.news.length > 0
            ? `${data.news.length} reporting headline(s) matched for ${tokenSymbol || tokenName}`
            : `No recent reporting found for ${tokenSymbol || tokenName}`,
        rawValue: JSON.stringify({ headlineCount: data.news.length }),
        sourceName: 'Google News',
        sourceUrl: newsSearchUrl,
      },
      {
        id: `s5_x_${Date.now()}`,
        stage: 5,
        timestamp: ts,
        severity: 'INFO',
        label: 'X social telemetry',
        summary: xConfigured
          ? `X API v2 returned ${xPosts.length} recent post(s)`
          : 'X API not connected — search links by contract & ticker available',
        rawValue: JSON.stringify({
          xConfigured,
          postsCount: xPosts.length,
          xAccount,
          xSearchByAddressUrl,
          xSearchByTickerUrl,
          xProfileUrl,
        }),
        sourceName: 'X Search',
        sourceUrl: xSearchUrl,
      },
    ];

    return res.json({
      stage: 5,
      title: 'Narrative and social',
      ok: true,
      data,
      findings,
      sources,
      fetchedAt: Date.now(),
    } satisfies StageResponse<Stage5NarrativeData>);
  });

  // Optional neutral 3-sentence Gemini recap with 3 retries (2s, 4s, 8s) and deterministic fallback
  router.post('/recap', async (req, res) => {
    const { summaryPayload } = req.body ?? {};
    if (!summaryPayload || typeof summaryPayload !== 'object') {
      return res.status(400).json({
        ok: false,
        message: 'Summary temporarily unavailable. Retry',
        recap: buildDeterministicRecapServer({}),
      });
    }

    const deterministicRecap = buildDeterministicRecapServer(
      summaryPayload as Record<string, unknown>,
    );
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[Lab Recap] GEMINI_API_KEY is not configured; returning deterministic template recap.');
      return res.json({
        ok: false,
        message: 'Summary temporarily unavailable. Retry',
        recap: deterministicRecap,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const backoffDelaysMs = [2000, 4000, 8000];
    for (let attempt = 0; attempt <= backoffDelaysMs.length; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Write a neutral, plain-English 3-sentence factual recap of these measured on-chain screening facts:\n${JSON.stringify(summaryPayload).slice(0, 3500)}`,
          config: {
            systemInstruction:
              'You are a strictly neutral blockchain data summarizer. Summarize measured facts in exactly 3 plain-English sentences. NEVER give financial advice, predictions, or recommendations. NEVER use the words buy, sell, safe, scam, bullish, bearish, or go for it.',
          },
        });

        const text = sanitizeNoAdviceText(response.text || '');
        if (text) {
          return res.json({
            ok: true,
            recap: text,
          });
        }
        throw new Error('Gemini returned empty recap response.');
      } catch (err) {
        console.error(`[Lab Recap] Attempt ${attempt + 1} failed:`, err);
        if (attempt < backoffDelaysMs.length) {
          await new Promise((resolve) => setTimeout(resolve, backoffDelaysMs[attempt]));
        }
      }
    }

    return res.json({
      ok: false,
      message: 'Summary temporarily unavailable. Retry',
      recap: deterministicRecap,
    });
  });

  return router;
}
