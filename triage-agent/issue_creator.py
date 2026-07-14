# issue_creator.py
import requests  # for HTTP requests to GitHub API
import json      # for building request body
import os        # for reading environment variables
import time      # for adding small delay between requests


REPO_OWNER = "NitinBaradhwaj"
REPO_NAME  = "OpsSec-Agentic-Triage"
API_BASE   = "https://api.github.com"

def get_token():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise ValueError(
            "GITHUB_TOKEN not found.\n"
            "Run this in your terminal first:\n"
            "  export GITHUB_TOKEN='your_token_here'"
        )
    return token


def build_issue_body(finding):
    """
    Builds a Markdown-formatted issue body from a finding.
    This is what developers will read in GitHub.
    """

    # --- Header section ---
    body = f"""## 🔍 Vulnerability Details

| Field | Value |
|-------|-------|
| **Severity** | `{finding['severity']}` |
| **Priority** | `{finding['priority']}` |
| **Danger Score** | `{finding['score']} / 10` |
| **Found by** | `{finding['source'].upper()}` scanner |
"""

    # --- Source-specific details ---
    if finding["source"] == "semgrep":
        body += f"""| **File** | `{finding['file']}` |
| **Line** | `{finding['line']}` |
"""
    else:
        body += f"""| **Package** | `{finding['package']}` |
| **Installed** | `{finding['installed_version']}` |
| **Fix version** | `{finding['fixed_version']}` |
| **CVE** | [{finding['cve']}](https://nvd.nist.gov/vuln/detail/{finding['cve']}) |
"""

    # --- Description ---
    body += f"""
## 📋 Description

{finding['description']}

"""

    # --- AI fix suggestion from Gemma ---
    body += f"""## 🤖 AI Fix Suggestion (Gemma 3)

{finding['fix_suggestion']}

"""

    # --- Footer ---
    body += """---
*This issue was automatically created by the DevSecOps Agentic Triage pipeline.*
*Scanner: Semgrep + Trivy | AI: Gemma 3 (local) | Scored by CVSS + EPSS*
"""

    return body


def build_labels(finding):
    """
    Returns a list of label names for this finding.
    Labels make it easy to filter issues in GitHub.
    """
    labels = [
        "security",              # always add this
        finding["priority"],     # "P0: Critical", "P1: High", etc.
        finding["source"],       # "semgrep" or "trivy"
        finding["severity"],     # "HIGH", "MEDIUM", etc.
    ]
    return labels


def ensure_label_exists(label_name, token):
    """
    Creates a GitHub label if it doesn't already exist.
    Each label has a name and a color (hex, no #).
    """

    # Color mapping for our labels
    label_colors = {
        "security":      "D93F0B",  # red-orange
        "P0: Critical":  "B60205",  # dark red
        "P1: High":      "E4E669",  # yellow
        "P2: Medium":    "0075CA",  # blue
        "P3: Low":       "CFD3D7",  # gray
        "semgrep":       "7057FF",  # purple
        "trivy":         "008672",  # green
        "CRITICAL":      "B60205",  # dark red
        "HIGH":          "E4E669",  # yellow
        "MEDIUM":        "0075CA",  # blue
        "LOW":           "CFD3D7",  # gray
    }

    color = label_colors.get(label_name, "EDEDED")  # default: light gray

    url = f"{API_BASE}/repos/{REPO_OWNER}/{REPO_NAME}/labels"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }

    # Try to create the label
    response = requests.post(url, headers=headers, json={
        "name":  label_name,
        "color": color,
    })

    # 201 = created, 422 = already exists (both are fine)
    if response.status_code == 201:
        print(f"    [labels] Created label: {label_name}")
    elif response.status_code == 422:
        pass  # label already exists, that's fine
    else:
        print(f"    [labels] Warning: could not create label '{label_name}': {response.status_code}")


def issue_already_exists(title, token):
    """
    Searches existing open issues for one with the same title.
    Returns True if found (skip), False if not found (create).
    """

    url = f"{API_BASE}/repos/{REPO_OWNER}/{REPO_NAME}/issues"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    params = {
        "state": "open",
        "per_page": 100,  # fetch up to 100 open issues
    }

    response = requests.get(url, headers=headers, params=params)

    if response.status_code != 200:
        # If we can't check, assume it doesn't exist and create it
        return False

    existing_issues = response.json()

    # Check if any existing issue has the same title
    for issue in existing_issues:
        if issue["title"] == title:
            return True

    return False

def create_issue(finding, token):
    """
    Creates a single GitHub Issue for one finding.
    Returns the URL of the created issue, or None if it failed.
    """

    # Build the issue title.
    # IMPORTANT: include the location (file:line, or package) in the title,
    # not just the rule name + score. Multiple distinct findings from the
    # same rule (e.g. 6 separate hardcoded secrets) would otherwise produce
    # identical titles, and issue_already_exists() would treat every one
    # after the first as a "duplicate" and silently drop it.
    location = f"{finding['file']}:{finding['line']}" if finding["source"] == "semgrep" else finding["package"]
    title = f"[{finding['priority']}] {finding['title']} — {location} (score: {finding['score']})"

    # Check for duplicates first
    if issue_already_exists(title, token):
        print(f"    [skip] Issue already exists: {title}")
        return None

    # Build labels and make sure they exist in GitHub
    labels = build_labels(finding)
    for label in labels:
        ensure_label_exists(label, token)

    # Build the issue body
    body = build_issue_body(finding)

    # POST to GitHub API
    url = f"{API_BASE}/repos/{REPO_OWNER}/{REPO_NAME}/issues"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    }
    payload = {
        "title":  title,
        "body":   body,
        "labels": labels,
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 201:
        issue_url = response.json()["html_url"]
        print(f"    [created] {issue_url}")
        return issue_url
    else:
        print(f"    [error] Failed to create issue: {response.status_code}")
        print(f"            {response.text[:200]}")
        return None

def create_all_issues(findings):
    """
    Creates GitHub Issues for all findings.
    Skips duplicates. Adds a small delay between requests
    to avoid hitting GitHub's rate limit.
    """

    print(f"\n[issues] Creating GitHub Issues for {len(findings)} findings...")

    token    = get_token()
    created  = []
    skipped  = 0

    for i, finding in enumerate(findings):
        print(f"\n  [{i+1}/{len(findings)}] {finding['title']}")

        url = create_issue(finding, token)

        if url:
            created.append(url)

        # Small delay between API calls — GitHub rate limit is 5000/hour
        # but being polite is good practice
        time.sleep(1)

    print(f"\n[issues] Done.")
    print(f"         Created: {len(created)} issues")
    print(f"         Skipped: {skipped} duplicates")

    if created:
        print(f"\n  View your issues:")
        print(f"  https://github.com/{REPO_OWNER}/{REPO_NAME}/issues")

    return created

if __name__ == "__main__":
    from parsers import parse_all
    from scoring import score_all
    from llm     import enrich_all
    import json

    # Sample data
    sample_semgrep = {
        "results": [
            {
                "check_id": "javascript.react.security.audit.react-dangerouslysetinnerhtml",
                "path": "src/pages/Dashboard.jsx",
                "start": {"line": 42},
                "extra": {
                    "severity": "ERROR",
                    "message": "Unsanitized user input passed to dangerouslySetInnerHTML. This could lead to XSS attacks."
                }
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
                        "Description": "Axios SSRF vulnerability allows server-side request forgery."
                    }
                ]
            }
        ]
    }

    with open("semgrep-results.json", "w") as f:
        json.dump(sample_semgrep, f)
    with open("trivy-results.json", "w") as f:
        json.dump(sample_trivy, f)

    # Full pipeline: parse → score → enrich → create issues
    findings = parse_all()
    scored   = score_all(findings)
    enriched = enrich_all(scored)
    urls     = create_all_issues(enriched)

    if urls:
        print(f"\n✅ Success! Check your issues at:")
        print(f"   https://github.com/{REPO_OWNER}/{REPO_NAME}/issues")