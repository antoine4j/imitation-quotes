"use client";

import { useRef, useState } from "react";

import { validatePersonalityName } from "@/lib/personalitySubmission";

import styles from "./page.module.css";

const EXAMPLE_PERSONALITIES = [
  "Marie Curie",
  "Shakespeare",
  "Einstein",
  "Frida Kahlo",
];

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

function capitalizeSentenceStart(text) {
  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ensureSentenceEnding(text) {
  if (!text) {
    return "";
  }

  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function formatDisclosureLines(disclaimer) {
  if (!disclaimer) {
    return [];
  }

  const semicolonParts = disclaimer
    .split(/\s*;\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (semicolonParts.length > 1) {
    return semicolonParts.map((part, index) =>
      ensureSentenceEnding(
        index === 0 ? part : capitalizeSentenceStart(part),
      ),
    );
  }

  const sentenceMatches =
    disclaimer.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) =>
      sentence.trim(),
    ) || [];

  return sentenceMatches.filter(Boolean);
}

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

  function handleExampleSelect(name) {
    setPersonalityName(name);
    setErrorMessage("");
    setStatusMessage("");
    setGeneratedQuote(null);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
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
  const feedbackMessage = errorMessage || (!isSubmitting ? statusMessage : "");
  const feedbackClassName = errorMessage
    ? styles.errorMessage
    : statusMessage
      ? styles.statusMessage
      : "";
  const disclosureLines = formatDisclosureLines(generatedQuote?.disclaimer);
  const sceneKey = isShowingResult
    ? `${generatedQuote.displayName}-${generatedQuote.quote}`
    : "input";

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
          <div className={styles.headerInner}>
            <h1 className={styles.brand}>Imitation Quotes</h1>
            <p className={styles.brandTagline}>
              AI-inspired wisdom from history&apos;s voices
            </p>
          </div>
        </header>

        <main className={styles.main}>
          {isShowingResult ? (
            <section
              key={sceneKey}
              className={joinClassNames(styles.scene, styles.resultScene)}
              aria-live="polite"
            >
              <div className={styles.quoteMark} aria-hidden="true">
                &rdquo;
              </div>
              <blockquote className={styles.quote}>
                &ldquo;{generatedQuote.quote}&rdquo;
              </blockquote>
              <div className={styles.resultMeta}>
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
              </div>
            </section>
          ) : (
            <section
              key={sceneKey}
              className={joinClassNames(styles.scene, styles.inputScene)}
            >
              <div className={styles.inputIntro}>
                <h2 className={styles.title}>Who inspires you?</h2>
                <p className={styles.description}>
                  Enter the name of a famous person or fictional character
                </p>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.visuallyHidden} htmlFor="personality-name">
                  Personality name
                </label>
                <div className={styles.inputFrame}>
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
                    suppressHydrationWarning
                  />
                </div>
                <div className={styles.controls}>
                  <button
                    className={joinClassNames(
                      styles.button,
                      isSubmitting ? styles.buttonSubmitting : "",
                    )}
                    type="submit"
                    disabled={isSubmitting || !personalityName.trim()}
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
                            d="M12 4.8c.2 0 .38.14.44.34l1.14 4.31c.03.12.12.21.24.24l4.31 1.14c.2.06.34.24.34.44s-.14.38-.34.44l-4.31 1.14a.35.35 0 0 0-.24.24l-1.14 4.31a.46.46 0 0 1-.88 0l-1.14-4.31a.35.35 0 0 0-.24-.24l-4.31-1.14a.46.46 0 0 1 0-.88l4.31-1.14c.12-.03.21-.12.24-.24l1.14-4.31c.06-.2.24-.34.44-.34Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.45"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M18.55 5.55v2.9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.45"
                            strokeLinecap="round"
                          />
                          <path
                            d="M17.1 7h2.9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.45"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6.95 14.65v1.75"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.45"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6.08 15.52h1.75"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.45"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span>
                      {isSubmitting ? "Generating..." : "Generate Quote"}
                    </span>
                  </button>
                </div>

                <div className={styles.feedback} aria-live="polite">
                  {feedbackMessage ? (
                    <p
                      className={joinClassNames(
                        styles.feedbackMessage,
                        feedbackClassName,
                      )}
                      role={errorMessage ? "alert" : undefined}
                    >
                      {feedbackMessage}
                    </p>
                  ) : null}
                </div>
              </form>

              <div
                className={styles.examples}
                aria-label="Example personalities"
              >
                <span className={styles.examplesLabel}>Try:</span>
                {EXAMPLE_PERSONALITIES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={styles.exampleChip}
                    onClick={() => handleExampleSelect(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>

        <footer
          className={joinClassNames(
            styles.footer,
            isShowingResult ? styles.footerResult : styles.footerInput,
          )}
        >
          {isShowingResult ? (
            <p className={styles.disclosure}>
              {disclosureLines.map((line, index) => (
                <span key={`${line}-${index}`} className={styles.disclosureLine}>
                  {line}
                </span>
              ))}
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
