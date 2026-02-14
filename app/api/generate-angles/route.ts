import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Simple delay helper for rate limiting retries
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = body.imageBase64;

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    console.log('Calling Replicate with jd7h/zero123plusplus (latest version)...');

    // Retry up to 3 times for rate limiting
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        console.log(`Rate limited, waiting 12s before retry ${attempt + 1}/3...`);
        await sleep(12000);
      }

      try {
        // Zero123++ — turn a single image into 6 views from different 3D angles
        const output = await replicate.run(
          "jd7h/zero123plusplus:c69c6559a29011b576f1ff0371b3bc1add2856480c60520c7e9ce0b40a6e9052",
          {
            input: {
              image: imageBase64,
            },
          }
        );

        console.log('Replicate success! Output type:', typeof output, 'isArray:', Array.isArray(output));
        console.log('Replicate output:', JSON.stringify(output).substring(0, 500));

        // Normalize output: could be a single URL string, an array of URLs, or a FileOutput
        let angles: string[] = [];
        if (Array.isArray(output)) {
          angles = output.map((item) => String(item));
        } else if (typeof output === 'string') {
          angles = [output];
        } else if (output && typeof output === 'object') {
          // FileOutput or other object — try to get URL
          const str = String(output);
          if (str.startsWith('http')) {
            angles = [str];
          }
        }

        return NextResponse.json({ angles });
      } catch (err: unknown) {
        lastError = err;
        const errorStr = String(err);
        if (errorStr.includes('429') || errorStr.includes('Too Many Requests')) {
          continue; // retry on rate limit
        }
        throw err; // bail on other errors
      }
    }

    throw lastError;
  } catch (error: unknown) {
    // Sanitize error to avoid leaking API tokens in logs
    const safeMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating angles:', safeMessage);
    return NextResponse.json(
      { error: 'Failed to generate angles. Check your Replicate token and billing.' },
      { status: 500 }
    );
  }
}
