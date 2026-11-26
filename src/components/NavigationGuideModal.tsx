import React, { useEffect, useState } from 'react';
import {
  Archive,
  ArrowRight,
  Compass,
  FlaskConical,
  Home,
  Layers,
  LogIn,
  MousePointerClick,
  Move3d,
  RotateCw,
  Users,
  X,
} from 'lucide-react';
import type { AppRoute } from '../pages/HomePage';
import { CrownIcon } from './ui/CrownIcon';
import { ActionButton } from './ui/ActionButton';

interface NavigationGuideModalProps {
  open: boolean;
  isSignedIn: boolean;
  signingIn?: boolean;
  userEmail?: string | null;
  onClose: (dontShowAgain: boolean) => void;
  onNavigate: (route: AppRoute) => void;
  onSignIn: () => void;
}

const ROUTE_STEPS: {
  id: AppRoute;
  num: string;
  label: string;
  desc: string;
  Icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'home',
    num: '01',
    label: 'Home',
    desc: 'Overview, latest briefs, and quick shortcuts into every tool.',
    Icon: Home,
  },
  {
    id: 'archive',
    num: '02',
    label: 'Archive',
    desc: 'Search checklists & tokenomics briefs and bookmark them to your vault.',
    Icon: Archive,
  },
  {
    id: 'three-step',
    num: '03',
    label: '3-Step',
    desc: 'Score any protocol on Incentives, Load, and Real Usage and save audits.',
    Icon: Layers,
  },
  {
    id: 'lab',
    num: '04',
    label: 'Lab (3D)',
    desc: 'Run live 5-stage token diagnostics with the interactive 3D ring scanner.',
    Icon: FlaskConical,
  },
  {
    id: 'partners',
    num: '05',
    label: 'Partners',
    desc: 'Browse audited protocols and use the research analyst workspace.',
    Icon: Users,
  },
];

export const NavigationGuideModal: React.FC<NavigationGuideModalProps> = ({
  open,
  isSignedIn,
  signingIn = false,
  userEmail,
  onClose,
  onNavigate,
  onSignIn,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [previewAngle, setPreviewAngle] = useState<'iso' | 'core' | 'top'>('iso');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(dontShowAgain);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dontShowAgain, onClose]);

  if (!open) return null;

  const transformClass =
    previewAngle === 'iso'
      ? '[transform:perspective(700px)_rotateX(52deg)_rotateZ(-24deg)]'
      : previewAngle === 'core'
        ? '[transform:perspective(700px)_rotateX(28deg)_rotateZ(12deg)_scale(1.08)]'
        : '[transform:perspective(700px)_rotateX(0deg)_rotateZ(0deg)]';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nav-guide-title"
      onClick={() => onClose(dontShowAgain)}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto clay-card rounded-b-none sm:rounded-[20px] p-5 sm:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#2A2A2A] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-wider text-[#FF554A]">
              <Compass className="w-4 h-4" />
              <span>App &amp; 3D Navigation Guide</span>
            </div>
            <h2
              id="nav-guide-title"
              className="font-heading font-bold text-xl sm:text-2xl text-white leading-tight"
            >
              How to Navigate Toxicology Archive
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onClose(dontShowAgain)}
            aria-label="Close navigation guide"
            className="min-h-[44px] min-w-[44px] rounded-full bg-[#161616] border border-[#2A2A2A] text-[#A3A3A3] hover:text-white flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Interactive 3D Direction Guide */}
        <div className="rounded-[16px] bg-[#050505] border border-[#2A2A2A] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Move3d className="w-4 h-4 text-[#FF554A]" />
              <h3 className="font-heading font-bold text-sm text-white">
                3D Scanner Direction Controls (Lab Tab)
              </h3>
            </div>

            <div className="flex items-center gap-1.5" role="group" aria-label="Preview 3D angle">
              {(
                [
                  { id: 'iso', label: 'Overview' },
                  { id: 'core', label: 'Core' },
                  { id: 'top', label: 'Top' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPreviewAngle(preset.id)}
                  className={`min-h-[36px] px-2.5 rounded-full text-[11px] font-heading font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                    previewAngle === preset.id
                      ? 'bg-white text-[#050505]'
                      : 'bg-[#161616] border border-[#2A2A2A] text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Spatial 3D CSS Preview Stage */}
            <div className="sm:col-span-5 h-32 rounded-[14px] bg-[#0E0E0E] border border-[#2A2A2A] red-grid-bg flex items-center justify-center overflow-hidden relative">
              <div
                className={`relative w-24 h-24 flex items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${transformClass}`}
              >
                <span className="absolute inset-0 rounded-full border-2 border-[#E10000]/70 shadow-[0_0_14px_rgba(225,0,0,0.35)]" />
                <span className="absolute inset-3 rounded-full border border-white/60" />
                <span className="w-8 h-8 rounded-full bg-[#161616] border border-[#E10000] flex items-center justify-center">
                  <CrownIcon className="w-4 h-4" glow />
                </span>
              </div>
              <span className="absolute bottom-1.5 right-2.5 font-mono-handle text-[10px] text-[#A3A3A3]">
                {previewAngle.toUpperCase()} VIEW
              </span>
            </div>

            {/* 3D Controls Explanation */}
            <ul className="sm:col-span-7 space-y-2 text-xs text-[#D4D4D4]">
              <li className="flex items-start gap-2">
                <MousePointerClick className="w-4 h-4 text-[#FF554A] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Drag / Swipe 360°</strong> inside the Lab canvas to orbit around the 5 scan rings, and scroll or pinch to zoom.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <RotateCw className="w-4 h-4 text-[#FF554A] shrink-0 mt-0.5" />
                <span>
                  Use <strong className="text-white">Turn Left / Right</strong>, <strong className="text-white">Overview / Core / Top</strong> camera presets, or toggle <strong className="text-white">Orbit</strong> on the bottom dock.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* 2. Account & Sign-In Visibility Callout */}
        <div className="rounded-[16px] bg-[#050505] border border-[#2A2A2A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-[#FF554A]" />
              <h3 className="font-heading font-bold text-sm text-white">
                {isSignedIn ? 'Signed In & Cloud Synced' : 'Sign In via Top-Right Button'}
              </h3>
            </div>
            <p className="text-xs text-[#A3A3A3] leading-relaxed">
              {isSignedIn
                ? `Signed in as ${userEmail || 'Researcher'}. Your bookmarks and 3-Step audits sync automatically.`
                : 'Click the red-bordered "Sign in" button in the top-right header (or below) to sync saved Archive briefs and 3-Step audits with Google.'}
            </p>
          </div>

          {!isSignedIn && (
            <ActionButton
              variant="secondary"
              size="compact"
              onClick={onSignIn}
              disabled={signingIn}
              className="shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-[#FF554A]" />
              <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
            </ActionButton>
          )}
        </div>

        {/* 3. Where Every Tab Goes */}
        <div className="space-y-2.5">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#A3A3A3]">
            Pages &amp; Shortcuts (Tap any card to jump)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ROUTE_STEPS.map((step) => {
              const Icon = step.Icon;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    onClose(dontShowAgain);
                    onNavigate(step.id);
                  }}
                  className="min-h-[60px] p-3 rounded-[14px] bg-[#161616] border border-[#2A2A2A] hover:border-[#E10000]/70 text-left flex items-start justify-between gap-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#050505] border border-[#2A2A2A] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#FF554A]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono-handle text-[11px] text-[#FF554A] font-bold">
                          {step.num}
                        </span>
                        <span className="font-heading font-bold text-sm text-white">
                          {step.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#A3A3A3] mt-0.5 leading-snug">{step.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#A3A3A3] shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="pt-3 border-t border-[#2A2A2A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="min-h-[44px] inline-flex items-center gap-2.5 text-xs text-[#A3A3A3] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 accent-[#E10000] rounded cursor-pointer"
            />
            <span>Don&apos;t show automatically on startup</span>
          </label>

          <ActionButton
            variant="primary"
            onClick={() => onClose(dontShowAgain)}
            className="w-full sm:w-auto"
          >
            Got it, Start Exploring
          </ActionButton>
        </div>
      </div>
    </div>
  );
};
