"use client";

import Image from "next/image";
import { useState } from "react";

import { validatePersonalityName } from "@/lib/personalitySubmission";

import styles from "./page.module.css";

export default function Home() {
  const [personalityName, setPersonalityName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationResult = validatePersonalityName(personalityName);

    if (!validationResult.ok) {
      setErrorMessage(validationResult.message);
      setStatusMessage("");
      setGeneratedQuote(null);
      return;
    }

    setErrorMessage("");
    setStatusMessage("Generating quote...");
    setGeneratedQuote(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalityName: validationResult.value,
        }),
      });

      const responseBody = await response.json();

      if (!response.ok) {
        setErrorMessage(
          responseBody.message || "Unable to generate a quote right now.",
        );
        setStatusMessage("");
        return;
      }

      setGeneratedQuote({
        displayName: responseBody.display_name,
        quote: responseBody.quote,
        disclaimer: responseBody.disclaimer,
        image: responseBody.image,
      });
      setStatusMessage("");
      setPersonalityName(validationResult.value);
    } catch {
      setErrorMessage("Unable to generate a quote right now.");
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.kicker}>Playful quote generator</p>
          <h1 className={styles.title}>
            Type a public figure&apos;s name and get a fresh, AI-written quote
            inspired by their vibe.
          </h1>
          <p className={styles.description}>
            Imitation Quotes turns a well-known personality into a short,
            original line designed to feel familiar, punchy, and fun to try a
            few times.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="personality-name">
              Personality name
            </label>
            <div className={styles.controls}>
              <input
                id="personality-name"
                name="personalityName"
                className={styles.input}
                type="text"
                autoComplete="off"
                placeholder="Abraham Lincoln"
                value={personalityName}
                onChange={(event) => {
                  setPersonalityName(event.target.value);

                  if (errorMessage) {
                    setErrorMessage("");
                  }

                  if (statusMessage) {
                    setStatusMessage("");
                  }

                  if (generatedQuote) {
                    setGeneratedQuote(null);
                  }
                }}
              />
              <button
                className={styles.button}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Generating..." : "Generate quote"}
              </button>
            </div>

            {errorMessage ? (
              <p className={styles.errorMessage} role="alert">
                {errorMessage}
              </p>
            ) : null}

            {statusMessage ? (
              <p className={styles.statusMessage} aria-live="polite">
                {statusMessage}
              </p>
            ) : null}
          </form>

          <p className={styles.disclosure}>
            Outputs in later steps will be clearly labeled as AI-generated, not
            authentic quotations.
          </p>

          {generatedQuote ? (
            <section className={styles.resultCard} aria-live="polite">
              <div
                className={`${styles.imagePanel} ${
                  generatedQuote.image?.is_fallback ? styles.imageFallback : ""
                } ${
                  generatedQuote.image?.url ? styles.imageReal : ""
                }`}
              >
                {generatedQuote.image?.url ? (
                  <div className={styles.imageFrame}>
                    <Image
                      className={styles.resultImage}
                      src={generatedQuote.image.url}
                      alt={generatedQuote.image.alt}
                      width={generatedQuote.image.width}
                      height={generatedQuote.image.height}
                      sizes="(max-width: 600px) 100vw, 712px"
                    />
                  </div>
                ) : (
                  <div className={styles.fallbackArtwork} aria-hidden="true">
                    <div className={styles.fallbackGlow} />
                    <div className={styles.fallbackRing} />
                    <div className={styles.fallbackStripe} />
                  </div>
                )}
              </div>
              <p className={styles.resultEyebrow}>Generated result</p>
              <blockquote className={styles.quote}>
                &ldquo;{generatedQuote.quote}&rdquo;
              </blockquote>
              <p className={styles.attribution}>
                Inspired by {generatedQuote.displayName}
              </p>
              <p className={styles.resultDisclosure}>
                {generatedQuote.disclaimer}
              </p>
            </section>
          ) : null}
        </section>
      </main>
    </div>
  );
}
