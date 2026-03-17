import { NextResponse } from "next/server";

import { generateQuoteForPersonality } from "@/lib/openaiQuoteGeneration";
import { validatePersonalityName } from "@/lib/personalitySubmission";
import { resolveImageForPersonality } from "@/lib/wikimediaImageLookup";

export const runtime = "nodejs";

function buildMockQuoteResponse(personalityName) {
  return {
    status: "success",
    display_name: personalityName,
    quote: `Build boldly, refine patiently, and let the work fill the room.`,
    disclaimer:
      "This quote is AI-generated in a local browser-loop mock mode. It is not an authentic quotation.",
    visual_hint: `A cinematic editorial portrait inspired by ${personalityName}`,
    image: {
      is_fallback: true,
      url: null,
      alt: `Fallback visual texture for ${personalityName}`,
      width: null,
      height: null,
      source_page_url: null,
      source_title: null,
    },
  };
}

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

  if (process.env.BROWSER_LOOP_MOCK === "1") {
    return NextResponse.json(buildMockQuoteResponse(validationResult.value));
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
