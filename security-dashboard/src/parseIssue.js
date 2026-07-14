// Turns a raw GitHub Issue (from the REST API) into the normalized shape
// this dashboard renders.
//
// This parser is built against the EXACT format triage-agent/issue_creator.py
// produces — not guessed. See that file for the source of truth:
//
//   Title:  "[{priority}] {title} — {location} (score: {score})"
//   Labels: ["security", priority, source, severity]
//   Body:   markdown with a details table, a Description section, and an
//           "## 🤖 AI Fix Suggestion (Gemma 3)" section.
//
// Everything here has a fallback so a hand-created issue (like the leftover
// test issues from before this pipeline existed) doesn't crash the render —
// it just gets parsed with best-effort defaults instead.

const PRIORITY_RE = /P[0-3]:\s*(Critical|High|Medium|Low)/i;
const SCORE_RE = /\(score:\s*([\d.]+)\)/i;
const LOCATION_RE = /—\s*(.+?)\s*\(score:/;
const SEVERITY_VALUES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const SOURCE_VALUES = ["semgrep", "trivy"];

export function parseIssue(issue) {
  const labels = (issue.labels || []).map((l) =>
    typeof l === "string" ? l : l.name
  );

  const priorityLabel =
    labels.find((l) => PRIORITY_RE.test(l)) || extractFromTitle(issue.title, PRIORITY_RE) || "P3: Low";

  const severity =
    labels.find((l) => SEVERITY_VALUES.includes((l || "").toUpperCase())) ||
    "LOW";

  const source =
    labels.find((l) => SOURCE_VALUES.includes((l || "").toLowerCase())) ||
    "unknown";

  const scoreMatch = issue.title.match(SCORE_RE);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : scoreFromBody(issue.body);

  const locationMatch = issue.title.match(LOCATION_RE);
  const location = locationMatch ? locationMatch[1].trim() : locationFromBody(issue.body);

  return {
    id: issue.id,
    number: issue.number,
    title: cleanTitle(issue.title),
    rawTitle: issue.title,
    htmlUrl: issue.html_url,
    priority: normalizePriority(priorityLabel),
    priorityRank: priorityRank(priorityLabel),
    severity: severity.toUpperCase(),
    source,
    score: Number.isFinite(score) ? score : 0,
    location,
    description: extractSection(issue.body, "📋 Description"),
    fixSuggestion: extractSection(issue.body, "🤖 AI Fix Suggestion"),
    createdAt: issue.created_at,
    state: issue.state,
  };
}

function cleanTitle(title) {
  // Strip the "[priority] " prefix and " — location (score: X)" suffix,
  // leaving just the human-readable vulnerability name for the card heading.
  return title
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/\s*—.*$/, "")
    .trim();
}

function normalizePriority(label) {
  const m = label.match(PRIORITY_RE);
  if (!m) return "P3: Low";
  const level = label.match(/P([0-3])/i);
  return `P${level ? level[1] : "3"}: ${capitalize(m[1])}`;
}

function priorityRank(label) {
  const m = label.match(/P([0-3])/i);
  return m ? parseInt(m[1], 10) : 3;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function extractFromTitle(title, re) {
  const m = title.match(re);
  return m ? m[0] : null;
}

function scoreFromBody(body) {
  if (!body) return 0;
  const m = body.match(/Danger Score\*\*\s*\|\s*`?([\d.]+)/i);
  return m ? parseFloat(m[1]) : 0;
}

function locationFromBody(body) {
  if (!body) return "";
  const file = body.match(/\*\*File\*\*\s*\|\s*`([^`]+)`/i);
  const line = body.match(/\*\*Line\*\*\s*\|\s*`([^`]+)`/i);
  if (file) return line ? `${file[1]}:${line[1]}` : file[1];
  const pkg = body.match(/\*\*Package\*\*\s*\|\s*`([^`]+)`/i);
  return pkg ? pkg[1] : "";
}

function extractSection(body, headingText) {
  if (!body) return "";
  // Match from "## <headingText>...\n" up to the next "## " heading or "---" footer.
  const re = new RegExp(
    `##\\s*${escapeRegex(headingText)}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|\\n---)`,
    "i"
  );
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
