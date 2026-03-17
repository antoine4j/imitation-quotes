import { NextResponse } from "next/server";

import { generateQuoteForPersonality } from "@/lib/openaiQuoteGeneration";
import { validatePersonalityName } from "@/lib/personalitySubmission";

export const runtime = "nodejs";

export async function POST(request) {
  let requestBody;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Send a valid JSON request body.",
      },
      { status: 400 },
    );
  }

  const validationResult = validatePersonalityName(
    requestBody?.personalityName,
  );

  if (!validationResult.ok) {
    return NextResponse.json(
      {
        status: "error",
        message: validationResult.message,
      },
      { status: 400 },
    );
  }

  try {
    const generatedQuote = await generateQuoteForPersonality(
      validationResult.value,
    );

    return NextResponse.json({
      status: generatedQuote.status,
      display_name: generatedQuote.displayName,
      quote: generatedQuote.quote,
      disclaimer: generatedQuote.disclaimer,
      visual_hint: generatedQuote.visualHint,
    });
  } catch (error) {
    console.error("Quote generation failed.", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Unable to generate a quote right now.",
      },
      { status: 500 },
    );
  }
}
