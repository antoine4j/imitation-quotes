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

## Deployment

Preview deployments are hosted on `Vercel`.

Plain-English note: when the repository is connected to `Vercel`, each pull request can get its own temporary preview URL so the current branch can be reviewed in the browser before merge.
