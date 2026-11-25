import React, { useRef, useState } from 'react';
import { Send, Image as ImageIcon, Brain, Zap, Download, AlertCircle } from 'lucide-react';
import { ClayCard } from './ui/ClayCard';
import { ActionButton } from './ui/ActionButton';
import { CrownIcon } from './ui/CrownIcon';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

const CHAT_MODELS = [
  { id: 'gemini-4-hydrogen', label: 'Hydrogen (Balanced)', desc: 'General research Q&A' },
  { id: 'gemini-3.1-flash-lite', label: 'Flash Lite (Fast)', desc: 'Low-latency response' },
  { id: 'gemini-4-neon', label: 'Neon (Complex)', desc: 'Deep tokenomics math' },
  { id: 'gemini-4-carbon', label: 'Carbon (High Thinking)', desc: 'ThinkingLevel.HIGH' },
] as const;

const IMAGE_SIZES = ['1K', '2K', '4K'] as const;
const ASPECT_RATIOS = ['16:9', '1:1', '4:3'] as const;

export const ResearchStudio: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Drop a protocol name, tokenomics claim, or validator question. I filter through Incentives, Load, and Real Usage with zero hype.',
      modelUsed: 'gemini-4-hydrogen',
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-4-hydrogen');
  const [rolePreset, setRolePreset] = useState<string>(
    'You are the Toxicology Archive Lead Analyst. Evaluate Web3 protocols ruthlessly across Incentives, Load, and Real Usage.',
  );
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  // Visual Cover Studio (gemini-3-pro-image-preview)
  const [imagePrompt, setImagePrompt] = useState(
    'Minimalist matte black and crimson crypto validator vault sculpture with glowing red crown crest',
  );
  const [imageSize, setImageSize] = useState<(typeof IMAGE_SIZES)[number]>('1K');
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIOS)[number]>('16:9');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextThread = [...messages, userMsg];
    setMessages(nextThread);
    setInput('');
    setChatError(null);
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          systemInstruction: rolePreset,
          messages: nextThread.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from Gemini.');
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `model_${Date.now()}`,
          role: 'model',
          text: data.text || 'No response text returned.',
          modelUsed: data.model || selectedModel,
        },
      ]);
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setChatLoading(false);
    }
  };

  const generateCover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || imageLoading) return;

    setImageLoading(true);
    setImageError(null);
    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          imageSize,
          aspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Image generation failed.');
      }
      setGeneratedImage(data.imageDataUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image generation failed.');
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Multi-turn Gemini Research Chat */}
      <ClayCard className="p-5 sm:p-6 flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#FF554A] font-heading font-bold uppercase tracking-wider">
                <CrownIcon className="w-4 h-4" />
                <span>Research Assistant</span>
              </div>
              <h3 className="font-heading font-bold text-xl text-white mt-1">
                Signal Analyst Chat
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#A3A3A3]">
              {selectedModel === 'gemini-4-carbon' ? (
                <Brain className="w-4 h-4 text-[#FF554A]" />
              ) : (
                <Zap className="w-4 h-4 text-[#FF554A]" />
              )}
              <span className="tabular-nums">{selectedModel}</span>
            </div>
          </div>

          {/* Model & Persona Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="chat-model-select" className="block text-xs text-[#A3A3A3] mb-1">
                Model Engine
              </label>
              <select
                id="chat-model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#161616] border border-[#2A2A2A] px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#FF554A]"
              >
                {CHAT_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.desc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="chat-role-select" className="block text-xs text-[#A3A3A3] mb-1">
                Analyst Role
              </label>
              <select
                id="chat-role-select"
                value={rolePreset}
                onChange={(e) => setRolePreset(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[#161616] border border-[#2A2A2A] px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#FF554A]"
              >
                <option value="You are the Toxicology Archive Lead Analyst. Evaluate Web3 protocols ruthlessly across Incentives, Load, and Real Usage.">
                  3-Step Toxicologist
                </option>
                <option value="You are a Solana L1 systems engineer analyzing Proof of History, Turbine, QUIC QoS, and local fee markets.">
                  Solana Load Engineer
                </option>
                <option value="You are a Web3 tokenomics auditor inspecting insider unlock schedules, float, and fee switch value capture.">
                  Tokenomics Auditor
                </option>
              </select>
            </div>
          </div>

          {/* Scrollable Thread */}
          <div
            className="h-[280px] overflow-y-auto space-y-3 pr-1 border-y border-[#2A2A2A] py-3"
            aria-live="polite"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-3.5 rounded-[16px] text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#161616] border border-[#E10000]/50 text-white ml-6'
                    : 'bg-[#050505] border border-[#2A2A2A] text-[#F2F2F2] mr-4'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#A3A3A3] mb-1">
                  <span className="font-heading font-bold text-[#FF554A]">
                    {m.role === 'user' ? 'You' : 'Analyst'}
                  </span>
                  {m.modelUsed && <span>{m.modelUsed}</span>}
                </div>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
              </div>
            ))}

            {chatLoading && (
              <div className="p-3.5 rounded-[16px] bg-[#050505] border border-[#2A2A2A] mr-4 space-y-2">
                <div className="h-3 w-24 bg-[#161616] rounded animate-pulse" />
                <div className="h-3 w-full bg-[#161616] rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-[#161616] rounded animate-pulse" />
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {chatError && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-[#161616] border border-[#E10000] text-xs text-[#FF554A]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{chatError}</span>
            </div>
          )}
        </div>

        <form onSubmit={sendMessage} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about incentives, load, or tokenomics..."
            aria-label="Ask Toxicology Research Assistant"
            className="flex-1 min-h-[48px] rounded-full bg-[#161616] border border-[#2A2A2A] px-4 text-sm text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#FF554A]"
          />
          <ActionButton
            type="submit"
            disabled={chatLoading || !input.trim()}
            aria-label="Send message"
            className="px-5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </ActionButton>
        </form>
      </ClayCard>

      {/* High-Resolution Cover Art Generator (gemini-3-pro-image-preview) */}
      <ClayCard className="p-5 sm:p-6 flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#FF554A] font-heading font-bold uppercase tracking-wider">
              <ImageIcon className="w-4 h-4" />
              <span>Visual Brief Studio · gemini-3-pro-image-preview</span>
            </div>
            <h3 className="font-heading font-bold text-xl text-white mt-1">
              Research Cover Generator
            </h3>
            <p className="text-sm text-[#A3A3A3] mt-1">
              Render custom obsidian &amp; crimson cover art for research briefs at 1K, 2K, or 4K resolution.
            </p>
          </div>

          <form onSubmit={generateCover} className="space-y-3">
            <div>
              <label htmlFor="cover-prompt" className="block text-xs text-[#A3A3A3] mb-1">
                Artwork Prompt
              </label>
              <textarea
                id="cover-prompt"
                rows={2}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="w-full rounded-2xl bg-[#161616] border border-[#2A2A2A] p-3 text-sm text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#FF554A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-xs text-[#A3A3A3] mb-1.5">Resolution</span>
                <div className="flex items-center gap-1.5" role="group" aria-label="Image resolution">
                  {IMAGE_SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setImageSize(sz)}
                      className={`flex-1 min-h-[44px] rounded-full text-xs font-heading font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                        imageSize === sz
                          ? 'bg-[#E10000] text-white'
                          : 'bg-[#161616] text-[#A3A3A3] border border-[#2A2A2A] hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs text-[#A3A3A3] mb-1.5">Aspect Ratio</span>
                <div className="flex items-center gap-1.5" role="group" aria-label="Image aspect ratio">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`flex-1 min-h-[44px] rounded-full text-xs font-heading font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                        aspectRatio === ratio
                          ? 'bg-white text-[#050505]'
                          : 'bg-[#161616] text-[#A3A3A3] border border-[#2A2A2A] hover:text-white'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ActionButton
              type="submit"
              variant="secondary"
              disabled={imageLoading || !imagePrompt.trim()}
              className="w-full"
            >
              {imageLoading ? `Rendering ${imageSize} Artwork...` : `Generate ${imageSize} Cover`}
            </ActionButton>
          </form>

          {imageError && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-[#161616] border border-[#E10000] text-xs text-[#FF554A]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{imageError}</span>
            </div>
          )}
        </div>

        {/* Image Preview Frame */}
        <div className="rounded-[16px] border border-[#2A2A2A] bg-[#050505] overflow-hidden min-h-[180px] flex items-center justify-center relative">
          {imageLoading ? (
            <div className="w-full h-[180px] bg-[#161616] animate-pulse flex items-center justify-center">
              <span className="text-xs text-[#A3A3A3]">Synthesizing {imageSize} brief cover...</span>
            </div>
          ) : generatedImage ? (
            <div className="w-full relative group">
              <img
                src={generatedImage}
                alt="Generated Toxicology Archive Brief Cover"
                referrerPolicy="no-referrer"
                className="w-full max-h-[240px] object-cover"
              />
              <a
                href={generatedImage}
                download={`toxicology-cover-${imageSize.toLowerCase()}.png`}
                aria-label="Download generated cover artwork"
                className="absolute bottom-3 right-3 min-h-[44px] min-w-[44px] px-4 rounded-full bg-[#0E0E0E]/90 border border-[#2A2A2A] text-white text-xs font-heading font-bold flex items-center gap-1.5 hover:border-[#E10000]"
              >
                <Download className="w-4 h-4" />
                Save
              </a>
            </div>
          ) : (
            <div className="p-6 text-center space-y-2">
              <CrownIcon className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-xs text-[#A3A3A3]">
                Preview canvas ready. Select 1K, 2K, or 4K and render.
              </p>
            </div>
          )}
        </div>
      </ClayCard>
    </div>
  );
};
