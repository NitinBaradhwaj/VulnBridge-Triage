# llm.py
import requests  # for making HTTP requests to Ollama
import json      # for parsing the response


OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "gemma3:4b"

def build_prompt(finding):
    """
    Takes one normalized finding and builds a prompt for Gemma.
    Different prompt for semgrep vs trivy findings
    because they have different relevant details.
    """

    # Common header for all findings
    header = f"""You are a senior security engineer reviewing a vulnerability report.
Be concise and practical. Developers will read this.

VULNERABILITY DETAILS:
- Title: {finding['title']}
- Severity: {finding['severity']}
- Priority: {finding['priority']}
- Source: {finding['source'].upper()} scanner
- Description: {finding['description']}
"""

    # Extra context depending on finding type
    if finding["source"] == "semgrep":
        # Code vulnerability — include file and line info
        context = f"""- File: {finding['file']}
- Line: {finding['line']}

This is a code-level vulnerability found directly in the source code.
"""
    else:
        # Dependency vulnerability — include CVE and version info
        context = f"""- Package: {finding['package']}
- Installed version: {finding['installed_version']}
- Fixed version: {finding['fixed_version']}
- CVE ID: {finding['cve']}

This is a known CVE in a third-party dependency.
"""

    # What we want back — structured output
    instructions = """
Please provide:

1. WHAT IS THIS: Explain this vulnerability in 2 sentences that a junior developer can understand. No jargon.

2. WHY IT'S DANGEROUS: One sentence on what an attacker could actually do if they exploit this.

3. HOW TO FIX IT: Exact steps to fix this. Include a code snippet if relevant. Be specific.

4. VERIFY: One sentence on how to confirm the fix worked.

Keep your total response under 200 words.
"""

    return header + context + instructions


def ask_gemma(prompt):
    """
    Sends a prompt to Gemma 3 via Ollama's local API.
    Returns the response as a string.

    Ollama API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
    """

    # The request body Ollama expects
    payload = {
        "model":  OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,  # False = wait for full response, don't stream tokens
    }

    try:
        # POST request to local Ollama server
        # timeout=120 means wait up to 2 minutes for a response
        # (Gemma 3 4b is fast but give it room on slow machines)
        response = requests.post(
            OLLAMA_URL,
            json=payload,       # automatically sets Content-Type: application/json
            timeout=120
        )

        # Raise an error if HTTP status is not 200
        response.raise_for_status()

        # Parse the JSON response
        data = response.json()

        # Ollama puts the model's reply in data["response"]
        return data.get("response", "No response from model.")

    except requests.exceptions.ConnectionError:
        # Ollama isn't running
        return "ERROR: Could not connect to Ollama. Is it running? Try: ollama serve"

    except requests.exceptions.Timeout:
        # Model took too long
        return "ERROR: Ollama timed out. The model may be overloaded."

    except requests.exceptions.RequestException as e:
        # Any other HTTP error
        return f"ERROR: Ollama request failed: {str(e)}"

def get_fix_suggestion(finding):
    """
    Takes one scored finding.
    Asks Gemma for a fix suggestion.
    Returns the finding with 'fix_suggestion' filled in.
    """

    print(f"  [llm] Asking Gemma about: {finding['title']}...")

    # Build the prompt for this specific finding
    prompt = build_prompt(finding)

    # Ask Gemma
    suggestion = ask_gemma(prompt)

    # Store the suggestion back in the finding
    finding["fix_suggestion"] = suggestion

    return finding

def enrich_all(findings):
    """
    Calls get_fix_suggestion() for every finding.
    Returns the enriched list.

    Note: this calls Gemma once per finding.
    With 4 findings and Gemma 3 4b, expect ~30-60 seconds total.
    """

    print(f"\n[llm] Getting fix suggestions from Gemma 3 for {len(findings)} findings...")
    print(f"      This may take 30-60 seconds...\n")

    enriched = []
    for i, finding in enumerate(findings):
        print(f"  [{i+1}/{len(findings)}] {finding['title']}")
        enriched_finding = get_fix_suggestion(finding)
        enriched.append(enriched_finding)

    print(f"\n[llm] Done. All findings enriched with fix suggestions.")
    return enriched


if __name__ == "__main__":
    from parsers import parse_all
    from scoring import score_all
    import json

    # Write sample data
    sample_semgrep = {
        "results": [
            {
                "check_id": "javascript.react.security.audit.react-dangerouslysetinnerhtml",
                "path": "src/pages/Dashboard.jsx",
                "start": {"line": 42},
                "extra": {
                    "severity": "ERROR",
                    "message": "Unsanitized user input passed to dangerouslySetInnerHTML. This could lead to XSS attacks where malicious scripts are injected into the page."
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
                        "Description": "Axios SSRF vulnerability allows attackers to bypass SSRF protections by providing a URL that redirects to a local/internal resource."
                    }
                ]
            }
        ]
    }

    with open("semgrep-results.json", "w") as f:
        json.dump(sample_semgrep, f)
    with open("trivy-results.json", "w") as f:
        json.dump(sample_trivy, f)

    # Parse → Score → Enrich with LLM
    findings = parse_all()
    scored   = score_all(findings)

    # Only test with top 2 findings to save time
    top2 = scored[:2]
    enriched = enrich_all(top2)

    print("\n--- FIX SUGGESTIONS FROM GEMMA 3 ---")
    for f in enriched:
        print(f"\n{'='*50}")
        print(f"[{f['priority']}] {f['title']}")
        print(f"Score: {f['score']}")
        print(f"\nGemma says:")
        print(f['fix_suggestion'])