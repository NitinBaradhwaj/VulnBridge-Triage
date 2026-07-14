// Override with VITE_REPO_OWNER / VITE_REPO_NAME env vars (e.g. in a
// Vercel project setting) to point this dashboard at a different repo
// without touching code — this is what makes it reusable for Phase 4
// (multi-repo support) later.
export const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || "NitinBaradhwaj";
export const REPO_NAME = import.meta.env.VITE_REPO_NAME || "OpsSec-Agentic-Triage";

// Public GitHub REST API — no token needed for a public repo's issues.
// Rate limit is 60 req/hour unauthenticated, which is plenty for a
// dashboard a human refreshes occasionally.
export const ISSUES_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&labels=security&per_page=100`;
