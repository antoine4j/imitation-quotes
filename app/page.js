"use client";

import { useState } from "react";

import styles from "./page.module.css";

export default function Home() {
  const [personalityName, setPersonalityName] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
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
                onChange={(event) => setPersonalityName(event.target.value)}
              />
              <button className={styles.button} type="submit">
                Generate quote
              </button>
            </div>
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
