import React, { useState } from 'react';
import { AlertCircle, Brain, CheckCircle2, Trash2, Zap } from 'lucide-react';
import { THREE_STEP_PILLARS } from '../data/toxicologyData';
import { SavedAudit } from '../hooks/useToxicologyAuth';
import { ClayCard } from '../components/ui/ClayCard';
import { CrownIcon } from '../components/ui/CrownIcon';
import { ActionButton } from '../components/ui/ActionButton';
import { MascotMoment } from '../components/ui/MascotMoment';

interface ThreeStepPageProps {
  audits: SavedAudit[];
  isSignedIn: boolean;
  onSaveAudit: (audit: Omit<SavedAudit, 'id' | 'userId'>) => Promise<void>;
  onDeleteAudit: (id: string) => Promise<void>;
  onSignIn: () => Promise<void>;
}

export const ThreeStepPage: React.FC<ThreeStepPageProps> = ({
  audits,
  isSignedIn,
  onSaveAudit,
  onDeleteAudit,
  onSignIn,
}) => {
  const [protocolName, setProtocolName] = useState('Solana 1.0');
  const [incentivesScore, setIncentivesScore] = useState(8);
  const [loadScore, setLoadScore] = useState(9);
  const [usageScore, setUsageScore] = useState(8);
  const [notes, setNotes] = useState(
    'Base fee 50% burn + priority fees; QUIC local fee markets isolate contention; strong organic USDC and DEX turnover.',
  );
  const [scanLoading, setScanLoading] = useState<'fast' | 'deep' | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const avg = (incentivesScore + loadScore + usageScore) / 3;
  const computedVerdict: 'SIGNAL' | 'CAUTION' | 'TOXIC' =
    avg >= 7.5 ? 'SIGNAL' : avg >= 5 ? 'CAUTION' : 'TOXIC';

  const runAiScan = async (mode: 'fast' | 'deep') => {
    if (!protocolName.trim() || scanLoading) return;
    setScanLoading(mode);
    setScanError(null);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/gemini/quick-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolName: protocolName.trim(),
          incentivesNotes: notes,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gemini scan failed.');
      }
      setIncentivesScore(Math.round(Number(data.incentivesScore) || 5));
      setLoadScore(Math.round(Number(data.loadScore) || 5));
      setUsageScore(Math.round(Number(data.usageScore) || 5));
      if (data.summary) setNotes(data.summary);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setScanLoading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    await onSaveAudit({
      protocolName: protocolName.trim() || 'Untitled Protocol',
      incentivesScore,
      loadScore,
      usageScore,
      verdict: computedVerdict,
      notes,
    });
    if (isSignedIn) {
      setSaveMessage('Saved to Firestore vault.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-wider text-[#FF554A]">
          <CrownIcon className="w-4 h-4" />
          <span>Protocol Triage</span>
        </div>
        <h1 className="font-heading font-bold text-[28px] sm:text-[34px] text-white leading-tight">
          3-Step Toxicology Filter
        </h1>
        <p className="text-sm sm:text-base text-[#A3A3A3]">
          Score any Web3 protocol across Incentives, Load, and Real Usage. Run instant AI triage or deep Carbon thinking audits.
        </p>
      </div>

      {/* Big 01 / 02 / 03 Rubric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {THREE_STEP_PILLARS.map((pillar) => (
          <ClayCard key={pillar.num} className="p-5 sm:p-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="font-heading font-bold text-[28px] text-[#FF554A] tabular-nums leading-none">
                {pillar.num}
              </span>
              <CrownIcon className="w-4 h-4 opacity-70" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white">{pillar.title}</h2>
              <p className="text-sm text-[#A3A3A3] mt-1.5 leading-relaxed">{pillar.summary}</p>
            </div>
            <ul className="space-y-2 pt-2 border-t border-[#2A2A2A]">
              {pillar.checks.map((chk, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-[#F2F2F2] leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF554A] shrink-0 mt-0.5" />
                  <span>{chk}</span>
                </li>
              ))}
            </ul>
          </ClayCard>
        ))}
      </div>

      {/* Interactive Evaluator + Saved Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <ClayCard className="lg:col-span-7 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading font-bold text-xl text-white">Live Filter Evaluator</h2>
              <p className="text-xs text-[#A3A3A3] mt-0.5">
                Low-latency scan uses gemini-3.1-flash-lite · Deep audit uses gemini-4-carbon
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#A3A3A3] block">Verdict</span>
              <span className="font-heading font-bold text-lg text-[#FF554A] tabular-nums">
                {computedVerdict} · {avg.toFixed(1)}/10
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="protocol-name" className="block text-xs text-[#A3A3A3] mb-1.5">
                Protocol / Asset Name
              </label>
              <input
                id="protocol-name"
                type="text"
                maxLength={80}
                value={protocolName}
                onChange={(e) => setProtocolName(e.target.value)}
                placeholder="e.g., Solana, Jito, Ethena..."
                className="w-full min-h-[48px] rounded-full bg-[#161616] border border-[#2A2A2A] px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF554A]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: '01 Incentives', val: incentivesScore, set: setIncentivesScore },
                { label: '02 Load', val: loadScore, set: setLoadScore },
                { label: '03 Real Usage', val: usageScore, set: setUsageScore },
              ].map((s) => (
                <div key={s.label} className="p-3.5 rounded-[16px] bg-[#161616] border border-[#2A2A2A] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-heading font-bold text-white">{s.label}</span>
                    <span className="font-heading font-bold text-[#FF554A] tabular-nums">
                      {s.val}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={s.val}
                    onChange={(e) => s.set(Number(e.target.value))}
                    aria-label={s.label}
                    className="w-full accent-[#E10000] cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <div>
              <label htmlFor="audit-notes" className="block text-xs text-[#A3A3A3] mb-1.5">
                Research Notes
              </label>
              <textarea
                id="audit-notes"
                rows={3}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-[16px] bg-[#161616] border border-[#2A2A2A] p-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FF554A]"
              />
            </div>

            {scanError && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-xl bg-[#161616] border border-[#E10000] text-xs text-[#FF554A]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}

            {saveMessage && (
              <p className="text-xs text-white font-medium">{saveMessage}</p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <ActionButton
                type="submit"
                variant="primary"
                className="flex-1 sm:flex-none"
              >
                {isSignedIn ? 'Save Audit to Vault' : 'Sign In & Save Audit'}
              </ActionButton>
              <ActionButton
                type="button"
                variant="secondary"
                disabled={scanLoading !== null || !protocolName.trim()}
                onClick={() => runAiScan('fast')}
              >
                <Zap className="w-4 h-4" />
                {scanLoading === 'fast' ? 'Scanning...' : 'Fast Scan'}
              </ActionButton>
              <ActionButton
                type="button"
                variant="ghost"
                disabled={scanLoading !== null || !protocolName.trim()}
                onClick={() => runAiScan('deep')}
              >
                <Brain className="w-4 h-4 text-[#FF554A]" />
                {scanLoading === 'deep' ? 'Thinking...' : 'Deep Audit'}
              </ActionButton>
            </div>
          </form>
        </ClayCard>

        {/* Saved Protocol Audits from Firestore */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="font-heading font-bold text-sm uppercase tracking-wider text-[#A3A3A3]">
            Saved Protocol Audits
          </h2>

          {!isSignedIn ? (
            <MascotMoment
              mode="empty"
              title="Sign In to Sync Audits"
              subtitle="Connect with Google to store your 3-Step protocol evaluations and archive bookmarks in Firestore."
              actionLabel="Sign In with Google"
              onAction={onSignIn}
            />
          ) : audits.length === 0 ? (
            <MascotMoment
              mode="empty"
              title="ALL CLEAR. NO NOISE."
              subtitle="No saved audits yet. Evaluate a protocol on the left and save it to your private vault."
            />
          ) : (
            <div className="space-y-3">
              {audits.map((a) => (
                <ClayCard key={a.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
                        <span className="font-heading font-bold text-[#FF554A]">{a.verdict}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {a.incentivesScore}/{a.loadScore}/{a.usageScore}
                        </span>
                      </div>
                      <h3 className="font-heading font-bold text-base text-white mt-0.5">
                        {a.protocolName}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteAudit(a.id)}
                      aria-label={`Delete audit for ${a.protocolName}`}
                      className="min-h-[44px] min-w-[44px] rounded-full bg-[#161616] border border-[#2A2A2A] text-[#A3A3A3] hover:text-[#FF554A] hover:border-[#E10000] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#A3A3A3] leading-relaxed">{a.notes}</p>
                </ClayCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
