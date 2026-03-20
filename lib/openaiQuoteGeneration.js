import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";

const ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "display_name",
    "style_cues",
    "visual_hint_seed",
    "reason_code",
    "user_message",
  ],
  properties: {
    status: {
      type: "string",
      enum: ["ready_for_generation", "no_result"],
    },
    display_name: {
      anyOf: [
        {
          type: "string",
          minLength: 1,
        },
        {
          type: "null",
        },
      ],
    },
    style_cues: {
      anyOf: [
        {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "string",
            minLength: 1,
          },
        },
        {
          type: "null",
        },
      ],
    },
    visual_hint_seed: {
      anyOf: [
        {
          type: "string",
          minLength: 1,
        },
        {
          type: "null",
        },
      ],
    },
    reason_code: {
      anyOf: [
        {
          type: "string",
          enum: [
            "ambiguous_personality",
            "unknown_personality",
            "low_confidence",
            "unsafe_request",
          ],
        },
        {
          type: "null",
        },
      ],
    },
    user_message: {
      anyOf: [
        {
          type: "string",
          minLength: 1,
        },
        {
          type: "null",
        },
      ],
    },
  },
};

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

const ANALYSIS_INSTRUCTIONS = `
You analyze a submitted personality name for a synthetic quote-generation app.

Your job is to decide whether the app can safely produce a strong, recognizable
quote inspired by the named person or character.

Follow these rules:
- Return strict JSON that matches the provided schema.
- Strong recognizable alignment is allowed for fictional characters, deceased
  public figures, and living public figures alike.
- Recognizability should come from themes, cadence, rhetorical shape,
  sensibility, and familiar worldview.
- Do not rely on softer matching for living people as the safety control.
- If the name is ambiguous, weakly recognized, unsafe, or cannot be matched
  cleanly without drifting into copied signature wording or authentic-sounding
  direct testimony, return status "no_result".
- For "ready_for_generation", provide 3 to 6 short style cues that will help a
  second model call generate a recognizable but original quote.
- For "ready_for_generation", set reason_code and user_message to null.
- For "no_result", set display_name, style_cues, and visual_hint_seed to null.
- Do not include catchphrases, signature lines, or copied wording in style cues.
- The visual_hint_seed should be a short, high-level visual theme phrase.
- The user_message should be concise and helpful for retrying.
`.trim();

const QUOTE_GENERATION_INSTRUCTIONS = `
You generate one short, original quote for a synthetic quote-generation app.

Follow these rules:
- Return strict JSON that matches the provided schema.
- Always return status "success" in this step.
- The quote must feel recognizably aligned with the named personality through
  themes, cadence, rhetorical shape, sensibility, and worldview.
- The quote must be original and must not reproduce known quotations.
- Do not copy signature wording, catchphrases, or close paraphrases of known
  quotations.
- Do not write fake first-person testimony or wording that reads like authentic
  direct speech from the named person.
- Keep the quote short, punchy, and generally inspirational unless the supplied
  style cues strongly justify a different rhetorical feel.
- The disclaimer must clearly say the quote is AI-generated and style-inspired.
- The visual_hint must be a short, high-level visual theme phrase for later
  image lookup.
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

function parseAnalysisResponse(outputText) {
  const parsedResponse = JSON.parse(outputText);

  if (parsedResponse?.status === "ready_for_generation") {
    if (
      typeof parsedResponse.display_name !== "string" ||
      !Array.isArray(parsedResponse.style_cues) ||
      typeof parsedResponse.visual_hint_seed !== "string"
    ) {
      throw new Error(
        "OpenAI analysis response did not match the expected ready shape.",
      );
    }

    const styleCues = parsedResponse.style_cues
      .map((cue) => (typeof cue === "string" ? cue.trim() : ""))
      .filter(Boolean);

    if (styleCues.length < 3) {
      throw new Error("OpenAI analysis response did not include enough style cues.");
    }

    return {
      status: "ready_for_generation",
      displayName: parsedResponse.display_name.trim(),
      styleCues,
      visualHintSeed: parsedResponse.visual_hint_seed.trim(),
    };
  }

  if (parsedResponse?.status === "no_result") {
    if (
      typeof parsedResponse.reason_code !== "string" ||
      typeof parsedResponse.user_message !== "string"
    ) {
      throw new Error(
        "OpenAI analysis response did not match the expected no_result shape.",
      );
    }

    return {
      status: "no_result",
      reasonCode: parsedResponse.reason_code.trim(),
      userMessage: parsedResponse.user_message.trim(),
    };
  }

  throw new Error("OpenAI analysis response did not match an expected shape.");
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

async function createStructuredResponse({
  client,
  instructions,
  input,
  schemaName,
  schema,
}) {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
    instructions,
    input,
    reasoning: {
      effort: "low",
    },
    max_output_tokens: 700,
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        schema,
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

  return outputText;
}

async function analyzePersonality({ client, personalityName }) {
  const outputText = await createStructuredResponse({
    client,
    instructions: ANALYSIS_INSTRUCTIONS,
    input: `Personality name: ${personalityName}`,
    schemaName: "personality_analysis_result",
    schema: ANALYSIS_RESPONSE_SCHEMA,
  });

  return parseAnalysisResponse(outputText);
}

async function generateQuoteFromAnalysis({ client, personalityName, analysis }) {
  const styleCueText = analysis.styleCues.map((cue) => `- ${cue}`).join("\n");
  const outputText = await createStructuredResponse({
    client,
    instructions: QUOTE_GENERATION_INSTRUCTIONS,
    input: `
Submitted personality name: ${personalityName}
Display name: ${analysis.displayName}
Style cues:
${styleCueText}
Suggested visual hint seed: ${analysis.visualHintSeed}
`.trim(),
    schemaName: "quote_generation_result",
    schema: QUOTE_RESPONSE_SCHEMA,
  });

  return parseGeneratedQuoteResponse(outputText);
}

export async function generateQuoteForPersonality(personalityName) {
  const client = getOpenAIClient();
  const analysis = await analyzePersonality({ client, personalityName });

  if (analysis.status === "no_result") {
    return analysis;
  }

  return generateQuoteFromAnalysis({ client, personalityName, analysis });
}
