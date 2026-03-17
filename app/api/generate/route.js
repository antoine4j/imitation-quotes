import { NextResponse } from "next/server";

import { generateQuoteForPersonality } from "@/lib/openaiQuoteGeneration";
import { validatePersonalityName } from "@/lib/personalitySubmission";
import { resolveImageForPersonality } from "@/lib/wikimediaImageLookup";

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
    const image = await resolveImageForPersonality(
      generatedQuote.displayName,
      generatedQuote.visualHint,
    );

    return NextResponse.json({
      status: generatedQuote.status,
      display_name: generatedQuote.displayName,
      quote: generatedQuote.quote,
      disclaimer: generatedQuote.disclaimer,
      visual_hint: generatedQuote.visualHint,
      image: {
        is_fallback: image.isFallback,
        url: image.url,
        alt: image.alt,
        width: image.width,
        height: image.height,
        source_page_url: image.sourcePageUrl,
        source_title: image.sourceTitle,
      },
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
