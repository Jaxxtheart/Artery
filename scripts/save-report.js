#!/usr/bin/env node
/**
 * Parses TAP output from node --test and writes a structured JSON closure report.
 * Usage: node scripts/save-report.js <tap-input-file> <output-report-file> <iso-timestamp>
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const [,, tapFile, reportFile, timestamp] = process.argv;
if (!tapFile || !reportFile) {
  console.error('Usage: save-report.js <tap-file> <report-file> <timestamp>');
  process.exit(1);
}

const tap   = fs.readFileSync(tapFile, 'utf8');
const lines = tap.split('\n');

const tests  = [];
let total = 0, passed = 0, failed = 0;

for (const line of lines) {
  const m = line.match(/^(ok|not ok)\s+(\d+)\s+-\s+(.+)$/);
  if (!m) continue;
  total++;
  const pass = m[1] === 'ok';
  if (pass) passed++; else failed++;
  tests.push({ id: parseInt(m[2], 10), name: m[3].trim(), status: pass ? 'PASS' : 'FAIL' });
}

let commit = 'unknown';
let branch = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch { /* no git context */ }

const report = {
  timestamp:   timestamp || new Date().toISOString(),
  commit,
  branch,
  status:      failed === 0 ? 'PASS' : 'FAIL',
  summary:     { total, passed, failed, skipped: 0 },
  tests,
};

fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
console.log(`\nClosure report saved → ${reportFile}`);
console.log(`Status: ${report.status}  |  ${passed}/${total} passed`);
