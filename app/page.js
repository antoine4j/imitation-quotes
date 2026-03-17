"use client";

import { useState } from "react";

import { validatePersonalityName } from "@/lib/personalitySubmission";

import styles from "./page.module.css";

export default function Home() {
  const [personalityName, setPersonalityName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
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
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
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
          responseBody.message || "Unable to start quote generation.",
        );
        return;
      }

      setStatusMessage(responseBody.message || "Generation started.");
      setPersonalityName(validationResult.value);
    } catch {
      setErrorMessage("Unable to start quote generation right now.");
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
                }}
              />
              <button className={styles.button} type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Starting..." : "Generate quote"}
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
        </section>
      </main>
    </div>
  );
}
