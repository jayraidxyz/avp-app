import 'dotenv/config';
import http from 'http';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_CHAT_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-4-neon',
  'gemini-4-carbon',
]);

const ALLOWED_IMAGE_SIZES = new Set(['1K', '2K', '4K']);
const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '16:9', '4:3', '3:4']);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  if (/PERMISSION_DENIED|403|API_KEY_INVALID/i.test(rawMessage)) {
    return {
      status: 403,
      message:
        'Gemini API access denied for this model. Please verify or select a billing-enabled key in Settings > Secrets.',
    };
  }
  if (/RESOURCE_EXHAUSTED|429|quota/i.test(rawMessage)) {
    return {
      status: 429,
      message:
        'Gemini API quota reached or paid-tier model selected. Switch to gemini-4-hydrogen / gemini-3.1-flash-lite or select a paid key in Settings > Secrets.',
    };
  }
  if (/NOT_FOUND|404/i.test(rawMessage)) {
    return {
      status: 404,
      message: `Requested Gemini model is unavailable: ${rawMessage}`,
    };
  }
  return {
    status: 500,
    message: rawMessage || 'Unexpected Gemini API error.',
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Multi-turn Gemini chat endpoint
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { messages, model = 'gemini-4-hydrogen', systemInstruction } = req.body ?? {};
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required.' });
      }
      if (typeof model !== 'string' || !ALLOWED_CHAT_MODELS.has(model)) {
        return res.status(400).json({ error: 'Unsupported Gemini model requested.' });
      }

      const sanitizedMessages = messages
        .filter(
          (m): m is { role: 'user' | 'model'; text: string } =>
            Boolean(m) &&
            (m.role === 'user' || m.role === 'model') &&
            typeof m.text === 'string' &&
            m.text.trim().length > 0,
        )
        .slice(-20);

      if (sanitizedMessages.length === 0) {
        return res.status(400).json({ error: 'At least one valid message is required.' });
      }

      const latest = sanitizedMessages[sanitizedMessages.length - 1];
      if (latest.role !== 'user') {
        return res.status(400).json({ error: 'Latest message must be from user.' });
      }

      const history = sanitizedMessages.slice(0, -1).map((m) => ({
        role: m.role,
        parts: [{ text: m.text.slice(0, 6000) }],
      }));

      const defaultSystem =
        typeof systemInstruction === 'string' && systemInstruction.trim().length > 0
          ? systemInstruction.trim().slice(0, 2000)
          : 'You are the Toxicology Archive Lead Analyst — a sharp, signal-over-noise Web3 researcher. Analyze protocols through the 3-Step Filter: (01) Incentives & emissions sustainability, (02) Load & throughput under stress, and (03) Real organic usage vs mercenary TVL. Be concise, factual, and direct.';

      const config: Record<string, unknown> = {
        systemInstruction: defaultSystem,
      };

      if (model === 'gemini-4-carbon') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const ai = getGeminiClient();
      const chat = ai.chats.create({
        model,
        history,
        config,
      });

      const response = await chat.sendMessage({
        message: latest.text.slice(0, 6000),
      });

      return res.json({
        text: response.text ?? '',
        model,
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Low-latency or high-thinking 3-Step Protocol Filter scan
  app.post('/api/gemini/quick-scan', async (req, res) => {
    try {
      const {
        protocolName,
        incentivesNotes = '',
        loadNotes = '',
        usageNotes = '',
        mode = 'fast',
      } = req.body ?? {};

      if (typeof protocolName !== 'string' || protocolName.trim().length === 0) {
        return res.status(400).json({ error: 'protocolName is required.' });
      }

      const cleanName = protocolName.trim().slice(0, 80);
      const isDeep = mode === 'deep';
      const model = isDeep ? 'gemini-4-carbon' : 'gemini-3.1-flash-lite';

      const prompt = [
        `Evaluate the Web3 protocol "${cleanName}" using the Toxicology Archive 3-Step Filter.`,
        incentivesNotes ? `Incentives context: ${String(incentivesNotes).slice(0, 800)}` : '',
        loadNotes ? `Load/Architecture context: ${String(loadNotes).slice(0, 800)}` : '',
        usageNotes ? `Real usage context: ${String(usageNotes).slice(0, 800)}` : '',
        'Score each dimension from 0 to 10 (10 = cleanest, lowest toxicity / highest resilience), pick verdict SIGNAL (>=7.5 avg), CAUTION (5-7.4), or TOXIC (<5), and provide a concise analytical summary.',
      ]
        .filter(Boolean)
        .join('\n');

      const config: Record<string, unknown> = {
        systemInstruction:
          'You are the Toxicology Archive automated 3-Step Filter scorer. Return strictly structured JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            incentivesScore: { type: Type.NUMBER, description: '0 to 10 score for incentives sustainability' },
            loadScore: { type: Type.NUMBER, description: '0 to 10 score for load resilience' },
            usageScore: { type: Type.NUMBER, description: '0 to 10 score for real organic usage' },
            verdict: { type: Type.STRING, description: 'One of SIGNAL, CAUTION, or TOXIC' },
            summary: { type: Type.STRING, description: 'Concise 2-3 sentence breakdown across all 3 steps' },
          },
          required: ['incentivesScore', 'loadScore', 'usageScore', 'verdict', 'summary'],
        },
      };

      if (isDeep) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);

      return res.json({
        model,
        incentivesScore: Math.max(0, Math.min(10, Number(parsed.incentivesScore) || 5)),
        loadScore: Math.max(0, Math.min(10, Number(parsed.loadScore) || 5)),
        usageScore: Math.max(0, Math.min(10, Number(parsed.usageScore) || 5)),
        verdict: ['SIGNAL', 'CAUTION', 'TOXIC'].includes(parsed.verdict) ? parsed.verdict : 'CAUTION',
        summary: String(parsed.summary || '').slice(0, 1800),
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // High-quality visual brief cover generator (gemini-3-pro-image-preview)
  app.post('/api/gemini/generate-image', async (req, res) => {
    try {
      const { prompt, imageSize = '1K', aspectRatio = '16:9' } = req.body ?? {};
      if (typeof prompt !== 'string' || prompt.trim().length < 3) {
        return res.status(400).json({ error: 'A descriptive prompt is required.' });
      }
      const safeSize = ALLOWED_IMAGE_SIZES.has(imageSize) ? imageSize : '1K';
      const safeRatio = ALLOWED_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : '16:9';

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            {
              text: `${prompt.trim().slice(0, 1000)}. Visual style: obsidian #050505 backdrop, saturated #E10000 crimson accent lighting, subtle clay-matte architectural forms, high-contrast editorial Web3 research aesthetic, zero garbled text.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: safeRatio,
            imageSize: safeSize,
          },
        },
      });

      let imageDataUrl: string | null = null;
      let caption = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageDataUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageDataUrl) {
        return res.status(502).json({ error: 'No image data returned by Gemini image model.' });
      }

      return res.json({
        imageDataUrl,
        caption: caption.trim(),
        imageSize: safeSize,
        aspectRatio: safeRatio,
        model: 'gemini-3-pro-image-preview',
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        ws: hmrDisabled ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Toxicology Archive server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
