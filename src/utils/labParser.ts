import { ParsedInput } from '../types/lab';

export function parseLabInput(rawInput: string): ParsedInput {
  const raw = rawInput.trim();
  if (!raw) {
    return {
      raw: '',
      kind: 'invalid',
      label: 'Empty input',
      normalized: '',
      valid: false,
    };
  }

  const dexMatch = raw.match(/dexscreener\.com\/([a-z0-9_-]+)\/([a-zA-Z0-9]+)/i);
  if (dexMatch) {
    return {
      raw,
      kind: 'dexscreener_url',
      label: 'DexScreener link detected',
      normalized: `${dexMatch[1]}/${dexMatch[2]}`,
      chainHint: dexMatch[1].toLowerCase(),
      valid: true,
    };
  }

  const pumpMatch = raw.match(/pump\.fun\/(?:coin\/)?([1-9A-HJ-NP-Za-km-z]{32,44})/i);
  if (pumpMatch) {
    return {
      raw,
      kind: 'pumpfun_url',
      label: 'Pump.fun link detected',
      normalized: pumpMatch[1],
      chainHint: 'solana',
      valid: true,
    };
  }

  if (/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return {
      raw,
      kind: 'evm_address',
      label: 'EVM address detected',
      normalized: raw,
      valid: true,
    };
  }

  if (/^0x[a-fA-F0-9]*$/i.test(raw)) {
    return {
      raw,
      kind: 'invalid',
      label: 'Malformed EVM address',
      normalized: raw,
      valid: false,
      error: 'EVM contract addresses must be 42 characters starting with 0x.',
    };
  }

  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(raw)) {
    return {
      raw,
      kind: 'solana_address',
      label: 'Solana address detected',
      normalized: raw,
      chainHint: 'solana',
      valid: true,
    };
  }

  if (/^@[a-zA-Z0-9_]{1,30}$/.test(raw)) {
    return {
      raw,
      kind: 'x_handle',
      label: 'X handle detected',
      normalized: raw.slice(1),
      valid: true,
    };
  }

  if (/^https?:\/\//i.test(raw)) {
    return {
      raw,
      kind: 'invalid',
      label: 'Unsupported URL',
      normalized: raw,
      valid: false,
      error: 'Paste a DexScreener or Pump.fun link, contract address, ticker, or @handle.',
    };
  }

  const cleaned = raw.replace(/^\$/, '').trim();
  if (cleaned.length < 2 || cleaned.length > 64) {
    return {
      raw,
      kind: 'invalid',
      label: 'Invalid query',
      normalized: cleaned,
      valid: false,
      error: 'Enter at least 2 characters for a token name or ticker search.',
    };
  }

  return {
    raw,
    kind: 'ticker_query',
    label: 'Token name / ticker detected',
    normalized: cleaned,
    valid: true,
  };
}

export function formatUsd(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return 'N/A';
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${Math.round(val).toLocaleString()}`;
}

export function formatPairAge(pairCreatedAt: number | null): string {
  if (!pairCreatedAt) return 'Unknown age';
  const diffMs = Math.max(0, Date.now() - pairCreatedAt);
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return `${hours}h old`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d old`;
  const months = Math.floor(days / 30);
  return `${months}mo old`;
}

export function formatElapsedSince(ts: number | null): string {
  if (!ts) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `Updated ${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `Updated ${min}m ago`;
}

export function formatRelativeTime(dateStr: string): { relative: string; fullDate: string } {
  const parsed = Date.parse(dateStr);
  if (!Number.isFinite(parsed)) {
    return { relative: dateStr || 'Recent', fullDate: dateStr || 'Date unavailable' };
  }
  const fullDate = new Date(parsed).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const diffMs = Math.max(0, Date.now() - parsed);
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return { relative: 'Just now', fullDate };
  if (mins < 60) return { relative: `${mins}m ago`, fullDate };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { relative: `${hours}h ago`, fullDate };
  const days = Math.floor(hours / 24);
  if (days < 30) return { relative: `${days}d ago`, fullDate };
  const months = Math.floor(days / 30);
  return { relative: `${months}mo ago`, fullDate };
}

export function formatAccountAge(createdAt: string | null): string {
  if (!createdAt) return 'N/A';
  const ms = Date.parse(createdAt);
  if (!Number.isFinite(ms)) return 'N/A';
  const days = Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years}y ${remMonths}mo` : `${years}y`;
}

export interface RecapPayloadShape {
  token?: { name?: string; symbol?: string };
  chain?: string;
  liquidity?: {
    liquidityUsd?: number | null;
    lpLockedOrBurnedPct?: number | null;
    top10HolderPct?: number | null;
    holderCount?: number | null;
  } | null;
  market?: {
    volume24hUsd?: number | null;
  } | null;
  links?: {
    claimedCount?: number;
    resolvedCount?: number;
  } | null;
  flagsObserved?: number;
}

export function buildDeterministicRecap(payload: RecapPayloadShape | null | undefined): string {
  const liqText =
    payload?.liquidity?.liquidityUsd !== null && payload?.liquidity?.liquidityUsd !== undefined
      ? formatUsd(payload.liquidity.liquidityUsd)
      : 'N/A';
  const volText =
    payload?.market?.volume24hUsd !== null && payload?.market?.volume24hUsd !== undefined
      ? formatUsd(payload.market.volume24hUsd)
      : 'N/A';
  const top10Text =
    payload?.liquidity?.top10HolderPct !== null && payload?.liquidity?.top10HolderPct !== undefined
      ? `${payload.liquidity.top10HolderPct}%`
      : 'not reported';
  const claimedCount = payload?.links?.claimedCount ?? 0;
  const resolvedCount = payload?.links?.resolvedCount ?? 0;
  const linksText =
    claimedCount > 0 ? `${claimedCount} (${resolvedCount} resolved)` : 'none';
  const flagsText =
    typeof payload?.flagsObserved === 'number' ? `${payload.flagsObserved}` : '0';

  return `Liquidity ${liqText} · 24h volume ${volText} · Top-10 holders ${top10Text} · Links claimed: ${linksText} · Flags observed: ${flagsText}.`;
}

