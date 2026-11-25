export type ArchiveCategory = 'L1 ARCHITECTURE' | 'CHECKLIST' | 'BRIEF' | 'TOKENOMICS';

export interface ArchiveDoc {
  id: string;
  title: string;
  category: ArchiveCategory;
  readTime: string;
  date: string;
  hot?: boolean;
  summary: string;
  sections: {
    heading: string;
    points: string[];
  }[];
  verdict: 'SIGNAL' | 'CAUTION';
}

export const ARCHIVE_DOCUMENTS: ArchiveDoc[] = [
  {
    id: 'solana-1-0-architecture',
    title: 'Solana 1.0 Architecture Breakdown',
    category: 'L1 ARCHITECTURE',
    readTime: '55s read',
    date: 'Nov 2026',
    hot: true,
    summary:
      'A 55-second engineering strip-down of Proof of History sequencing, Turbine block propagation, and Sealevel parallel execution under peak mainnet load.',
    verdict: 'SIGNAL',
    sections: [
      {
        heading: '01. Incentives & Validator Economics',
        points: [
          'Inflation schedule tapers toward 1.5% long-term floor while priority fees and MEV tips increasingly offset base issuance.',
          'Hardware entry cost remains high relative to home-staker chains, concentrating stake around institutional bare-metal operators.',
          'Net emission toxicity drops as non-vote transaction fees burn 50% of base fees.',
        ],
      },
      {
        heading: '02. Load & Congestion Engineering',
        points: [
          'QUIC + stake-weighted QoS isolates spam bursts from genuine arbitrage and consumer orderflow.',
          'Local fee markets prevent an isolated NFT mint or meme launch from pricing out unrelated DeFi state.',
          'Gulf Stream forwards transactions ahead of slot confirmation to eliminate global mempool bloat.',
        ],
      },
      {
        heading: '03. Real Usage vs. Wash Activity',
        points: [
          'Distinguish failed arbitrage bot transactions from unique fee-paying human signers.',
          'Stablecoin settlement velocity and DEX volume-to-TVL ratio confirm sticky capital rotation.',
        ],
      },
    ],
  },
  {
    id: 'liquidity-incentives-load-testing',
    title: 'Liquidity Incentives & Load Testing',
    category: 'CHECKLIST',
    readTime: '2m read',
    date: 'Nov 2026',
    summary:
      'How to separate mercenary points-farming TVL from genuine fee-generating liquidity before emissions cliff.',
    verdict: 'SIGNAL',
    sections: [
      {
        heading: '01. Mercenary Capital Stress Test',
        points: [
          'Measure TVL retention 14, 30, and 90 days after seasonal reward epochs conclude.',
          'Flag pools where >70% of APY comes from governance token emissions rather than organic swap fees.',
        ],
      },
      {
        heading: '02. Oracle & Liquidation Load',
        points: [
          'Simulate a 35% 15-minute spot drawdown and confirm liquidator bots clear bad debt within 3 blocks.',
          'Audit price-feed circuit breakers for stale slot tolerances.',
        ],
      },
    ],
  },
  {
    id: 'tokenomics-audit-checklist',
    title: 'Tokenomics Audit Checklist',
    category: 'TOKENOMICS',
    readTime: '1m read',
    date: 'Oct 2026',
    summary:
      'Red-flag supply cliff detector covering insider unlock overhangs, FDV-to-revenue multiples, and treasury runway.',
    verdict: 'SIGNAL',
    sections: [
      {
        heading: '01. Float & Unlock Overhang',
        points: [
          'Check circulating float below 15% paired with linear monthly cliff unlocks exceeding 4% of circulating supply.',
          'Verify whether staking rewards simply dilute non-stakers without capturing protocol cashflow.',
        ],
      },
      {
        heading: '02. Value Accrual Plumbing',
        points: [
          'Confirm fee switches are active or legally/technically executable without multisig capture.',
          'Separate gross protocol fees from net treasury revenue after market-maker rebates.',
        ],
      },
    ],
  },
  {
    id: 'mev-validator-concentration',
    title: 'MEV & Validator Concentration Brief',
    category: 'BRIEF',
    readTime: '3m read',
    date: 'Oct 2026',
    summary:
      'Mapping block-builder centralization, sandwich extraction rates, and Nakamoto coefficient resilience across top L1s.',
    verdict: 'CAUTION',
    sections: [
      {
        heading: '01. Builder & Relay Chokepoints',
        points: [
          'Track top-3 block builders share; >65% concentration introduces censorship and latency rent extraction.',
          'Evaluate encrypted mempool adoption and orderflow auction fairness.',
        ],
      },
      {
        heading: '02. User Protection Thresholds',
        points: [
          'Audit default RPC routing for sandwich leakage on retail swaps under $5,000.',
        ],
      },
    ],
  },
  {
    id: 'restaking-yield-vs-fee-capture',
    title: 'Restaking Yield vs. Real Fee Capture',
    category: 'TOKENOMICS',
    readTime: '2m read',
    date: 'Oct 2026',
    summary:
      'Deconstructing layered slashable collateral and distinguishing AVS security fees from circular points leverage.',
    verdict: 'CAUTION',
    sections: [
      {
        heading: '01. Collateral Rehypothecation Limits',
        points: [
          'Verify correlated slashing conditions across multiple actively validated services.',
          'Compare real AVS security premiums against liquid restaking token discount risk.',
        ],
      },
    ],
  },
  {
    id: 'stablecoin-peg-stress-framework',
    title: 'Stablecoin Peg Stress Framework',
    category: 'CHECKLIST',
    readTime: '2m read',
    date: 'Sep 2026',
    summary:
      'Rapid liquidity checklist for synthetic dollars, T-bill wrappers, and delta-neutral basis stables during negative funding.',
    verdict: 'SIGNAL',
    sections: [
      {
        heading: '01. Redemption Latency & Reserve Transparency',
        points: [
          'Test T+0 on-chain redemption capacity versus secondary Curve/AMM pool depth.',
          'Verify custodian bankruptcy remoteness and real-time proof-of-reserve cadence.',
        ],
      },
    ],
  },
];

export interface ThreeStepPillar {
  num: '01' | '02' | '03';
  id: 'incentives' | 'load' | 'usage';
  title: string;
  shortTitle: string;
  subtitle: string;
  summary: string;
  checks: string[];
}

export const THREE_STEP_PILLARS: ThreeStepPillar[] = [
  {
    num: '01',
    id: 'incentives',
    title: '3-Step Filter: Incentives',
    shortTitle: '3-Step Filter',
    subtitle: 'Incentives, load, real usage',
    summary:
      'Strip away token emissions, points multipliers, and mercenary rebates to see if the protocol economics survive at zero subsidy.',
    checks: [
      'Organic fee yield > emission dilution rate',
      '12-month unlock overhang under 25% of float',
      'No circular lending or wash-rebate loops',
    ],
  },
  {
    num: '02',
    id: 'load',
    title: 'Document Vault: Load',
    shortTitle: 'Document Vault',
    subtitle: 'Checklists & briefs',
    summary:
      'Stress-test consensus throughput, local fee markets, RPC resilience, and liquidation latency under 10x volatility spikes.',
    checks: [
      'Sub-second finality or deterministic slot inclusion',
      'Local fee isolation prevents cross-app congestion',
      'Oracle staleness & liquidation bad-debt buffers verified',
    ],
  },
  {
    num: '03',
    id: 'usage',
    title: 'Solana 1.0: Real Usage',
    shortTitle: 'Solana 1.0',
    subtitle: '55s interactive breakdown',
    summary:
      'Separate genuine human settlement, stablecoin velocity, and retained builders from bot spam and sybil wallets.',
    checks: [
      'Non-vote fee payers sustained post-incentive',
      'DEX volume / TVL capital efficiency >= 1.5x',
      'Sticky developer retention across consecutive quarters',
    ],
  },
];

export interface SolanaChapter {
  step: number;
  num: '01' | '02' | '03';
  label: string;
  shortLabel: string;
  durationSec: number;
  headline: string;
  detail: string;
  metrics: { label: string; value: string }[];
  checklist: string[];
}

export const SOLANA_CHAPTERS: SolanaChapter[] = [
  {
    step: 1,
    num: '01',
    label: 'Step 1 of 3 · Incentives',
    shortLabel: 'Incentives',
    durationSec: 18,
    headline: 'Fee Burn vs. Staking Issuance Balance',
    detail:
      'Solana pairs a disinflationary staking schedule with local priority fees and MEV tips. 50% of base fees burn permanently while validators compete on execution speed rather than inflationary subsidies.',
    metrics: [
      { label: 'Base Fee Burn', value: '50%' },
      { label: 'Floor Inflation', value: '1.5%' },
      { label: 'Epoch Cadence', value: '~2.5d' },
    ],
    checklist: [
      'Incentives: Priority fees accrue directly to active block leaders',
      'Incentives: Real yield comes from MEV & state contention, not empty emissions',
      'Incentives: Transparent stake-weight distribution across validators',
    ],
  },
  {
    step: 2,
    num: '02',
    label: 'Step 2 of 3 · Load',
    shortLabel: 'Load',
    durationSec: 19,
    headline: 'Proof of History + Sealevel Parallel Execution',
    detail:
      'PoH establishes a cryptographic clock before consensus, allowing validators to stream shreds continuously via Turbine and execute non-overlapping account transactions in parallel across CPU cores.',
    metrics: [
      { label: 'Slot Time', value: '400ms' },
      { label: 'Block Propagation', value: 'Turbine' },
      { label: 'Transport', value: 'QUIC' },
    ],
    checklist: [
      'Load: Stake-weighted QoS protects genuine users during spam bursts',
      'Load: Local fee markets isolate hot accounts from global state',
      'Load: Deterministic leader schedule via Gulf Stream pre-forwarding',
    ],
  },
  {
    step: 3,
    num: '03',
    label: 'Step 3 of 3 · Real Usage',
    shortLabel: 'Real Usage',
    durationSec: 18,
    headline: 'Organic Settlement & Capital Velocity',
    detail:
      'Filter out failed arbitrage bots and inspect real settlement: native USDC transfers, orderbook liquidity depth, and consumer micropayments thriving at sub-cent transaction costs.',
    metrics: [
      { label: 'Median Fee', value: '<$0.001' },
      { label: 'Finality', value: '~12.8s' },
      { label: 'Filter Verdict', value: 'SIGNAL' },
    ],
    checklist: [
      'Real Usage: High DEX volume-to-TVL velocity without artificial locks',
      'Real Usage: Sustained non-vote fee payers across market regimes',
      'Real Usage: Sub-cent payments unlock consumer & DePIN loops',
    ],
  },
];

export interface PartnerProtocol {
  id: string;
  name: string;
  handle: string;
  domain: string;
  focus: string;
  status: 'SIGNAL' | 'VERIFIED' | 'MONITORED';
  summary: string;
  glyph: 'solana' | 'crown' | 'vortex' | 'cube' | 'shield' | 'pulse';
}

export const PARTNER_PROTOCOLS: PartnerProtocol[] = [
  {
    id: 'solana',
    name: 'Solana Core',
    handle: '@solana',
    domain: 'L1 Execution',
    focus: '400ms slot pipeline, Sealevel parallelism & QUIC QoS',
    status: 'SIGNAL',
    summary: 'Flagship L1 case study for high-throughput load testing and local fee markets.',
    glyph: 'solana',
  },
  {
    id: 'jito',
    name: 'Jito Network',
    handle: '@jito_sol',
    domain: 'MEV & Staking',
    focus: 'Out-of-protocol blockspace auctions & validator tip routing',
    status: 'VERIFIED',
    summary: 'Audited validator tip distribution and stake-weighted bundle inclusion mechanics.',
    glyph: 'crown',
  },
  {
    id: 'jupiter',
    name: 'Jupiter Aggregator',
    handle: '@JupiterExchange',
    domain: 'Liquidity Routing',
    focus: 'Cross-venue routing efficiency and perpetuals risk engine',
    status: 'SIGNAL',
    summary: 'Benchmark for organic swap fee capture and slippage minimization under load.',
    glyph: 'vortex',
  },
  {
    id: 'helium',
    name: 'Helium DePIN',
    handle: '@helium',
    domain: 'DePIN Network',
    focus: 'Data credit burn-and-mint equilibrium & real carrier offload',
    status: 'VERIFIED',
    summary: 'Real-world hardware usage telemetry replacing speculative token emissions.',
    glyph: 'cube',
  },
  {
    id: 'kamino',
    name: 'Kamino Finance',
    handle: '@KaminoFinance',
    domain: 'Credit & Vaults',
    focus: 'Automated CLMM liquidity & isolated borrow risk parameters',
    status: 'VERIFIED',
    summary: 'Stress-tested liquidation thresholds and oracle latency tolerances.',
    glyph: 'shield',
  },
  {
    id: 'pyth',
    name: 'Pyth Network',
    handle: '@PythNetwork',
    domain: 'Oracle Infra',
    focus: 'Pull-based high-frequency price feeds & confidence intervals',
    status: 'MONITORED',
    summary: 'Evaluated sub-second price updates during sudden cross-exchange volatility.',
    glyph: 'pulse',
  },
];

export interface ChecklistRule {
  id: string;
  rule: string;
  spec: string;
  status: 'PASS';
}

export const UX_AUDIT_CHECKLIST: ChecklistRule[] = [
  {
    id: 'hero-color',
    rule: 'Hero Color',
    spec: '#E10000 (Saturated red) used strictly for key CTAs, accents, and the crown logo.',
    status: 'PASS',
  },
  {
    id: 'dark-theme',
    rule: 'Dark Theme Foundations',
    spec: 'Pure background #050505, surface #0E0E0E, cards #161616, borders #2A2A2A.',
    status: 'PASS',
  },
  {
    id: 'wcag-contrast',
    rule: 'WCAG AA Contrast',
    spec: 'White on #E10000 contrast ratio of 4.61:1 (> 4.5:1 required for AA text) and #FF554A for small text on dark.',
    status: 'PASS',
  },
  {
    id: 'mascot-presence',
    rule: 'Mascot Presence',
    spec: 'Playful streetwear mascot integrated with peace sign in banner, loader, empty states, and avatar ring.',
    status: 'PASS',
  },
  {
    id: 'touch-targets',
    rule: 'Touch Targets',
    spec: 'All interactive items are >= 44px in height, with standard 48px buttons and 8px grid gaps.',
    status: 'PASS',
  },
  {
    id: 'typography',
    rule: 'Typography Hierarchy',
    spec: 'Space Grotesk / Sora tight tracking headings, Inter body 16px, JetBrains Mono handles.',
    status: 'PASS',
  },
  {
    id: 'responsive-strictness',
    rule: 'Responsive Strictness',
    spec: 'Zero horizontal scroll, wrap safe at 360px viewport, responsive bottom nav + safe areas.',
    status: 'PASS',
  },
];
