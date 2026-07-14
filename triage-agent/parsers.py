import json  # built-in Python library for reading JSON files

def make_finding(id, source, severity, title, description, file=None, line=None, cve=None, package=None, installed_version=None, fixed_version=None):
    """
    Creates one normalized finding dictionary.

    Think of this like a standard form.
    No matter where the finding came from (semgrep or trivy),
    it always has the same fields after going through this function.
    """
    return {
        "id":                id,                # unique ID we assign, e.g. "semgrep-001"
        "source":            source,            # "semgrep" or "trivy"
        "severity":          severity,          # "CRITICAL", "HIGH", "MEDIUM", "LOW"
        "title":             title,             # short name of the vulnerability
        "description":       description,       # what the problem is
        "file":              file,              # which file has the bug (semgrep only)
        "line":              line,              # which line number (semgrep only)
        "cve":               cve,              # CVE ID like "CVE-2021-3749" (trivy only)
        "package":           package,           # npm package name (trivy only)
        "installed_version": installed_version, # what version is installed (trivy only)
        "fixed_version":     fixed_version,     # what version fixes it (trivy only)
        "score":             0,                 # danger score — filled in by scoring.py later
        "fix_suggestion":    "",               # AI suggestion — filled in by llm.py later
    }



def parse_semgrep(filepath="semgrep-results.json"):
    """
    Reads the Semgrep JSON output file and normalizes each finding.

    Semgrep JSON structure looks like:
    {
      "results": [
        {
          "check_id": "javascript.react.security.audit.react-dangerouslysetinnerhtml",
          "path": "src/pages/Dashboard.jsx",
          "start": { "line": 42 },
          "extra": {
            "severity": "ERROR",
            "message": "Unsanitized user input in dangerouslySetInnerHTML..."
          }
        }
      ]
    }
    """

    findings = []  # we'll collect all findings here

    # Try to open the file — if it doesn't exist, return empty list
    try:
        with open(filepath, "r") as f:
            data = json.load(f)  # parse the entire JSON file into a Python dict
    except FileNotFoundError:
        print(f"[parsers] Warning: {filepath} not found. Skipping Semgrep results.")
        return []
    except json.JSONDecodeError:
        print(f"[parsers] Warning: {filepath} is not valid JSON. Skipping.")
        return []

    # data["results"] is the list of findings from Semgrep
    # If "results" key doesn't exist, default to empty list
    raw_findings = data.get("results", [])

    print(f"[parsers] Semgrep: found {len(raw_findings)} raw findings")

    # Loop through each raw finding and normalize it
    for index, raw in enumerate(raw_findings):

        # Pull out the fields we care about from Semgrep's format
        check_id    = raw.get("check_id", "unknown")       # the rule that fired
        path        = raw.get("path", "unknown")           # file path
        line        = raw.get("start", {}).get("line", 0)  # line number
        extra       = raw.get("extra", {})                 # nested object with more info
        message     = extra.get("message", "No description provided")
        raw_severity = extra.get("severity", "WARNING")

        # Semgrep uses ERROR/WARNING/INFO — convert to our standard levels
        severity = convert_semgrep_severity(raw_severity)

        # Make the title shorter and human-readable
        # "javascript.react.security.audit.react-dangerouslysetinnerhtml"
        # becomes "react-dangerouslysetinnerhtml"
        title = check_id.split(".")[-1].replace("-", " ").title()

        # Create a normalized finding using our standard shape
        finding = make_finding(
            id          = f"semgrep-{index + 1:03d}",  # e.g. "semgrep-001"
            source      = "semgrep",
            severity    = severity,
            title       = title,
            description = message,
            file        = path,
            line        = line,
        )

        findings.append(finding)

    return findings


def convert_semgrep_severity(raw):
    """
    Semgrep uses its own severity names.
    We convert them to our standard set.

    Semgrep    → Our standard
    ERROR      → HIGH
    WARNING    → MEDIUM
    INFO       → LOW
    """
    mapping = {
        "ERROR":   "HIGH",
        "WARNING": "MEDIUM",
        "INFO":    "LOW",
    }
    # .upper() makes it case-insensitive
    # .get() returns "MEDIUM" if the key isn't found
    return mapping.get(raw.upper(), "MEDIUM")


def parse_trivy(filepath="trivy-results.json"):
    """
    Reads the Trivy JSON output file and normalizes each finding.

    Trivy JSON structure looks like:
    {
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
              "Description": "Axios SSRF vulnerability..."
            }
          ]
        }
      ]
    }

    Notice how it's nested:
    Results (list) → each Result has Vulnerabilities (list) → each Vulnerability is one finding
    """

    findings = []

    try:
        with open(filepath, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"[parsers] Warning: {filepath} not found. Skipping Trivy results.")
        return []
    except json.JSONDecodeError:
        print(f"[parsers] Warning: {filepath} is not valid JSON. Skipping.")
        return []

    # Trivy has a nested structure: Results → Vulnerabilities
    # We need to loop through both levels
    raw_results = data.get("Results", [])

    # Count total vulnerabilities across all results for logging
    total = sum(len(r.get("Vulnerabilities") or []) for r in raw_results)
    print(f"[parsers] Trivy: found {total} raw vulnerabilities")

    finding_index = 1  # counter for IDs

    # First loop: go through each "Result" (usually one per package file)
    for result in raw_results:
        vulnerabilities = result.get("Vulnerabilities") or []
        # "or []" handles the case where Vulnerabilities is null in the JSON

        # Second loop: go through each vulnerability in this result
        for vuln in vulnerabilities:
            cve_id     = vuln.get("VulnerabilityID", "UNKNOWN")
            pkg_name   = vuln.get("PkgName", "unknown")
            installed  = vuln.get("InstalledVersion", "unknown")
            fixed      = vuln.get("FixedVersion", "unknown")
            severity   = vuln.get("Severity", "MEDIUM").upper()
            description = vuln.get("Description", "No description available.")

            # Title is simple: "CVE-2021-3749 in axios"
            title = f"{cve_id} in {pkg_name}"

            finding = make_finding(
                id                = f"trivy-{finding_index:03d}",  # e.g. "trivy-001"
                source            = "trivy",
                severity          = severity,
                title             = title,
                description       = description,
                cve               = cve_id,
                package           = pkg_name,
                installed_version = installed,
                fixed_version     = fixed,
            )

            findings.append(finding)
            finding_index += 1

    return findings


def parse_all(semgrep_file="semgrep-results.json", trivy_file="trivy-results.json"):
    """
    Runs both parsers and returns one combined list of all findings.
    agent.py calls this single function instead of calling each parser separately.
    """

    semgrep_findings = parse_semgrep(semgrep_file)
    trivy_findings   = parse_trivy(trivy_file)

    all_findings = semgrep_findings + trivy_findings

    print(f"[parsers] Total findings after combining: {len(all_findings)}")
    print(f"          Semgrep: {len(semgrep_findings)}")
    print(f"          Trivy:   {len(trivy_findings)}")

    return all_findings

if __name__ == "__main__":
    # This block only runs when you run this file directly.
    # It does NOT run when another file imports parsers.py.
    # This is a Python convention for testing a module in isolation.

    print("=" * 50)
    print("Testing parsers with sample data...")
    print("=" * 50)

    # Create fake semgrep output to test with
    # (In real use, this comes from the actual scanner)
    sample_semgrep = {
        "results": [
            {
                "check_id": "javascript.react.security.audit.react-dangerouslysetinnerhtml",
                "path": "src/pages/Dashboard.jsx",
                "start": {"line": 42},
                "extra": {
                    "severity": "ERROR",
                    "message": "Unsanitized user input passed to dangerouslySetInnerHTML. This could lead to XSS."
                }
            },
            {
                "check_id": "javascript.lang.security.audit.hardcoded-secret",
                "path": "src/pages/Transfer.jsx",
                "start": {"line": 12},
                "extra": {
                    "severity": "ERROR",
                    "message": "Hardcoded API key found in source code."
                }
            }
        ]
    }

    # Create fake trivy output to test with
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
                    },
                    {
                        "VulnerabilityID": "CVE-2021-23337",
                        "PkgName": "lodash",
                        "InstalledVersion": "4.17.20",
                        "FixedVersion": "4.17.21",
                        "Severity": "HIGH",
                        "Description": "Lodash prototype pollution via the set function."
                    }
                ]
            }
        ]
    }

    # Write sample files to disk so our parsers can read them
    with open("semgrep-results.json", "w") as f:
        json.dump(sample_semgrep, f)

    with open("trivy-results.json", "w") as f:
        json.dump(sample_trivy, f)

    # Now run the parsers
    findings = parse_all()

    print("\n--- NORMALIZED FINDINGS ---")
    for f in findings:
        print(f"\n[{f['id']}] {f['title']}")
        print(f"  Source:   {f['source']}")
        print(f"  Severity: {f['severity']}")
        print(f"  File:     {f['file'] or f['package']}")
        print(f"  Desc:     {f['description'][:80]}...")