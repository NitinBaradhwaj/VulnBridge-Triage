# DevSecOps Agentic Triage Pipeline

### Problem Statement: 
- Security and testing teams are good at finding vulnerabilities, but what they hand developers is a raw, overwhelming list — dozens of findings, all marked “high,” with cryptic descriptions and no fix guidance. Developers don’t know what to tackle first or how, so they stall, and the genuinely dangerous bugs sit unfixed for weeks. The gap isn’t finding vulnerabilities, it’s helping developers actually act on them.


Scanner output → risk-scored, AI-enriched, deduplicated GitHub Issues. No manual triage.

See [`PROJECT_PROMPT.md`](./PROJECT_PROMPT.md) for the full vision and roadmap.
This README covers **Phase 1: local pipeline** — the state this repo is in today.

## How it fits together

```
GitHub Actions (on push)          Your machine (manual, for now)
┌─────────────────────┐           ┌──────────────────────────────┐
│ Semgrep (SAST)       │           │ triage-agent/agent.py         │
│ + custom rules        │  scan   │  1. parsers.py  → normalize   │
│ Trivy (SCA)           │ ──────► │  2. scoring.py  → CVSS+EPSS   │
│ uploads results as    │ artifact│  3. llm.py      → Gemma 3     │
│ a downloadable        │         │     (via local Ollama)        │
│ artifact               │         │  4. issue_creator.py          │
└─────────────────────┘           │     → GitHub Issues           │
                                    └──────────────────────────────┘
```

CI's job is scanning only. Scoring, LLM enrichment, and issue creation run
locally because that's where Ollama lives. Phase 2 moves the whole chain
into CI once a cloud LLM step is wired in.

## One-time setup

**1. Ollama + Gemma 3** (you said this is already done — just confirming the model name matches):

```bash
ollama pull gemma3:4b
ollama serve   # if not already running
```

`triage-agent/llm.py` is hardcoded to `gemma3:4b` — change `OLLAMA_MODEL` there if you pulled a different size.

**2. Python deps:**

```bash
cd triage-agent
pip install -r requirements.txt
```

**3. GitHub token** for issue creation (skip if you only want `--dry-run`):

```bash
export GITHUB_TOKEN='ghp_...'   # needs repo scope, see .env.example
```

**4. Confirm the repo target** — `triage-agent/issue_creator.py` has
`REPO_OWNER` / `REPO_NAME` hardcoded near the top. Make sure they match your
actual GitHub repo before creating issues for real.

## Running it

**Locally, without CI** (fastest way to test the whole chain):

```bash
cd vulbank-app && npm install && cd ..
cd triage-agent
python agent.py --dry-run    # semgrep/trivy results already checked in as a demo snapshot
```

To scan fresh code yourself instead of the checked-in demo snapshot:

```bash
cd vulbank-app
semgrep scan --config=p/javascript --config=p/react --config=p/secrets \
  --config=p/owasp-top-ten --config=../.semgrep/vulnbank-rules.yml \
  --json --output=../triage-agent/semgrep-results.json ./src
cd ../triage-agent
python agent.py --dry-run
```

(Trivy scanning locally requires the `trivy` CLI — install it or just rely on
the CI job, which runs it automatically via `aquasecurity/trivy-action`.)

**Through CI:** push to `main` (or open a PR). Check the Actions tab → download
the `security-scan-results` artifact → drop `semgrep-results.json` and
`trivy-results.json` into `triage-agent/` → run `agent.py` locally as above.

**For real, creating GitHub Issues:**

```bash
cd triage-agent
python agent.py
```

## Security Dashboard

`security-dashboard/` is a separate React app — the demo surface. It reads
the same GitHub Issues the agent creates and renders them as sorted,
color-coded cards. See `security-dashboard/README.md` for run and Vercel
deploy instructions. It has no dependency on Ollama or the Python agent —
just the public GitHub API — so it's safe to deploy on its own.

## What's custom here vs. off-the-shelf

- `.semgrep/vulnbank-rules.yml` — hand-written rules for VulnBank's specific
  vulnerability patterns. Community rulesets (`p/react`, `p/secrets`, etc.)
  are good but generic; they miss app-specific patterns fairly often. Pairing
  both is what makes detection reliable rather than hopeful.
- `scoring.py`'s `EPSS_SCORES` table is a static snapshot for the 4 CVEs
  planted in `vulbank-app/package.json`. In a real system this would call
  the live [EPSS API](https://www.first.org/epss/api) instead — that's a
  good Phase 4+ upgrade.

## Known limitations (honest, on purpose)

- Not every planted VulnBank vulnerability is scanner-detectable. VULN-004
  (user enumeration), VULN-009 (missing input validation), and VULN-016
  (PII exposed in UI) are business-logic issues — real SAST tools can't
  reliably catch these either. See `vulbank-app/README.md`.
- `issue_creator.py`'s dedup check only looks at *open* issues by exact
  title match. If you close an issue and the same finding reappears on the
  next scan, you'll get a second issue for it. Good enough for Phase 1;
  worth revisiting once Phase 6 (historical tracking) exists.
