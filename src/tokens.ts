export const TOXICOLOGY_TOKENS = {
  colors: {
    bg: '#050505',
    surface: '#0E0E0E',
    surface2: '#161616',
    border: '#2A2A2A',
    red: '#E10000',
    redHover: '#FF2A1F',
    redLightText: '#FF554A', // WCAG AA >= 4.5:1 on #050505 and #0E0E0E
    redGlow: 'rgba(225, 0, 0, 0.45)',
    text: '#FFFFFF',
    muted: '#A3A3A3',
    whiteClayShade: '#F2F2F2',
  },
  radii: {
    card: '20px',
    pill: '999px',
  },
  shadows: {
    clay: 'inset 0 1.5px 0 rgba(255, 255, 255, 0.08), 0 4px 12px rgba(0, 0, 0, 0.5)',
    redGlow: '0 0 24px rgba(225, 0, 0, 0.45)',
    redGlowSubtle: '0 0 12px rgba(225, 0, 0, 0.25)',
  },
  typography: {
    heading: "'Space Grotesk', 'Sora', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
    scale: [12, 14, 16, 20, 28, 40] as const,
  },
  spacing: {
    gridBase: 8,
    minTouchTarget: 44,
    touchGap: 8,
    bottomNavHeight: 56,
  },
  motion: {
    durationMs: 180,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    pressScale: 0.98,
  },
} as const;

export const ASSETS = {
  mascotAvatar: '/assets/aistudio/06ca4e8991799574c6283311e3e5990e_0dac84fe.jpg',
  bannerArtwork: '/assets/aistudio/x-banner-v2-1500x500_767fae1f.png',
} as const;
