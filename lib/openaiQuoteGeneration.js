import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";

const QUOTE_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["status", "display_name", "quote", "disclaimer", "visual_hint"],
  properties: {
    status: {
      type: "string",
      const: "success",
    },
    display_name: {
      type: "string",
      minLength: 1,
    },
    quote: {
      type: "string",
      minLength: 1,
    },
    disclaimer: {
      type: "string",
      minLength: 1,
    },
    visual_hint: {
      type: "string",
      minLength: 1,
    },
  },
};

const QUOTE_GENERATION_INSTRUCTIONS = `
You generate one short, original quote inspired by a public personality's broad
public style or themes.

Follow these rules:
- Return strict JSON that matches the provided schema.
- Always return status "success" for valid requests in this flow.
- The quote must be original and must not reproduce known quotations.
- Keep the quote short, punchy, and generally inspirational rather than comedic.
- Avoid direct imitation, catchphrases, or fake-authentic phrasing.
- Never present the output as authentic words spoken or written by the person.
- The disclaimer must clearly say the quote is AI-generated and style-inspired.
- The visual_hint must be a short, high-level visual theme phrase for later image lookup.
- For living people, soften imitation further and stay broad.
`.trim();

let openAIClient;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openAIClient;
}

function parseGeneratedQuoteResponse(outputText) {
  const parsedResponse = JSON.parse(outputText);

  if (
    parsedResponse?.status !== "success" ||
    typeof parsedResponse.display_name !== "string" ||
    typeof parsedResponse.quote !== "string" ||
    typeof parsedResponse.disclaimer !== "string" ||
    typeof parsedResponse.visual_hint !== "string"
  ) {
    throw new Error("OpenAI response did not match the expected success shape.");
  }

  return {
    status: parsedResponse.status,
    displayName: parsedResponse.display_name.trim(),
    quote: parsedResponse.quote.trim(),
    disclaimer: parsedResponse.disclaimer.trim(),
    visualHint: parsedResponse.visual_hint.trim(),
  };
}

function extractResponseText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  const collectedText = [];

  for (const outputItem of response.output || []) {
    if (outputItem.type !== "message") {
      continue;
    }

    for (const contentItem of outputItem.content || []) {
      if (contentItem.type === "output_text" && contentItem.text) {
        collectedText.push(contentItem.text);
      }
    }
  }

  return collectedText.join("").trim();
}

export async function generateQuoteForPersonality(personalityName) {
  const client = getOpenAIClient();

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    instructions: QUOTE_GENERATION_INSTRUCTIONS,
    input: `Personality name: ${personalityName}`,
    reasoning: {
      effort: "low",
    },
    max_output_tokens: 600,
    text: {
      format: {
        type: "json_schema",
        name: "quote_generation_result",
        schema: QUOTE_RESPONSE_SCHEMA,
        strict: true,
      },
    },
  });

  const outputText = extractResponseText(response);

  if (!outputText) {
    const incompleteReason = response.incomplete_details?.reason;

    throw new Error(
      `OpenAI response did not include text content. Response status: ${
        response.status || "unknown"
      }${incompleteReason ? `, reason: ${incompleteReason}` : ""}.`,
    );
  }

  return parseGeneratedQuoteResponse(outputText);
}
