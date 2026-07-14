# agent.py
import sys
import json
import argparse
from datetime import datetime

# Import our 4 modules
from parsers       import parse_all
from scoring       import score_all
from llm           import enrich_all
from issue_creator import create_all_issues

# Only create issues for findings at or above this score
# Prevents noise from low-priority findings
MIN_SCORE_TO_CREATE_ISSUE = 5.0

# Only process top N findings per run
# Prevents hammering GitHub API if scanner finds 200 issues
MAX_ISSUES_PER_RUN = 10

# Scan result file paths (matches what GitHub Actions saves)
SEMGREP_FILE = "semgrep-results.json"
TRIVY_FILE   = "trivy-results.json"

def print_banner():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("=" * 60)
    print("  DevSecOps Agentic Triage Pipeline")
    print(f"  Started: {now}")
    print("=" * 60)


def print_summary(all_findings, filtered, created_urls):
    print("\n" + "=" * 60)
    print("  PIPELINE SUMMARY")
    print("=" * 60)
    print(f"  Total findings:     {len(all_findings)}")
    print(f"  Above threshold:    {len(filtered)}")
    print(f"  Issues created:     {len(created_urls)}")

    if all_findings:
        print(f"\n  Score breakdown:")
        for f in all_findings:
            bar = "█" * int(f["score"])
            print(f"  {bar:<10} {f['score']:.2f}  [{f['priority']}] {f['title'][:40]}")

    print("=" * 60)


def filter_findings(findings):
    """
    Keeps only findings above MIN_SCORE_TO_CREATE_ISSUE.
    Also caps at MAX_ISSUES_PER_RUN.

    findings are already sorted highest score first
    (score_all() sorts them for us)
    """
    filtered = [f for f in findings if f["score"] >= MIN_SCORE_TO_CREATE_ISSUE]

    if len(filtered) > MAX_ISSUES_PER_RUN:
        print(f"[agent] Capping at top {MAX_ISSUES_PER_RUN} findings (found {len(filtered)})")
        filtered = filtered[:MAX_ISSUES_PER_RUN]

    return filtered

def dry_run_output(findings):
    """
    Prints findings to terminal instead of creating GitHub Issues.
    Run with: python agent.py --dry-run
    """
    print("\n[agent] DRY RUN MODE — no issues will be created\n")

    for f in findings:
        print(f"{'='*60}")
        print(f"Title:    [{f['priority']}] {f['title']}")
        print(f"Score:    {f['score']} / 10")
        print(f"Severity: {f['severity']}")
        print(f"Source:   {f['source']}")

        if f["source"] == "semgrep":
            print(f"File:     {f['file']}:{f['line']}")
        else:
            print(f"Package:  {f['package']}@{f['installed_version']} → fix: {f['fixed_version']}")

        print(f"\nGemma's fix suggestion:")
        print(f"{f['fix_suggestion'][:300]}...")
        print()

def run_pipeline(dry_run=False):
    """
    Runs the full triage pipeline:
    parse → score → filter → enrich → create issues

    dry_run=True: print output only, don't create GitHub Issues
    """

    print_banner()

    print("\n[agent] Step 1: Parsing scan results...")
    all_findings = parse_all(SEMGREP_FILE, TRIVY_FILE)

    if not all_findings:
        print("[agent] No findings found. Pipeline complete.")
        return

    print("\n[agent] Step 2: Scoring findings...")
    scored_findings = score_all(all_findings)

    print(f"\n[agent] Step 3: Filtering (min score: {MIN_SCORE_TO_CREATE_ISSUE})...")
    filtered_findings = filter_findings(scored_findings)

    if not filtered_findings:
        print(f"[agent] No findings above threshold {MIN_SCORE_TO_CREATE_ISSUE}. Done.")
        return

    print(f"[agent] {len(filtered_findings)} findings will be processed")

    print("\n[agent] Step 4: Getting fix suggestions from Gemma 3...")
    enriched_findings = enrich_all(filtered_findings)

    if dry_run:
        dry_run_output(enriched_findings)
        created_urls = []
    else:
        print("\n[agent] Step 5: Creating GitHub Issues...")
        created_urls = create_all_issues(enriched_findings)

    print_summary(scored_findings, filtered_findings, created_urls)

    return created_urls

if __name__ == "__main__":

    # Parse command line arguments
    # This lets you run: python agent.py --dry-run
    parser = argparse.ArgumentParser(
        description="DevSecOps Agentic Triage Pipeline"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print findings without creating GitHub Issues"
    )
    parser.add_argument(
        "--semgrep-file",
        default=SEMGREP_FILE,
        help=f"Path to Semgrep results JSON (default: {SEMGREP_FILE})"
    )
    parser.add_argument(
        "--trivy-file",
        default=TRIVY_FILE,
        help=f"Path to Trivy results JSON (default: {TRIVY_FILE})"
    )

    args = parser.parse_args()

    # Update file paths if provided via command line
    SEMGREP_FILE = args.semgrep_file
    TRIVY_FILE   = args.trivy_file

    # Run the pipeline
    try:
        run_pipeline(dry_run=args.dry_run)
    except KeyboardInterrupt:
        print("\n[agent] Interrupted by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n[agent] Pipeline failed: {e}")
        raise