import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Models to try in order — all support vision/multimodal and each has its own rate-limit bucket.
// Spread across model families so quota exhaustion on one doesn't block the others.
const MODELS = [
  'gemini-2.5-flash',        // newest flash — fast, cheap, multimodal
  'gemini-2.0-flash',        // proven fast multimodal, separate quota bucket
  'gemini-2.5-pro',          // flagship high-quality multimodal
  'gemini-1.5-flash',        // older flash, separate quota bucket
  'gemini-1.5-pro',          // older pro, separate quota bucket
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

    // Build inline image parts — cap at 3 frames to stay well within token limits
    const imageParts = frames.slice(0, 3).map((dataUrl: string) => {
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      return {
        inlineData: {
          data: base64,
          mimeType: 'image/jpeg',
        },
      };
    });

    // Try each model in order. On rate-limit (429) skip to the next model.
    // On other errors retry once, then move on.
    let lastError: unknown = null;
    let rateLimitedCount = 0;

    for (let mi = 0; mi < MODELS.length; mi++) {
      const modelName = MODELS[mi];

      // Small delay between model switches to avoid burst-triggering shared project limits
      if (mi > 0) {
        console.log(`Switching to ${modelName}, waiting 2s...`);
        await sleep(2000);
      }

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retrying ${modelName} after 5s...`);
            await sleep(5000);
          }

          console.log(`Trying model: ${modelName} (attempt ${attempt + 1}), ${imageParts.length} frames`);
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

          const isRateLimit =
            msg.includes('429') ||
            msg.includes('Too Many Requests') ||
            msg.includes('quota') ||
            msg.includes('RESOURCE_EXHAUSTED');

          if (isRateLimit) {
            console.log(`⚠ ${modelName} rate-limited (429), skipping to next model...`);
            rateLimitedCount++;
            break; // skip to next model
          }

          // Non-rate-limit error — retry once, then move on
          if (attempt === 0) {
            console.log(`⚠ ${modelName} error (will retry): ${msg}`);
            continue;
          }
          console.error(`✗ ${modelName} failed after 2 attempts: ${msg}`);
          break;
        }
      }
    }

    // All models exhausted
    const message = lastError instanceof Error ? lastError.message : 'All models exhausted';
    console.error(`All ${MODELS.length} Gemini models exhausted (${rateLimitedCount} rate-limited):`, message);
    return NextResponse.json(
      {
        error: rateLimitedCount > 0
          ? 'All models rate-limited. Please wait a minute and try again.'
          : `Verification failed across all models: ${message}`,
      },
      { status: rateLimitedCount > 0 ? 429 : 500 }
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
