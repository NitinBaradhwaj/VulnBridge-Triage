# DevSecOps Agentic Triage Pipeline — Project Prompt

This is the north star document for the project. Every build decision should serve this vision.

---

## The Problem We're Solving

Most companies run security scanners that dump hundreds of findings into a report. Nobody reads them. Developers ignore them because there's no priority, no context, and no guidance on how to fix anything. Critical vulnerabilities sit unfixed for months. Companies get breached.

We're building the system that sits between the scanner and the developer — an intelligent triage layer that turns a 200-line noise report into 5 prioritized, actionable, AI-enriched tickets that a developer can actually act on.

---

## What We're Building

**The Target App — VulnBank**
A realistic but intentionally vulnerable React banking application. It contains 16 real security vulnerabilities spanning XSS, SQL injection, broken access control, hardcoded secrets, IDOR, CSRF, and known CVEs in outdated dependencies. This is what the pipeline scans.

**The Scanner Layer — GitHub Actions**
A CI/CD pipeline that triggers automatically on every code push. It runs two industry-standard scanners — Semgrep for static code analysis and Trivy for dependency CVE scanning — and saves structured JSON output.

**The Triage Agent — Python**
The core of the project. A multi-module Python agent that reads scanner output, normalizes findings from multiple tools into a common format, scores each finding using a formula combining CVSS severity scores and EPSS exploit probability, sends each finding to a local LLM for plain-English explanation and fix suggestions, deduplicates against existing tickets, and creates structured GitHub Issues automatically.

**The LLM Layer — Gemma 3 via Ollama (local) + Groq (cloud)**
Runs locally on developer machines using Ollama with Gemma 3. Runs on GitHub Actions using Groq's free API with Llama 3. Same prompt, same output, two execution environments. No OpenAI dependency. No per-token cost at scale.

**The Security Dashboard — React**
A live React dashboard that reads real GitHub Issues via the GitHub API and displays vulnerability cards sorted by danger score, color coded by priority, with fix suggestions and direct links to issues. This is the demo surface — what you show in an interview or to a security team.

---

## Long Term Vision — Fully Live Deployment

**Phase 1 — Local Pipeline (where we are now)**
Pipeline runs. Agent works locally. GitHub Issues created. Proof of concept complete.

**Phase 2 — Fully Automated Cloud Pipeline (next)**
Every push to GitHub triggers the full pipeline automatically. Groq handles LLM on the cloud runner. No human involvement from push to ticket. This is the working demo.

**Phase 3 — Live Dashboard on Vercel**
React dashboard deployed to Vercel. Reads GitHub Issues via API in real time. Anyone with the URL can see the live security posture of the repo. Shareable link for interviews and portfolios.

**Phase 4 — Multi-repo Support**
Agent accepts any GitHub repo as input. Point it at any codebase and it scans, scores, and triages automatically. Configuration via a simple YAML file.

**Phase 5 — Slack and Jira Integration**
Critical findings (P0) trigger a Slack alert immediately. All findings sync to Jira as well as GitHub Issues. Security team gets notified in real time without checking a dashboard.

**Phase 6 — Historical Tracking and Trends**
SQLite database tracks findings over time. Dashboard shows trends — are we fixing bugs faster than we're introducing them? Which files have the most vulnerabilities? Which developer introduced the most security issues? Metrics that a real security team cares about.

**Phase 7 — Custom Rules Engine**
YAML-based custom rules on top of Semgrep defaults. Security teams can define their own patterns specific to their codebase. Company-specific secrets formats, internal API misuse patterns, custom data handling rules.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend target | React + Vite | Real-world framework with real vulnerabilities |
| CI/CD | GitHub Actions | Free, widely used, zero infrastructure |
| SAST scanner | Semgrep | Industry standard, free, highly accurate |
| SCA scanner | Trivy | Best-in-class CVE detection |
| Agent language | Python | Best ecosystem for security tooling |
| Local LLM | Gemma 3 via Ollama | Zero cost, privacy-preserving, offline capable |
| Cloud LLM | Groq + Llama 3 | Free tier, fast inference, no credit card |
| Issue tracking | GitHub Issues API | Zero additional tooling needed |
| Dashboard | React + Vite | Same stack as target, consistent codebase |
| Deployment | Vercel (dashboard) + GitHub Actions (pipeline) | Free tier covers everything |
| Database (Phase 6) | SQLite → PostgreSQL | Simple start, scalable later |

---

## What Makes This Different

Most DevSecOps projects on GitHub are one of two things — either a scanner wrapper that just runs a tool and prints output, or a dashboard that visualizes existing data. This project is neither.

The differentiator is the agentic triage layer. The agent doesn't just collect findings. It reasons about them. It combines multiple data sources — CVSS, EPSS, source type, file exposure — into a single risk score. It uses an LLM to generate context-aware remediation that references the specific file and line number. It deduplicates across runs so the same bug doesn't generate 50 tickets. It filters noise so developers only see findings worth acting on.

This is what separates a security engineer who runs tools from a security engineer who builds systems.

---

## Resume Line When Complete

*"Built an end-to-end DevSecOps pipeline integrating Semgrep and Trivy scanners with a Python triage agent that scores vulnerabilities using CVSS and EPSS formulas, generates fix suggestions via local Gemma 3 LLM, and auto-creates prioritized GitHub Issues — deployed with GitHub Actions CI/CD and a live React security dashboard on Vercel."*
