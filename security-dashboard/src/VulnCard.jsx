const PRIORITY_STYLES = {
  0: { color: "#ef4444", bg: "#2a1315", label: "P0 · Critical" },
  1: { color: "#f97316", bg: "#2a1d10", label: "P1 · High" },
  2: { color: "#3b82f6", bg: "#12203a", label: "P2 · Medium" },
  3: { color: "#9ca3af", bg: "#1f2226", label: "P3 · Low" },
};

const SOURCE_LABEL = {
  semgrep: "Semgrep · SAST",
  trivy: "Trivy · SCA",
  unknown: "Unknown scanner",
};

export default function VulnCard({ finding }) {
  const style = PRIORITY_STYLES[finding.priorityRank] ?? PRIORITY_STYLES[3];

  return (
    <a
      href={finding.htmlUrl}
      target="_blank"
      rel="noreferrer"
      className="card"
      style={{ borderLeftColor: style.color }}
    >
      <div className="card-header">
        <span
          className="priority-pill"
          style={{ color: style.color, background: style.bg }}
        >
          {style.label}
        </span>
        <span className="score" style={{ color: style.color }}>
          {finding.score.toFixed(2)}
          <span className="score-max">/10</span>
        </span>
      </div>

      <h3 className="card-title">{finding.title}</h3>

      <div className="card-meta">
        <span>{SOURCE_LABEL[finding.source] ?? finding.source}</span>
        <span className="dot">•</span>
        <span>{finding.severity}</span>
        {finding.location && (
          <>
            <span className="dot">•</span>
            <span className="location">{finding.location}</span>
          </>
        )}
      </div>

      {finding.fixSuggestion && (
        <div className="fix-suggestion">
          <span className="fix-label">🤖 Gemma's fix</span>
          <p>{truncate(finding.fixSuggestion, 220)}</p>
        </div>
      )}

      <div className="card-footer">
        <span>#{finding.number}</span>
        <span className="view-link">View issue →</span>
      </div>
    </a>
  );
}

function truncate(text, max) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max).trim() + "…" : clean;
}
