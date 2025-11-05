#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const srcEntry = path.join(distDir, 'src', 'index.js');
const destEntry = path.join(distDir, 'index.js');

if (!fs.existsSync(srcEntry)) {
  console.error('Expected build output missing at', srcEntry);
  process.exit(1);
}
fs.mkdirSync(distDir, { recursive: true });

// 1) Classic /api/health (zero-dependency; no imports)
const healthDir = path.join(distDir, 'health');
fs.mkdirSync(healthDir, { recursive: true });

fs.writeFileSync(
  path.join(healthDir, 'function.json'),
  JSON.stringify({
    bindings: [
      { authLevel: 'anonymous', type: 'httpTrigger', direction: 'in', name: 'req', methods: ['get'], route: 'health' },
      { type: 'http', direction: 'out', name: 'res' }
    ]
  }, null, 2)
);

fs.writeFileSync(
  path.join(healthDir, 'index.js'),
  `const H={"Content-Type":"application/json","Cache-Control":"no-store, no-cache, must-revalidate"};
module.exports=async function(context){
  let commit="unknown";
  try{ const raw=process.env.GIT_SHA||""; commit=(raw.trim()||"unknown"); }catch{}
  const payload={status:"ok",commit,service:"asora-functions",timestamp:new Date().toISOString()};
  context.res={status:200,headers:H,body:JSON.stringify(payload)};
};
`
);

// 2) Copy root metadata into dist
fs.copyFileSync(path.join(rootDir, 'host.json'), path.join(distDir, 'host.json'));
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify({
    name: pkg.name,
    version: pkg.version,
    private: true,
    type: 'commonjs',
    main: 'index.js',
    engines: pkg.engines,
    dependencies: pkg.dependencies
  }, null, 2)
);

// 3) Prune tests/specs from dist
(function prune(dir){
  for (const e of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()){
      if (e.name === '__tests__' || e.name === 'tests') { fs.rmSync(p, { recursive:true, force:true }); continue; }
      prune(p); continue;
    }
    if (/\.(test|spec)\.[cm]?js$/.test(e.name) || /\.test\.d\.ts$/.test(e.name)) fs.rmSync(p, { force:true });
  }
})(distDir);

// 4) Hardened bootstrap: try main, else best-effort route registration (never import health here)
const fallbackModules = [
  './src/shared/routes/ready',
  './src/feed/routes/getFeed',
  './src/feed/routes/createPost',
  './src/auth/routes/authorize',
  './src/auth/routes/getConfig',
  './src/auth/routes/ping',
  './src/auth/routes/token',
  './src/auth/routes/userinfo',
  './src/moderation/routes/flagContent',
  './src/moderation/routes/submitAppeal',
  './src/moderation/routes/voteOnAppeal',
  './src/privacy/routes/deleteUser',
  './src/privacy/routes/exportUser'
];

fs.writeFileSync(destEntry,
`try { require('./src/index.js'); }
catch (e) {
  console.error('[bootstrap] ./src/index.js failed:', (e && e.message) || e);
  for (const m of ${JSON.stringify(fallbackModules)}) {
    try { require(m); } catch (err) { console.error('[bootstrap] skip', m, (err && err.message) || err); }
  }
}
`
);
