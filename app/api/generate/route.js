import { NextResponse } from "next/server";

import { validatePersonalityName } from "@/lib/personalitySubmission";

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

  return NextResponse.json({
    status: "accepted",
    personalityName: validationResult.value,
    message: `Generation started for ${validationResult.value}.`,
  });
}
