#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# pre-deploy.sh — run full test suite and save a JSON closure report.
# Blocks deployment if any test fails.
#
# Usage:
#   npm run pre-deploy          (from package.json script)
#   ./scripts/pre-deploy.sh     (directly)
#
# Installs as a git pre-push hook via: npm run install-hooks
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DATE_TAG=$(date -u +%Y%m%d-%H%M%S)
REPORT_DIR="test-reports"
TAP_TMP=$(mktemp)
REPORT_FILE="$REPORT_DIR/closure-$DATE_TAG.json"

mkdir -p "$REPORT_DIR"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       Artery Capital — Pre-Deploy Test Suite                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo "  Branch    : $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
echo "  Commit    : $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo "  Timestamp : $TIMESTAMP"
echo ""

# Run all test files.
# --test-reporter spec → human-readable output to stdout
# --test-reporter tap  → machine-readable TAP to temp file for report
TEST_FILES=$(ls tests/*.test.js 2>/dev/null | tr '\n' ' ')

if [ -z "$TEST_FILES" ]; then
  echo "❌  No test files found in tests/"
  exit 1
fi

set +e
node --test \
  --test-reporter spec --test-reporter-destination stdout \
  --test-reporter tap  --test-reporter-destination "$TAP_TMP" \
  $TEST_FILES
TEST_EXIT=$?
set -e

echo ""
echo "─────────────────────────────────────────────────────────────────"

# Generate the JSON closure report
node scripts/save-report.js "$TAP_TMP" "$REPORT_FILE" "$TIMESTAMP"
rm -f "$TAP_TMP"

echo "─────────────────────────────────────────────────────────────────"

if [ $TEST_EXIT -eq 0 ]; then
  echo "✅  ALL TESTS PASSED — safe to deploy"
  echo ""
  exit 0
else
  echo "❌  TESTS FAILED — deployment blocked"
  echo "    Fix failing tests before pushing to production."
  echo "    Full report: $REPORT_FILE"
  echo ""
  exit 1
fi
