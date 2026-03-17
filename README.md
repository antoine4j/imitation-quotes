# Imitation Quotes

`Imitation Quotes` is a small `Next.js` proof-of-concept for generating an original quote inspired by a public figure's style and pairing it with a related image. This first slice only sets up the app shell and local development workflow.

Besides being a playful product project, one of the goals is to build it completely with AI support without manually writing code, specs, documentation, or tasks, while still leaving behind a clear work trail of docs, decisions, and execution artifacts that looks like it could have been produced by a human team.

## Prerequisite

Use a recent `Node.js` 20 release so `npm` and the Next.js toolchain work as expected.

## Local Setup

Install dependencies:

```bash
npm install
```

Set the required OpenAI API key before starting the app:

```bash
export OPENAI_API_KEY="your_api_key_here"
```

Optional: override the default model used for Story 3 quote generation.

```bash
export OPENAI_MODEL="gpt-5-mini"
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Plain-English note: in `Next.js`, the development server automatically reloads the page when you edit files like `app/page.js`.

For Story 3, the `/api/generate` route calls OpenAI on the server, so the API key must be present in the shell where you run `npm run dev`. In `Vercel`, the same key needs to be configured as a project environment variable for preview verification.

## Deployment

Preview deployments are hosted on `Vercel`.

Plain-English note: when the repository is connected to `Vercel`, each pull request can get its own temporary preview URL so the current branch can be reviewed in the browser before merge.
Branch pushes can also trigger fresh `Vercel` preview deployments for review.
