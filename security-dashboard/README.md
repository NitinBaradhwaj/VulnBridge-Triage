# Security Dashboard

Reads open GitHub Issues from the triage pipeline's target repo (public API,
no token needed) and renders them as prioritized, color-coded vulnerability
cards. This is the demo surface for the project — what you'd show in an
interview instead of the raw Issues tab.

It only reads. It never writes back to GitHub.

## Run locally

```bash
npm install
npm run dev
```

Needs at least one real issue in the repo to show anything — run
`python triage-agent/agent.py` (without `--dry-run`) first if the Issues tab
is still empty.

## Pointing it at a different repo

Set two env vars (a `.env` file locally, or Project Settings → Environment
Variables on Vercel):

```
VITE_REPO_OWNER=NitinBaradhwaj
VITE_REPO_NAME=OpsSec-Agentic-Triage
```

Defaults to that repo if unset.

## Deploy to Vercel

This repo has three independent apps in it (`vulbank-app`, `triage-agent`,
`security-dashboard`), so the one setting that matters is **Root Directory**.

1. Push this repo to GitHub (if you haven't already).
2. Go to [vercel.com/new](https://vercel.com/new) and import
   `NitinBaradhwaj/OpsSec-Agentic-Triage`.
3. On the configuration screen: set **Root Directory** to `security-dashboard`.
4. Framework preset should auto-detect as Vite. Build command `npm run build`,
   output directory `dist` — both are Vercel's Vite defaults, no changes needed.
5. Deploy.

Unauthenticated GitHub API calls are rate-limited to 60/hour per IP — fine
for a dashboard a human refreshes occasionally, but if you're demoing it
heavily, add a `VITE_GITHUB_TOKEN` env var and a bearer header in
`src/config.js` to raise that to 5,000/hour. (Use a token scoped only to
`public_repo` read access if you do this — never a token with write scopes
in client-side code, since anything shipped to the browser is public.)
