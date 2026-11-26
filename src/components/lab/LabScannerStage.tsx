import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Compass, Orbit, ShieldAlert } from 'lucide-react';
import { CrownIcon } from '../ui/CrownIcon';
import type { CameraPreset } from './LabScanner3D';

const LazyLabScanner3D = lazy(() => import('./LabScanner3D'));

interface LabScannerStageProps {
  completedStages: number;
  activeStage: number;
  stageLabel: string;
  scanPercent: number;
  dataCoverageCount: number;
  failedSources?: string[];
  flagsObservedCount: number;
  scanFinished: boolean;
  onOpenGuide?: () => void;
}

function shouldUseFlatFallback(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  if (!('WebGLRenderingContext' in window)) return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !gl;
  } catch {
    return true;
  }
}

const FlatScannerFallback: React.FC<{ completedStages: number; activeStage: number }> = ({
  completedStages,
  activeStage,
}) => {
  const rings = [5, 4, 3, 2, 1];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative red-grid-bg p-6">
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
        {rings.map((stageNum) => {
          const done = stageNum <= completedStages;
          const active = stageNum === activeStage && !done;
          const sizePct = 36 + stageNum * 12;
          return (
            <div
              key={stageNum}
              style={{ width: `${sizePct}%`, height: `${sizePct}%` }}
              className={`absolute rounded-full border-2 transition-colors duration-200 ${
                done
                  ? 'border-white shadow-[0_0_14px_rgba(255,255,255,0.4)]'
                  : active
                    ? 'border-[#E10000] shadow-[0_0_18px_rgba(225,0,0,0.55)]'
                    : 'border-[#2A2A2A]'
              }`}
            />
          );
        })}
        <div className="relative z-10 w-16 h-16 rounded-full bg-[#161616] border-2 border-[#E10000] flex items-center justify-center shadow-[0_0_24px_rgba(225,0,0,0.45)]">
          <CrownIcon className="w-7 h-7" glow />
        </div>
      </div>
      <span className="mt-2 text-xs text-[#A3A3A3]">
        2D ring scanner active (low-power / reduced-motion mode)
      </span>
    </div>
  );
};

export const LabScannerStage: React.FC<LabScannerStageProps> = ({
  completedStages,
  activeStage,
  stageLabel,
  scanPercent,
  dataCoverageCount,
  failedSources = [],
  flagsObservedCount,
  scanFinished,
  onOpenGuide,
}) => {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [presetVersion, setPresetVersion] = useState(0);
  const [turnVersion, setTurnVersion] = useState(0);
  const [turnDirection, setTurnDirection] = useState<-1 | 1>(1);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setUseFallback(shouldUseFlatFallback());
  }, []);

  const handlePreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    setPresetVersion((v) => v + 1);
  };

  const handleTurn = (dir: -1 | 1) => {
    setTurnDirection(dir);
    setTurnVersion((v) => v + 1);
  };

  return (
    <div className="space-y-4">
      {/* 3D Viewport Frame */}
      <div className="relative w-full h-[340px] sm:h-[400px] lg:h-[430px] rounded-[20px] overflow-hidden border-[1.5px] border-[#2A2A2A] bg-[#050505]">
        {useFallback ? (
          <FlatScannerFallback completedStages={completedStages} activeStage={activeStage} />
        ) : (
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-[#050505]">
                <FlatScannerFallback completedStages={completedStages} activeStage={activeStage} />
              </div>
            }
          >
            <LazyLabScanner3D
              completedStages={completedStages}
              activeStage={activeStage}
              cameraPreset={cameraPreset}
              presetVersion={presetVersion}
              turnVersion={turnVersion}
              turnDirection={turnDirection}
              autoOrbit={autoOrbit}
            />
          </Suspense>
        )}

        {/* Top-Left Stage Pill + Top-Right 3D Controls Guide */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <div className="bg-[#0E0E0E]/95 border border-[#2A2A2A] rounded-full px-3.5 py-2 flex items-center gap-2">
            <CrownIcon className="w-3.5 h-3.5" glow />
            <span className="font-mono-handle text-xs text-white tabular-nums">
              {completedStages}/5
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {!useFallback && (
              <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-black/55 border border-white/10 text-[11px] font-mono-handle text-[#D4D4D4]">
                Drag 360° · Scroll to zoom
              </span>
            )}
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                aria-label="Open 3D & App Navigation Guide"
                className="min-h-[44px] px-3 rounded-full bg-[#0E0E0E]/95 border border-[#2A2A2A] hover:border-[#E10000] text-xs font-heading font-bold text-white flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
              >
                <Compass className="w-3.5 h-3.5 text-[#FF554A]" />
                <span>3D Guide</span>
              </button>
            )}
          </div>
        </div>

        {/* 3D Directional Camera Controls Dock (Turn Left, Overview, Core, Top, Turn Right, Auto-Orbit) */}
        {!useFallback && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0E0E0E]/95 border-[1.5px] border-[#2A2A2A] rounded-full px-2 py-1.5 flex items-center gap-1 max-w-[calc(100%-16px)] overflow-x-auto">
            <button
              type="button"
              onClick={() => handleTurn(-1)}
              aria-label="Rotate 3D view left"
              title="Rotate Left 45°"
              className="min-h-[44px] min-w-[44px] rounded-full bg-[#161616] text-[#D4D4D4] hover:text-white border border-[#2A2A2A] flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {(['overview', 'core', 'top'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePreset(preset)}
                className={`min-h-[44px] px-3 rounded-full text-xs font-heading font-bold capitalize whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                  cameraPreset === preset
                    ? 'bg-white text-[#050505]'
                    : 'bg-[#161616] text-[#A3A3A3] hover:text-white border border-[#2A2A2A]'
                }`}
              >
                {preset}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleTurn(1)}
              aria-label="Rotate 3D view right"
              title="Rotate Right 45°"
              className="min-h-[44px] min-w-[44px] rounded-full bg-[#161616] text-[#D4D4D4] hover:text-white border border-[#2A2A2A] flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setAutoOrbit((prev) => !prev)}
              aria-pressed={autoOrbit}
              className={`min-h-[44px] px-3 rounded-full text-xs font-heading font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                autoOrbit
                  ? 'bg-[#E10000] text-white'
                  : 'bg-[#161616] text-[#A3A3A3] hover:text-white border border-[#2A2A2A]'
              }`}
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>Orbit</span>
            </button>
          </div>
        )}
      </div>

      {/* Beveled 3D-Style Glass Progress Tube + Coverage & Flags */}
      <div
        className="clay-card p-4 sm:p-5 space-y-3"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-heading font-bold text-sm text-white truncate">
            {stageLabel}
          </span>
          <span className="font-mono-handle text-sm font-bold text-[#FF554A] tabular-nums shrink-0">
            {Math.round(scanPercent)}%
          </span>
        </div>

        {/* Beveled Glass Tube */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(scanPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Scan completion percentage"
          className="h-4 w-full rounded-full bg-[#050505] border border-[#2A2A2A] p-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.08)] overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#990000] via-[#E10000] to-[#FF2A1F] shadow-[0_0_16px_rgba(225,0,0,0.65)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{ width: `${Math.max(4, Math.min(100, scanPercent))}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-[#A3A3A3]">
            Scan completion progress (informational telemetry)
          </span>
          {(scanFinished || failedSources.length > 0) && (
            <div className="flex flex-wrap items-center gap-2.5 font-mono-handle">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] ${
                  failedSources.length > 0 || dataCoverageCount < 5
                    ? 'bg-[#E10000]/15 border-[#E10000]/60 text-[#FF554A]'
                    : 'bg-[#161616] border-[#2A2A2A] text-white'
                }`}
              >
                <span>Data Coverage:</span>
                <strong>{dataCoverageCount}/5 sources responded</strong>
              </span>
              {scanFinished && (
                <span className="text-white flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#161616] border border-[#2A2A2A] text-[11px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#FF554A]" />
                  Flags Observed: <strong className="text-[#FF554A]">{flagsObservedCount}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {failedSources.length > 0 && (
          <div
            role="status"
            className="rounded-[12px] bg-[#050505] border border-[#E10000]/45 px-3 py-2 text-xs font-mono-handle text-[#D4D4D4] flex flex-wrap items-center gap-x-2 gap-y-1"
          >
            <span className="text-[#FF554A] font-bold">Failed source(s):</span>
            <span>{failedSources.join(' · ')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
