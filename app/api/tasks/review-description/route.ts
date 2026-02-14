import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_REVIEW_MODEL || 'llama3.1';

const SYSTEM_PROMPT = `You are reviewing task descriptions for a crowdsourced motion-capture platform. Contributors will read these to know what to record. Rate how clear, specific, and actionable the task is from 1 to 5:
- 1: Vague or missing; a contributor would not know what to do.
- 2: Very unclear; missing key details (what to do, duration, angle, quality).
- 3: Okay but could be clearer; add more detail or structure.
- 4: Good and actionable; minor improvements possible.
- 5: Clear, specific, and descriptive; ready for contributors.

Then give one short sentence on how to improve it (or "No change needed" if 4 or 5).

You must reply with exactly two lines, no other text:
LINE 1: SCORE: N
LINE 2: FEEDBACK: your one sentence

Example:
SCORE: 3
FEEDBACK: Add a suggested duration (e.g. 30-60 seconds) and camera angle.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title = '', description = '', requirements = '' } = body;
    const text = [title, description, requirements].filter(Boolean).join('\n\n');
    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Provide at least title or description to review' },
        { status: 400 }
      );
    }

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Review this task:\n\n${text}`,
          },
        ],
        stream: false,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json(
        {
          error: 'Ollama failed. Is it running? Run: ollama pull llama3.1',
          detail: t,
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const raw = data.message?.content?.trim() || '';

    let score = 3;
    let feedback = 'Could not parse feedback.';

    const scoreMatch = raw.match(/SCORE:\s*(\d)/i);
    if (scoreMatch) {
      score = Math.min(5, Math.max(1, parseInt(scoreMatch[1], 10)));
    }
    const feedbackMatch = raw.match(/FEEDBACK:\s*(.+?)(?:\n|$)/is);
    if (feedbackMatch) {
      feedback = feedbackMatch[1].trim();
    }

    return NextResponse.json({ score, feedback });
  } catch (err) {
    console.error('Review description error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to review. Is Ollama running? Run: ollama pull llama3.1',
        detail: message,
      },
      { status: 500 }
    );
  }
}
