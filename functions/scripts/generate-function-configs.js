#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🔧 Generating function.json files...');

const functionConfigs = {
  'feed-get': { file: 'feed/get.js', bindings: [
    { authLevel: 'function', type: 'httpTrigger', direction: 'in', name: 'req', methods: ['get'] },
    { type: 'http', direction: 'out', name: 'res' }
  ]},
  'feed-local': { file: 'feed/local.js', bindings: [
    { authLevel: 'function', type: 'httpTrigger', direction: 'in', name: 'req', methods: ['get'] },
    { type: 'http', direction: 'out', name: 'res' }
  ]},
  'feed-trending': { file: 'feed/trending.js', bindings: [
    { authLevel: 'function', type: 'httpTrigger', direction: 'in', name: 'req', methods: ['get'] },
    { type: 'http', direction: 'out', name: 'res' }
  ]},
  'feed-newCreators': { file: 'feed/newCreators.js', bindings: [
    { authLevel: 'function', type: 'httpTrigger', direction: 'in', name: 'req', methods: ['get'] },
    { type: 'http', direction: 'out', name: 'res' }
  ]},
  'privacy-cleanup-timer': { file: 'timers/privacyCleanupTimer.js', bindings: [
    { name: 'myTimer', type: 'timerTrigger', direction: 'in', schedule: '0 0 2 * * *' }
  ], useMonitor: true },
  'calculate-kpis-timer': { file: 'timers/calculateKPIsTimer.js', bindings: [
    { name: 'myTimer', type: 'timerTrigger', direction: 'in', schedule: '0 0 1 * * *' }
  ], useMonitor: true },
  'first-post-enforcer': { file: 'timers/firstPostEnforcer.js', bindings: [
    { name: 'myTimer', type: 'timerTrigger', direction: 'in', schedule: '0 */30 * * * *' }
  ], useMonitor: true }
};

let generatedCount = 0;

for (const [functionName, config] of Object.entries(functionConfigs)) {
  const jsFilePath = path.join('dist', config.file);
  
  if (!fs.existsSync(jsFilePath)) {
    console.log(`⚠️  Skipping ${functionName} - no JS found at ${jsFilePath}`);
    continue;
  }
  
  const functionDir = path.join('dist', functionName);
  if (!fs.existsSync(functionDir)) {
    fs.mkdirSync(functionDir, { recursive: true });
  }
  
  // Create function.json
  const functionConfig = {
    bindings: config.bindings,
    ...(config.useMonitor && { useMonitor: config.useMonitor })
  };
  
  fs.writeFileSync(path.join(functionDir, 'function.json'), JSON.stringify(functionConfig, null, 2));
  
  // Create index.js - simple relative import
  const relativeImport = '../' + config.file.replace('.js', '');
  fs.writeFileSync(path.join(functionDir, 'index.js'), `module.exports = require('${relativeImport}');`);
  
  console.log(`✅ Generated ${functionName}`);
  generatedCount++;
}

console.log(`🎉 Generated ${generatedCount} function.json files`);

// Verify
const jsonFiles = [];
function findJsonFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      findJsonFiles(path.join(dir, entry.name));
    } else if (entry.name === 'function.json') {
      jsonFiles.push(path.join(dir, entry.name));
    }
  }
}

findJsonFiles('dist');
console.log(`\n📋 Total function.json files: ${jsonFiles.length}`);
jsonFiles.forEach(f => console.log(`   ${f}`));
