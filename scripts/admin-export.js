#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

async function main() {
  const baseUrl = (process.env.ADMIN_API_URL || 'https://admin-api.lythaus.co/api').replace(/\/+$/, '');
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
  if (!/^https:\/\//.test(baseUrl) || /\.azurewebsites\.net(?:\/|$)/i.test(baseUrl)) {
    console.error('ADMIN_API_URL must be an HTTPS Access-protected admin gateway; direct Azure origins are not permitted.');
    process.exit(2);
  }
  const url = `${baseUrl}/admin/export?userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    console.error('Export failed with HTTP status', res.status);
    process.exit(3);
  }
  const data = await res.text();
  const file = path.join(outDir, `admin_export_${userId}_${Date.now()}.json`);
  fs.writeFileSync(file, data);
  console.log('Saved export to', file);
}

main().catch(err => { console.error(err); process.exit(1); });

