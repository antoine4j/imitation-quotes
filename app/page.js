"use client";

import { useRef, useState } from "react";

import { validatePersonalityName } from "@/lib/personalitySubmission";

import styles from "./page.module.css";

export default function Home() {
  const inputRef = useRef(null);
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

  function handleInputChange(event) {
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
  }

  function handleReset() {
    const nextPersonalityName = generatedQuote?.displayName || personalityName;

    setGeneratedQuote(null);
    setPersonalityName(nextPersonalityName);
    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(false);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }

  const isShowingResult = Boolean(generatedQuote);
  const hasRealImage =
    Boolean(generatedQuote?.image?.url) && !generatedQuote?.image?.is_fallback;
  const isFallbackResult = isShowingResult && !hasRealImage;
  const backdropClassName = hasRealImage
    ? styles.resultBackdrop
    : isFallbackResult
      ? styles.fallbackBackdrop
      : styles.defaultBackdrop;
  const overlayClassName = [
    styles.backgroundOverlay,
    hasRealImage ? styles.backgroundOverlayImage : "",
  ]
    .filter(Boolean)
    .join(" ");
  const pageClassName = [
    styles.page,
    isShowingResult ? styles.pageResult : styles.pageInput,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={pageClassName}>
      <div className={styles.backgroundLayer} aria-hidden="true">
        {hasRealImage ? (
          <div
            className={styles.backgroundImage}
            style={{ backgroundImage: `url("${generatedQuote.image.url}")` }}
          />
        ) : null}
        <div className={backdropClassName} />
        <div className={overlayClassName} />
        {isFallbackResult ? (
          <div className={styles.fallbackTexture}>
            <div className={styles.fallbackAccent} />
            <div className={styles.fallbackGlow} />
            <div className={styles.fallbackNoise} />
          </div>
        ) : null}
      </div>

      <div className={styles.contentLayer}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.brand}>Imitation Quotes</h1>
            <p className={styles.brandTagline}>
              AI-inspired wisdom from history&apos;s voices
            </p>
          </div>
        </header>

        <main className={styles.main}>
          {isShowingResult ? (
            <section className={styles.resultShell} aria-live="polite">
              <p className={styles.resultEyebrow}>AI-generated interpretation</p>
              <div className={styles.quoteMark} aria-hidden="true">
                &rdquo;
              </div>
              <blockquote className={styles.quote}>
                &ldquo;{generatedQuote.quote}&rdquo;
              </blockquote>
              <p className={styles.attribution}>
                Inspired by {generatedQuote.displayName}
              </p>
              <button
                className={styles.retryButton}
                type="button"
                onClick={handleReset}
              >
                <span className={styles.retryIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path
                      d="M3 12a9 9 0 0 1 15.36-6.36L21 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 3v5h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21 12a9 9 0 0 1-15.36 6.36L3 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 21v-5h5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>Try Another</span>
              </button>
            </section>
          ) : (
            <section className={styles.inputShell}>
              <div className={styles.inputIntro}>
                <h2 className={styles.title}>Who inspires you?</h2>
                <p className={styles.description}>
                  Enter the name of a famous person or fictional character
                </p>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.controls}>
                  <input
                    ref={inputRef}
                    id="personality-name"
                    name="personalityName"
                    className={styles.input}
                    type="text"
                    autoComplete="off"
                    placeholder="Abraham Lincoln"
                    value={personalityName}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    aria-label="Personality name"
                  />
                  <button
                    className={styles.button}
                    type="submit"
                    disabled={isSubmitting}
                  >
                    <span className={styles.buttonIcon} aria-hidden="true">
                      {isSubmitting ? (
                        <svg
                          className={styles.spinnerIcon}
                          viewBox="0 0 24 24"
                          focusable="false"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            className={styles.spinnerTrack}
                          />
                          <path
                            d="M21 12a9 9 0 0 0-9-9"
                            className={styles.spinnerHead}
                          />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" focusable="false">
                          <path
                            d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"
                            fill="currentColor"
                          />
                          <path
                            d="M18.5 4l.7 2.3L21.5 7l-2.3.7L18.5 10l-.7-2.3L15.5 7l2.3-.7.7-2.3Z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                    </span>
                    <span>
                      {isSubmitting ? "Generating..." : "Generate Quote"}
                    </span>
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

              <div className={styles.examples} aria-label="Example personalities">
                <span className={styles.examplesLabel}>Try:</span>
                <div className={styles.exampleGrid}>
                  {[
                    "Marie Curie",
                    "Shakespeare",
                    "Einstein",
                    "Frida Kahlo",
                  ].map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={styles.exampleChip}
                      onClick={() => {
                        setPersonalityName(name);
                        setErrorMessage("");
                        setStatusMessage("");
                        requestAnimationFrame(() => {
                          inputRef.current?.focus();
                        });
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        <footer className={styles.footer}>
          <p className={styles.disclosure}>
            {generatedQuote?.disclaimer ||
              "Outputs are clearly labeled as AI-generated, not authentic quotations."}
          </p>
        </footer>
      </div>
    </div>
  );
}
