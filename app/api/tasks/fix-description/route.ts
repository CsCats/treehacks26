import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, requirements, feedback } = body;

    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback is required to fix description' },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured or invalid. Add a valid key starting with "sk-" to your .env file.' },
        { status: 500 }
      );
    }

    // Truncate very long text to avoid token limits
    const truncatedTitle = (title || '').length > 200 ? (title || '').substring(0, 200) : (title || '');
    const truncatedDesc = (description || '').length > 1000 ? (description || '').substring(0, 1000) + '...' : (description || '');
    const truncatedReqs = (requirements || '').length > 500 ? (requirements || '').substring(0, 500) + '...' : (requirements || '');

    // Use GPT-4o-mini to rewrite the task based on feedback
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are helping improve task descriptions for a crowdsourced motion-capture platform. Based on the feedback provided, rewrite the task to be clearer, more specific, and actionable for contributors. Return ONLY a JSON object with improved fields (keep similar length and tone, just make it clearer): {"title": "...", "description": "...", "requirements": "..."}'
          },
          {
            role: 'user',
            content: `Current task:\nTitle: ${truncatedTitle}\nDescription: ${truncatedDesc}\nRequirements: ${truncatedReqs}\n\nFeedback from AI review: ${feedback}\n\nPlease improve this task based on the feedback. Keep it concise but clear.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      // Parse error for better user feedback
      let errorMessage = 'OpenAI API request failed';
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        errorMessage = errorText.substring(0, 200);
      }

      return NextResponse.json(
        { error: errorMessage, detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '{}';

    let improved;
    try {
      // Clean markdown code fences if present
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      improved = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse OpenAI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse AI response', detail: content },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title: improved.title || title,
      description: improved.description || description,
      requirements: improved.requirements || requirements,
    });
  } catch (err) {
    console.error('Fix description error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fix task description',
        detail: message,
      },
      { status: 500 }
    );
  }
}
