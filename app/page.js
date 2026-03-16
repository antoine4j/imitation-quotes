import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.kicker}>POC scaffold</p>
        <section className={styles.intro}>
          <h1>Imitation Quotes is ready for the first landing page slice.</h1>
          <p>
            This baseline confirms the app runs locally with Next.js and is set
            up for the next task: adding the personality input and submit
            button.
          </p>
        </section>
      </main>
    </div>
  );
}
