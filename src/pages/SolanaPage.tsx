import React, { useEffect, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw } from 'lucide-react';
import { SOLANA_CHAPTERS } from '../data/toxicologyData';
import { Solana3DScene } from '../components/Solana3DScene';
import { ClayCard } from '../components/ui/ClayCard';
import { CrownIcon } from '../components/ui/CrownIcon';
import { ActionButton } from '../components/ui/ActionButton';

export const SolanaPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);

  const totalDuration = 55;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setSecondsElapsed((prev) => {
        const next = prev + 1;
        if (next >= totalDuration) {
          setPlaying(false);
          setActiveStep(3);
          return totalDuration;
        }
        if (next < 18) setActiveStep(1);
        else if (next < 37) setActiveStep(2);
        else setActiveStep(3);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  const handleSelectStep = (step: number) => {
    setActiveStep(step);
    if (step === 1) setSecondsElapsed(0);
    else if (step === 2) setSecondsElapsed(18);
    else setSecondsElapsed(37);
  };

  const chapter = SOLANA_CHAPTERS.find((c) => c.step === activeStep) ?? SOLANA_CHAPTERS[0];
  const progressPct = Math.min(100, (secondsElapsed / totalDuration) * 100);

  return (
    <div className="space-y-6">
      {/* Header + 55s Transport Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-wider text-[#FF554A]">
            <CrownIcon className="w-4 h-4" glow />
            <span>55s Interactive Breakdown</span>
          </div>
          <h1 className="font-heading font-bold text-[28px] sm:text-[34px] text-white leading-tight">
            Solana 1.0 Architecture
          </h1>
          <p className="text-sm sm:text-base text-[#A3A3A3]">
            Inspect Proof of History, Sealevel parallelism, and fee economics in real-time 3D.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ActionButton
            variant="primary"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                Pause ({secondsElapsed}s / 55s)
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                {secondsElapsed > 0 && secondsElapsed < 55
                  ? `Resume (${secondsElapsed}s)`
                  : 'Play 55s Tour'}
              </>
            )}
          </ActionButton>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setSecondsElapsed(0);
              setActiveStep(1);
            }}
            aria-label="Reset 55 second breakdown"
            className="min-h-[48px] min-w-[48px] rounded-full bg-[#161616] border border-[#2A2A2A] text-white hover:border-[#E10000] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive 3D Three.js Validator Reactor */}
      <Solana3DScene activeStep={activeStep} onSelectStep={handleSelectStep} />

      {/* 3-Stage Stepper & Progress Rail */}
      <ClayCard className="p-5 sm:p-6 space-y-5">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-bold text-[#FF554A]">{chapter.label}</span>
            <span className="font-heading font-bold text-white tabular-nums">
              {secondsElapsed}s / {totalDuration}s
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#161616] overflow-hidden">
            <div
              className="h-full bg-[#E10000] rounded-full transition-all duration-200"
              style={{ width: `${Math.max(8, progressPct)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {SOLANA_CHAPTERS.map((c) => {
              const active = c.step === activeStep;
              return (
                <button
                  key={c.step}
                  type="button"
                  onClick={() => handleSelectStep(c.step)}
                  className={`min-h-[48px] px-3 py-2 rounded-[14px] border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                    active
                      ? 'bg-[#161616] border-[#E10000] text-white'
                      : 'bg-[#050505] border-[#2A2A2A] text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  <span className="font-heading font-bold text-xs text-[#FF554A] tabular-nums block">
                    {c.num}
                  </span>
                  <span className="font-heading font-bold text-xs sm:text-sm block truncate">
                    {c.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Chapter Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-[#2A2A2A]">
          <div className="lg:col-span-7 space-y-3">
            <h2 className="font-heading font-bold text-xl text-white">{chapter.headline}</h2>
            <p className="text-sm sm:text-base text-[#A3A3A3] leading-relaxed">{chapter.detail}</p>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {chapter.metrics.map((m) => (
                <div
                  key={m.label}
                  className="p-3 rounded-[14px] bg-[#161616] border border-[#2A2A2A]"
                >
                  <span className="text-[11px] text-[#A3A3A3] block">{m.label}</span>
                  <span className="font-heading font-bold text-base sm:text-lg text-white tabular-nums mt-0.5 block">
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-2.5">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[#A3A3A3]">
              Verification Checks
            </h3>
            {chapter.checklist.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-[14px] bg-[#161616] border border-[#2A2A2A] flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#FF554A] shrink-0 mt-0.5" />
                <span className="text-sm text-[#F2F2F2] leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </ClayCard>
    </div>
  );
};
