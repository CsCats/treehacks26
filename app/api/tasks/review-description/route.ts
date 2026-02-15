import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

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

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Use GPT-4o-mini for fast, cheap reviews
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Review this task:\n\n${text}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return NextResponse.json(
        { error: 'OpenAI API request failed', detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';

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
        error: 'Failed to review task description',
        detail: message,
      },
      { status: 500 }
    );
  }
}
