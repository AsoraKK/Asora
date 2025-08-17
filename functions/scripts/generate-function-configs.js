#!/usr/bin/env node
/**
 * Generate function.json files for each Azure Function
 * This script creates the necessary configuration files for deployment
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = 'dist';

// Function configurations based on actual file structure
const functionConfigs = {
  // Feed functions (HTTP triggers) - Note: files are compiled directly, not in subdirectories
  'feed-get': {
    file: 'feed/get.js',
    bindings: [
      {
        authLevel: 'function',
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        methods: ['get'],
      },
      {
        type: 'http',
        direction: 'out',
        name: 'res',
      },
    ],
  },
  'feed-local': {
    file: 'feed/local.js',
    bindings: [
      {
        authLevel: 'function',
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        methods: ['get'],
      },
      {
        type: 'http',
        direction: 'out',
        name: 'res',
      },
    ],
  },
  'feed-trending': {
    file: 'feed/trending.js',
    bindings: [
      {
        authLevel: 'function',
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        methods: ['get'],
      },
      {
        type: 'http',
        direction: 'out',
        name: 'res',
      },
    ],
  },
  'feed-newCreators': {
    file: 'feed/newCreators.js',
    bindings: [
      {
        authLevel: 'function',
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        methods: ['get'],
      },
      {
        type: 'http',
        direction: 'out',
        name: 'res',
      },
    ],
  },
  // Timer functions
  'privacy-cleanup-timer': {
    file: 'timers/privacyCleanupTimer.js',
    bindings: [
      {
        name: 'myTimer',
        type: 'timerTrigger',
        direction: 'in',
        schedule: '0 0 2 * * *', // 2 AM daily
      },
    ],
    useMonitor: true,
  },
  'calculate-kpis-timer': {
    file: 'timers/calculateKPIsTimer.js',
    bindings: [
      {
        name: 'myTimer',
        type: 'timerTrigger',
        direction: 'in',
        schedule: '0 0 1 * * *', // 1 AM daily
      },
    ],
    useMonitor: true,
  },
  'first-post-enforcer': {
    file: 'timers/firstPostEnforcer.js',
    bindings: [
      {
        name: 'myTimer',
        type: 'timerTrigger',
        direction: 'in',
        schedule: '0 */30 * * * *', // Every 30 minutes
      },
    ],
    useMonitor: true,
  },
  health: {
    file: 'shared/health.js',
    bindings: [
      {
        authLevel: 'anonymous',
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        methods: ['get'],
        route: 'health',
      },
      {
        type: 'http',
        direction: 'out',
        name: 'res',
      },
    ],
  },
};

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generate function.json files
 */
function generateFunctionConfigs() {
  console.log('🔧 Generating function.json files...');

  let generatedCount = 0;

  for (const [functionName, config] of Object.entries(functionConfigs)) {
    const jsFilePath = path.join(DIST_DIR, config.file);

    // Check if the compiled JS file exists
    if (!fs.existsSync(jsFilePath)) {
      console.log(`⚠️  Skipping ${functionName} - no compiled JS found at ${jsFilePath}`);
      continue;
    }

    // Create function directory in dist
    const functionDir = path.join(DIST_DIR, functionName);
    ensureDir(functionDir);

    // Create function.json
    const functionJsonPath = path.join(functionDir, 'function.json');
    const functionConfig = {
      bindings: config.bindings,
      ...(config.useMonitor && { useMonitor: config.useMonitor }),
    };

    fs.writeFileSync(functionJsonPath, JSON.stringify(functionConfig, null, 2));

    // Create index.js that imports the actual compiled file
    const indexJsPath = path.join(functionDir, 'index.js');
    const relativeImportPath = path
      .relative(functionDir, jsFilePath)
      .replace(/\\/g, '/')
      .replace(/\.js$/, '');
    const indexContent = `module.exports = require('./${relativeImportPath}');`;
    fs.writeFileSync(indexJsPath, indexContent);

    console.log(`✅ Generated ${functionName}: ${functionJsonPath}`);
    generatedCount++;
  }

  console.log(`🎉 Generated ${generatedCount} function.json files`);

  // Verify all function.json files exist
  console.log('\n📋 Verification:');
  const functionJsonFiles = [];

  function findFunctionJsonFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findFunctionJsonFiles(fullPath);
      } else if (entry.name === 'function.json') {
        functionJsonFiles.push(fullPath);
      }
    }
  }

  if (fs.existsSync(DIST_DIR)) {
    findFunctionJsonFiles(DIST_DIR);
    functionJsonFiles.forEach(file => console.log(`   ${file}`));
    console.log(`\n✅ Total function.json files: ${functionJsonFiles.length}`);
  } else {
    console.log('❌ dist/ directory not found. Run npm run compile first.');
  }
}

// Run the generator
generateFunctionConfigs();
