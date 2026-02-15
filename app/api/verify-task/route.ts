import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Models to try in order — each has its own separate quota
const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { frames, taskTitle, taskDescription, taskRequirements } = body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { error: 'At least one frame (base64 data URL) is required' },
        { status: 400 }
      );
    }

    if (!taskTitle) {
      return NextResponse.json(
        { error: 'taskTitle is required' },
        { status: 400 }
      );
    }

    const prompt = `You are a lenient quality-assurance reviewer for a crowdsourced robotics training-data platform. Your goal is to APPROVE submissions whenever reasonably possible.

A user was asked to record themselves performing a specific task. Below are ${frames.length} frame(s) sampled from the beginning, middle, and end of their video.

IMPORTANT CONTEXT:
- The video has a **pose detection skeleton overlay** (green lines and red dots on the body) — this is EXPECTED and normal. Ignore it completely.
- The user's face may be **intentionally blurred** for privacy — this is EXPECTED and normal. Ignore it completely.
- Focus ONLY on whether the person's body/hands appear to be doing something related to the task.

**Task title:** ${taskTitle}
**Task description:** ${taskDescription || 'N/A'}
**Task requirements:** ${taskRequirements || 'N/A'}

SCORING RULES (follow strictly):
- If you can see a person AND any object or action even loosely related to the task → verdict "pass", confidence 90-95.
- If the person is visible and appears to be doing any physical activity → verdict "pass", confidence 80-90.
- Only verdict "fail" if the frames are completely blank, show no person at all, or the person is clearly doing something totally unrelated (e.g. sleeping when asked to pick up a cup).
- When in doubt, always choose "pass".

Respond in this exact JSON format (no markdown, no code fences):
{
  "verdict": "pass" | "fail" | "uncertain",
  "confidence": <number 0-100>,
  "reason": "<one-sentence summary of what you observe>",
  "details": "<2-3 sentences describing what you see in the frames>"
}`;

    // Build inline image parts (cap at 15 frames)
    const imageParts = frames.slice(0, 15).map((dataUrl: string) => {
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      return {
        inlineData: {
          data: base64,
          mimeType: 'image/jpeg',
        },
      };
    });

    // Try each model, with retry on rate limit
    let lastError: unknown = null;

    for (const modelName of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retrying ${modelName} after 5s...`);
            await sleep(5000);
          }

          console.log(`Trying model: ${modelName} (attempt ${attempt + 1}), ${frames.length} frames`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([prompt, ...imageParts]);
          const text = result.response.text();

          let verification;
          try {
            const cleaned = text
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim();
            verification = JSON.parse(cleaned);
          } catch {
            console.error('Gemini returned non-JSON:', text);
            verification = {
              verdict: 'uncertain',
              confidence: 0,
              reason: 'Could not parse AI response',
              details: text,
            };
          }

          console.log(`✓ ${modelName} verdict: ${verification.verdict} (${verification.confidence}%)`);
          return NextResponse.json({ ...verification, model: modelName });
        } catch (err: unknown) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota')) {
            console.log(`⚠ ${modelName} rate limited, trying next...`);
            break; // skip to next model
          }
          // Other error — retry once, then move on
          if (attempt === 0) continue;
          console.error(`✗ ${modelName} failed:`, msg);
          break;
        }
      }
    }

    // All models exhausted
    const message = lastError instanceof Error ? lastError.message : 'All models rate limited';
    console.error('All Gemini models exhausted:', message);
    return NextResponse.json(
      { error: 'Rate limited on all models. Please wait a minute and try again.' },
      { status: 429 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gemini VLM verification error:', message);
    return NextResponse.json(
      { error: `Verification failed: ${message}` },
      { status: 500 }
    );
  }
}
