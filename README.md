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
npm run browser:check
npm run browser:check:mobile
npm run browser:mcp:check
```

Plain-English note: in `Next.js`, the development server automatically reloads the page when you edit files like `app/page.js`.

For Story 3, the `/api/generate` route calls OpenAI on the server, so the API key must be present in the shell where you run `npm run dev`. In `Vercel`, the same key needs to be configured as a project environment variable for preview verification.

## Autonomous Browser Loop

This repo includes a Playwright-based fallback loop for local UI refinement.

1. Start the dev server.

```bash
npm run dev
```

2. In a second terminal, run the desktop or mobile browser check.

```bash
npm run browser:check
npm run browser:check:mobile
```

3. Screenshots and diagnostics are written to `.artifacts/browser-loop/`.

Useful options:

```bash
node scripts/browser-loop.mjs --personality "Marie Curie" --viewport mobile
node scripts/browser-loop.mjs --url http://localhost:3001 --headed
```

If you want a reliable local verification loop without a live OpenAI key, start the app with mock mode enabled:

```bash
BROWSER_LOOP_MOCK=1 npm run dev
```

Plain-English note: this mock mode is only for local browser verification. It keeps the same `/api/generate` response shape, but skips the real OpenAI and image lookup calls so the page can still render a full result state.

## Playwright MCP In Codex

The Codex MCP config for Playwright lives in `~/.codex/config.toml`, not in this repo.

The known-good launch path for this project is the repo-local Playwright MCP binary:

```toml
[mcp_servers.playwright]
command = "/Users/anton/Projects/imitation-quotes/node_modules/.bin/playwright-mcp"
```

This project includes `@playwright/mcp` locally, so after restarting Codex you can verify the MCP server entry with:

```bash
npm run browser:mcp:check
```

If Codex was already open before Playwright MCP was installed or reconfigured, restart Codex so the new session can load the browser tools.

Known-good live verification flow:

1. Start the app in mock mode on port `3001`.
2. Restart Codex if the MCP config changed.
3. In the new session, ask Codex to check Playwright MCP availability and use it on `http://localhost:3001`.

Plain-English note: on macOS, the first Playwright MCP browser launch may trigger a security warning because Playwright runs its own automated browser binary from your user cache. That warning is about browser automation/privacy checks, not about editing your installed apps.

## Deployment

Preview deployments are hosted on `Vercel`.

Plain-English note: when the repository is connected to `Vercel`, each pull request can get its own temporary preview URL so the current branch can be reviewed in the browser before merge.
Branch pushes can also trigger fresh `Vercel` preview deployments for review.
