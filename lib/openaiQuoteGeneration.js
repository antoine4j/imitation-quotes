import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_MALFORMED_JSON_RETRY_COUNT = 1;

const QUOTE_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "display_name",
    "quote",
    "disclaimer",
    "visual_hint",
    "reason_code",
    "user_message",
  ],
  properties: {
    status: {
      type: "string",
      enum: ["success", "no_result"],
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
    quote: {
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
    disclaimer: {
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
    visual_hint: {
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

const QUOTE_GENERATION_INSTRUCTIONS = `
You generate one short, original quote for a synthetic quote-generation app, or
return a structured no_result when you cannot do so safely and confidently.

Follow these rules:
- Return strict JSON that matches the provided schema.
- If the personality is ambiguous, weakly recognized, unsafe, or not strong
  enough for a safe recognizable quote, return status "no_result".
- For "no_result", set display_name, quote, disclaimer, and visual_hint to
  null, and provide reason_code and user_message.
- For "success", set reason_code and user_message to null.
- Internally infer two to four of the personality's strongest public-language
  fingerprints, then write one quote using them.
- The quote must feel recognizably aligned through themes, cadence,
  characteristic vocabulary, rhetorical shape, emotional register, and
  habitual framing moves associated with the personality.
- Prefer strong lexical and rhetorical fit over broad generic inspiration.
- For living public figures, lean on recognizable public rhetoric, stance,
  cadence, and wording patterns rather than only topic similarity.
- Avoid neutral motivational language unless that tone is genuinely
  characteristic of the personality.
- The quote must be original and must not reproduce known quotations.
- Do not copy signature wording, catchphrases, or close paraphrases of known
  quotations.
- Use recurring vocabulary and framing as recognizable flavor, not as copied
  signature wording or uncanny imitation shorthand.
- Do not write fake first-person testimony or wording that reads like authentic
  direct speech from the named person.
- Keep the quote short and punchy.
- The quote does not need to be inspirational if a more characteristic
  rhetorical feel would better match the personality.
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

function parseGeneratedQuoteResponse(outputText) {
  const parsedResponse = JSON.parse(outputText);

  if (parsedResponse?.status === "success") {
    if (
      typeof parsedResponse.display_name !== "string" ||
      typeof parsedResponse.quote !== "string" ||
      typeof parsedResponse.disclaimer !== "string" ||
      typeof parsedResponse.visual_hint !== "string"
    ) {
      throw new Error(
        "OpenAI response did not match the expected success shape.",
      );
    }

    return {
      status: parsedResponse.status,
      displayName: parsedResponse.display_name.trim(),
      quote: parsedResponse.quote.trim(),
      disclaimer: parsedResponse.disclaimer.trim(),
      visualHint: parsedResponse.visual_hint.trim(),
    };
  }

  if (parsedResponse?.status === "no_result") {
    if (
      typeof parsedResponse.reason_code !== "string" ||
      typeof parsedResponse.user_message !== "string"
    ) {
      throw new Error(
        "OpenAI response did not match the expected no_result shape.",
      );
    }

    return {
      status: "no_result",
      reasonCode: parsedResponse.reason_code.trim(),
      userMessage: parsedResponse.user_message.trim(),
    };
  }

  throw new Error("OpenAI response did not match an expected shape.");
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

function resolveMalformedJsonRetryCount(valueFromEnvironment) {
  const normalizedValue = valueFromEnvironment?.trim();

  if (!normalizedValue) {
    return DEFAULT_MALFORMED_JSON_RETRY_COUNT;
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return DEFAULT_MALFORMED_JSON_RETRY_COUNT;
  }

  return parsedValue;
}

function logRetryOutcome(logger, payload) {
  logger.info("Quote generation malformed-JSON retry outcome.", payload);
}

export async function generateQuoteForPersonality(
  personalityName,
  {
    client: providedClient,
    createStructuredResponseImpl = createStructuredResponse,
    retryCountEnvValue = process.env.QUOTE_JSON_MALFORMED_RETRY_COUNT,
    logger = console,
  } = {},
) {
  const client = providedClient || getOpenAIClient();
  const retryCount = resolveMalformedJsonRetryCount(retryCountEnvValue);
  const maxAttempts = retryCount + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const outputText = await createStructuredResponseImpl({
      client,
      instructions: QUOTE_GENERATION_INSTRUCTIONS,
      input: `Personality name: ${personalityName}`,
      schemaName: "quote_generation_result",
      schema: QUOTE_RESPONSE_SCHEMA,
    });

    try {
      const parsedQuote = parseGeneratedQuoteResponse(outputText);

      logRetryOutcome(logger, {
        outcome_category:
          attempt === 1 ? "first_attempt_success" : "retry_success",
        attempt_count: attempt,
        retry_attempted: attempt > 1,
        retry_succeeded: attempt > 1,
        retry_exhausted: false,
      });

      return parsedQuote;
    } catch (error) {
      const canRetry = error instanceof SyntaxError && attempt < maxAttempts;

      if (canRetry) {
        logRetryOutcome(logger, {
          outcome_category: "retry_attempted_after_malformed_json",
          attempt_count: attempt,
          retry_attempted: true,
          retry_succeeded: false,
          retry_exhausted: false,
        });
        continue;
      }

      logRetryOutcome(logger, {
        outcome_category:
          error instanceof SyntaxError
            ? "retry_exhausted_after_malformed_json"
            : "non_retryable_generation_failure",
        attempt_count: attempt,
        retry_attempted: attempt > 1,
        retry_succeeded: false,
        retry_exhausted: error instanceof SyntaxError,
      });

      throw error;
    }
  }
}

export const __testExports = {
  resolveMalformedJsonRetryCount,
};
