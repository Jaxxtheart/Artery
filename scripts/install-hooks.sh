#!/usr/bin/env bash
# Installs the pre-push git hook so tests run automatically before every push.
set -euo pipefail

HOOK_PATH=".git/hooks/pre-push"

cat > "$HOOK_PATH" << 'EOF'
#!/usr/bin/env bash
# Git pre-push hook — runs the full test suite and saves a closure report.
# Installed by: npm run install-hooks
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
echo "Running pre-push test suite..."
./scripts/pre-deploy.sh
EOF

chmod +x "$HOOK_PATH"
echo "✅  Git pre-push hook installed at $HOOK_PATH"
echo "    Tests will now run automatically before every git push."
