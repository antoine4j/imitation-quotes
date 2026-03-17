export const REQUIRED_PERSONALITY_NAME_MESSAGE =
  "Enter a personality name to generate a quote.";

export function validatePersonalityName(personalityName) {
  const normalizedPersonalityName =
    typeof personalityName === "string" ? personalityName.trim() : "";

  if (!normalizedPersonalityName) {
    return {
      ok: false,
      message: REQUIRED_PERSONALITY_NAME_MESSAGE,
    };
  }

  return {
    ok: true,
    value: normalizedPersonalityName,
  };
}
