#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

async function main() {
  const baseUrl = process.env.FUNCTION_BASE_URL || 'https://asora-function-flex.azurewebsites.net';
  const userId = process.argv[2];
  const outDir = process.argv[3] || '.';
  if (!userId) {
    console.error('Usage: node scripts/admin-export.js <userId> [outDir]');
    process.exit(1);
  }
  const token = process.env.ADMIN_BEARER_TOKEN || '';
  if (!token) {
    console.error('Missing ADMIN_BEARER_TOKEN env for admin role');
    process.exit(2);
  }
  const url = `${baseUrl}/api/admin/export?userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    console.error('Export failed:', res.status, await res.text());
    process.exit(3);
  }
  const data = await res.text();
  const file = path.join(outDir, `admin_export_${userId}_${Date.now()}.json`);
  fs.writeFileSync(file, data);
  console.log('Saved export to', file);
}

main().catch(err => { console.error(err); process.exit(1); });

