import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export type Thinking = 'low' | 'medium' | 'high';
const LEVEL: Record<Thinking, ThinkingLevel> = { low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM, high: ThinkingLevel.HIGH };

let client: GoogleGenAI | null = null;
let clientKey = '';

/** Plain text from one prompt. Throws on an empty answer so callers never save blanks. */
export async function generateText(
  apiKey: string,
  model: string,
  prompt: string,
  opts: { temperature?: number; timeoutMs?: number; jsonSchema?: unknown; thinking?: Thinking } = {},
): Promise<string> {
  if (!client || clientKey !== apiKey) {
    client = new GoogleGenAI({ apiKey });
    clientKey = apiKey;
  }
  const res = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: opts.temperature ?? 0.6,
      ...(opts.jsonSchema ? { responseMimeType: 'application/json', responseJsonSchema: opts.jsonSchema } : {}),
      ...(opts.thinking ? { thinkingConfig: { thinkingLevel: LEVEL[opts.thinking] } } : {}),
      httpOptions: { timeout: opts.timeoutMs ?? 30_000 },
    },
  });
  const text = (res.text ?? '').trim();
  if (!text) throw new Error('Empty answer from model');
  return text;
}
