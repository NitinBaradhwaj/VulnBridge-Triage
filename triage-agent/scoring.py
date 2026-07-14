# scoring.py
EPSS_SCORES = {
    "CVE-2021-3749":  0.974,  # axios SSRF        — 97.4% chance of exploit
    "CVE-2021-23337": 0.532,  # lodash pollution   — 53.2% chance of exploit
    "CVE-2021-44906": 0.680,  # minimist pollution — 68.0% chance of exploit
    "CVE-2024-45296": 0.210,  # path-to-regexp     — 21.0% chance of exploit
}



SEVERITY_BASE = {
    "CRITICAL": 10.0,
    "HIGH":      7.5,
    "MEDIUM":    5.0,
    "LOW":       2.5,
    "INFO":      1.0,
}


SOURCE_WEIGHT = {
    "semgrep": 8.0,   # bug is in your code
    "trivy":   6.0,   # bug is in a dependency
}


def score_finding(finding):
    """
    Takes one normalized finding from parsers.py
    Returns the same finding with a 'score' field filled in.

    The score is 0-10. Higher = more dangerous = fix first.
    """

    # --- Part 1: Severity base (50% of score) ---
    # Get the base score for this severity level
    # If severity is unknown, default to MEDIUM (5.0)
    severity     = finding.get("severity", "MEDIUM").upper()
    severity_val = SEVERITY_BASE.get(severity, 5.0)

    # --- Part 2: EPSS score (30% of score) ---
    # Look up the CVE in our EPSS table
    # If no CVE (semgrep findings don't have CVEs), default to 0.5 (50%)
    cve       = finding.get("cve")
    epss_raw  = EPSS_SCORES.get(cve, 0.5) if cve else 0.5
    epss_val  = epss_raw * 10  # convert 0-1 scale to 0-10 scale

    # --- Part 3: Source weight (20% of score) ---
    source      = finding.get("source", "semgrep")
    source_val  = SOURCE_WEIGHT.get(source, 6.0)

    # --- Combine with weights ---
    score = (severity_val * 0.5) + (epss_val * 0.3) + (source_val * 0.2)

    # Round to 2 decimal places — cleaner output
    score = round(score, 2)

    # Add score and priority label back to the finding
    finding["score"]    = score
    finding["priority"] = get_priority_label(score)

    return finding


def get_priority_label(score):
    """
    Converts a numeric score into a human-readable priority label.
    This is what shows up in the GitHub Issue title.

    Score range → Label
    8.0 - 10.0  → P0: Critical (fix today)
    6.0 -  7.9  → P1: High (fix this week)
    4.0 -  5.9  → P2: Medium (fix this sprint)
    0.0 -  3.9  → P3: Low (add to backlog)
    """
    if score >= 8.0:
        return "P0: Critical"
    elif score >= 6.0:
        return "P1: High"
    elif score >= 4.0:
        return "P2: Medium"
    else:
        return "P3: Low"

def score_all(findings):
    """
    Scores every finding and sorts them highest score first.
    agent.py calls this after parse_all().
    """

    print(f"\n[scoring] Scoring {len(findings)} findings...")

    # Score each finding (modifies in place and returns it)
    scored = [score_finding(f) for f in findings]

    # Sort by score descending — highest danger first
    # key=lambda f: f["score"] means "sort by the score field"
    # reverse=True means highest first
    scored.sort(key=lambda f: f["score"], reverse=True)

    print(f"[scoring] Done. Priority breakdown:")
    for label in ["P0: Critical", "P1: High", "P2: Medium", "P3: Low"]:
        count = sum(1 for f in scored if f["priority"] == label)
        if count > 0:
            print(f"          {label}: {count} finding(s)")

    return scored

if __name__ == "__main__":
    # Import parsers so we can get real normalized findings to score
    from parsers import parse_all
    import json

    # Write sample files so parsers can read them
    sample_semgrep = {
        "results": [
            {
                "check_id": "javascript.react.security.audit.react-dangerouslysetinnerhtml",
                "path": "src/pages/Dashboard.jsx",
                "start": {"line": 42},
                "extra": {"severity": "ERROR", "message": "XSS via dangerouslySetInnerHTML"}
            },
            {
                "check_id": "javascript.lang.security.audit.hardcoded-secret",
                "path": "src/pages/Transfer.jsx",
                "start": {"line": 12},
                "extra": {"severity": "ERROR", "message": "Hardcoded API key in source code"}
            }
        ]
    }

    sample_trivy = {
        "Results": [
            {
                "Target": "package.json",
                "Vulnerabilities": [
                    {
                        "VulnerabilityID": "CVE-2021-3749",
                        "PkgName": "axios",
                        "InstalledVersion": "0.21.1",
                        "FixedVersion": "0.21.2",
                        "Severity": "HIGH",
                        "Description": "Axios SSRF vulnerability"
                    },
                    {
                        "VulnerabilityID": "CVE-2021-23337",
                        "PkgName": "lodash",
                        "InstalledVersion": "4.17.20",
                        "FixedVersion": "4.17.21",
                        "Severity": "HIGH",
                        "Description": "Lodash prototype pollution"
                    }
                ]
            }
        ]
    }

    with open("semgrep-results.json", "w") as f:
        json.dump(sample_semgrep, f)
    with open("trivy-results.json", "w") as f:
        json.dump(sample_trivy, f)

    # Parse then score
    findings = parse_all()
    scored   = score_all(findings)

    print("\n--- SCORED FINDINGS (highest danger first) ---")
    for f in scored:
        source_label = f["file"] or f["package"]
        print(f"\n[{f['priority']}] score={f['score']} — {f['title']}")
        print(f"  Where:    {source_label}")
        print(f"  Severity: {f['severity']}")
        if f.get("cve"):
            epss = EPSS_SCORES.get(f["cve"], 0.5)
            print(f"  EPSS:     {epss*100:.1f}% chance of exploit")