import assert from "node:assert/strict";
import test from "node:test";

import {
  __testExports,
  generateQuoteForPersonality,
} from "../lib/openaiQuoteGeneration.js";

function createLoggerProbe() {
  const entries = [];

  return {
    logger: {
      info(message, payload) {
        entries.push({ message, payload });
      },
    },
    entries,
  };
}

function buildResponseFactory(sequence) {
  let callCount = 0;

  return {
    async createStructuredResponseImpl() {
      const value = sequence[callCount];
      callCount += 1;
      return value;
    },
    getCallCount() {
      return callCount;
    },
  };
}

const SUCCESS_RESPONSE = JSON.stringify({
  status: "success",
  display_name: "Ada Lovelace",
  quote: "Imagination carries mathematics into possibility.",
  disclaimer:
    "This quote is AI-generated and inspired by Ada Lovelace's public style.",
  visual_hint: "Victorian analytical sketches",
  reason_code: null,
  user_message: null,
});

const NO_RESULT_RESPONSE = JSON.stringify({
  status: "no_result",
  display_name: null,
  quote: null,
  disclaimer: null,
  visual_hint: null,
  reason_code: "unknown_personality",
  user_message:
    "I couldn't confidently place that personality. Try a more specific famous person or character.",
});

test("first-attempt success does not retry", async () => {
  const responseFactory = buildResponseFactory([SUCCESS_RESPONSE]);
  const loggerProbe = createLoggerProbe();

  const generated = await generateQuoteForPersonality("Ada Lovelace", {
    client: {},
    createStructuredResponseImpl: responseFactory.createStructuredResponseImpl,
    retryCountEnvValue: "5",
    logger: loggerProbe.logger,
  });

  assert.equal(responseFactory.getCallCount(), 1);
  assert.equal(generated.status, "success");
  assert.equal(loggerProbe.entries.at(-1)?.payload?.outcome_category, "first_attempt_success");
});

test("malformed JSON can succeed on a later allowed attempt", async () => {
  const responseFactory = buildResponseFactory(["{\"status\":", SUCCESS_RESPONSE]);
  const loggerProbe = createLoggerProbe();

  const generated = await generateQuoteForPersonality("Ada Lovelace", {
    client: {},
    createStructuredResponseImpl: responseFactory.createStructuredResponseImpl,
    retryCountEnvValue: "1",
    logger: loggerProbe.logger,
  });

  assert.equal(generated.status, "success");
  assert.equal(responseFactory.getCallCount(), 2);
  assert.equal(
    loggerProbe.entries.some(
      (entry) =>
        entry.payload?.outcome_category ===
        "retry_attempted_after_malformed_json",
    ),
    true,
  );
  assert.equal(
    loggerProbe.entries.at(-1)?.payload?.outcome_category,
    "retry_success",
  );
});

test("no_result responses do not retry", async () => {
  const responseFactory = buildResponseFactory([NO_RESULT_RESPONSE]);
  const loggerProbe = createLoggerProbe();

  const generated = await generateQuoteForPersonality("Ada Lovelace", {
    client: {},
    createStructuredResponseImpl: responseFactory.createStructuredResponseImpl,
    retryCountEnvValue: "5",
    logger: loggerProbe.logger,
  });

  assert.equal(generated.status, "no_result");
  assert.equal(responseFactory.getCallCount(), 1);
  assert.equal(
    loggerProbe.entries.at(-1)?.payload?.outcome_category,
    "first_attempt_success",
  );
});

test("repeated malformed JSON failures return the generic error path by throwing", async () => {
  const responseFactory = buildResponseFactory(["{\"status\":", "{\"status\":"]);
  const loggerProbe = createLoggerProbe();

  await assert.rejects(
    generateQuoteForPersonality("Ada Lovelace", {
      client: {},
      createStructuredResponseImpl: responseFactory.createStructuredResponseImpl,
      retryCountEnvValue: "1",
      logger: loggerProbe.logger,
    }),
    SyntaxError,
  );

  assert.equal(responseFactory.getCallCount(), 2);
  assert.equal(
    loggerProbe.entries.at(-1)?.payload?.outcome_category,
    "retry_exhausted_after_malformed_json",
  );
});

test("non-JSON parse failures remain non-retriable", async () => {
  const responseFactory = buildResponseFactory([
    JSON.stringify({
      status: "success",
      display_name: 42,
      quote: "Imagination carries mathematics into possibility.",
      disclaimer:
        "This quote is AI-generated and inspired by Ada Lovelace's public style.",
      visual_hint: "Victorian analytical sketches",
      reason_code: null,
      user_message: null,
    }),
  ]);
  const loggerProbe = createLoggerProbe();

  await assert.rejects(
    generateQuoteForPersonality("Ada Lovelace", {
      client: {},
      createStructuredResponseImpl: responseFactory.createStructuredResponseImpl,
      retryCountEnvValue: "5",
      logger: loggerProbe.logger,
    }),
    /expected success shape/,
  );

  assert.equal(responseFactory.getCallCount(), 1);
  assert.equal(
    loggerProbe.entries.at(-1)?.payload?.outcome_category,
    "non_retryable_generation_failure",
  );
});

test("configured retry count controls maximum attempts", async () => {
  const responseFactory = buildResponseFactory([
    "{\"status\":",
    "{\"status\":",
    SUCCESS_RESPONSE,
  ]);

  const generated = await generateQuoteForPersonality("Ada Lovelace", {
    client: {},
    createStructuredResponseImpl: responseFactory.createStructuredResponseImpl,
    retryCountEnvValue: "2",
    logger: createLoggerProbe().logger,
  });

  assert.equal(generated.status, "success");
  assert.equal(responseFactory.getCallCount(), 3);
});

test("retry count falls back to 1 when missing or invalid", async () => {
  assert.equal(__testExports.resolveMalformedJsonRetryCount(undefined), 1);
  assert.equal(__testExports.resolveMalformedJsonRetryCount(""), 1);
  assert.equal(__testExports.resolveMalformedJsonRetryCount("nope"), 1);
  assert.equal(__testExports.resolveMalformedJsonRetryCount("-2"), 1);
});
