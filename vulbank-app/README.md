# VulnBank

An intentionally vulnerable React banking app. This is the scan target for the
DevSecOps Agentic Triage Pipeline — every vulnerability in here is planted on
purpose and marked with a `VULN-###` comment so you can cross-check scanner
output against ground truth.

Run it:

```bash
npm install
npm run dev
```

Login as `alice` / `password` or `admin` / `admin123`.

## Planted vulnerabilities

| ID | Category | Location |
|----|----------|----------|
| VULN-001 | Insecure client-side token storage | `src/App.jsx` |
| VULN-002 | Hardcoded credentials | `src/pages/login.jsx` |
| VULN-004 | User enumeration via verbose errors | `src/pages/login.jsx` |
| VULN-006 | XSS via `dangerouslySetInnerHTML` | `src/pages/dashboard.jsx` |
| VULN-008 | CSRF (state-changing request, no token) | `src/pages/transfer.jsx` |
| VULN-009 | Missing input validation (negative amounts) | `src/pages/transfer.jsx` |
| VULN-010 | Hardcoded API key | `src/pages/transfer.jsx` |
| VULN-012 | Sensitive data logged to console | `src/pages/transfer.jsx` |
| VULN-013 | Broken access control (client-side role check) | `src/pages/adminpanel.jsx` |
| VULN-014 | IDOR | `src/pages/adminpanel.jsx` |
| VULN-015 | SQL injection (simulated query builder) | `src/pages/adminpanel.jsx` |
| VULN-016 | Sensitive PII exposed in UI | `src/pages/adminpanel.jsx` |

Plus 4 known CVEs planted as outdated dependencies in `package.json`
(axios, lodash, minimist, path-to-regexp) — 16 vulnerabilities total.

Not every one of these is SAST-detectable by design — VULN-004, VULN-009, and
VULN-016 are business-logic/architectural issues that a real static scanner
can't reliably catch by reading the AST. That's intentional: it's a realistic
reminder that SAST + SCA don't catch everything, which is exactly why a
security *program* needs more than just scanners.
