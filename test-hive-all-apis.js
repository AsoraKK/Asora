#!/usr/bin/env node

/**
 * LYTHAUS - Hive AI Complete API Test Suite
 * 
 * Tests all three Hive AI moderation APIs:
 * 1. Text API - Text content moderation
 * 2. Image/Visual API - Image content moderation  
 * 3. Deepfake API - Synthetic/manipulated media detection
 * 
 * Usage:
 *   # Set API keys (or use Key Vault values)
 *   export HIVE_TEXT_KEY="your-text-api-key"
 *   export HIVE_IMAGE_KEY="your-image-api-key"
 *   export HIVE_DEEPFAKE_KEY="your-deepfake-api-key"
 *   
 *   # Run all tests
 *   node test-hive-all-apis.js
 *   
 *   # Run specific API test
 *   node test-hive-all-apis.js --text
 *   node test-hive-all-apis.js --image
 *   node test-hive-all-apis.js --deepfake
 */

const HIVE_API_BASE = 'https://api.thehive.ai/api/v2/task/sync';

// API Keys from environment
const API_KEYS = {
  text: process.env.HIVE_TEXT_KEY || process.env.HIVE_API_KEY,
  image: process.env.HIVE_IMAGE_KEY || process.env.HIVE_API_KEY,
  deepfake: process.env.HIVE_DEEPFAKE_KEY || process.env.HIVE_API_KEY,
};

// Test images (public domain / safe test images)
const TEST_IMAGES = {
  // Safe landscape image (Unsplash - public domain)
  safe: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=640',
  // Safe portrait for deepfake testing
  portrait: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640',
  // Alternative test image
  nature: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=640',
};

// ─────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────

function log(emoji, message, data = null) {
  console.log(`${emoji} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logSection(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60) + '\n');
}

function maskKey(key) {
  if (!key) return '(not set)';
  if (key.length < 10) return '***';
  return key.substring(0, 8) + '...' + key.substring(key.length - 4);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────
// Text API Test
// ─────────────────────────────────────────────────────────────

async function testTextAPI() {
  logSection('TEXT MODERATION API');
  
  const apiKey = API_KEYS.text;
  if (!apiKey) {
    log('⚠️', 'HIVE_TEXT_KEY not set - skipping text API test');
    return { success: false, skipped: true };
  }
  
  log('🔑', `API Key: ${maskKey(apiKey)}`);
  
  const testCases = [
    {
      name: 'Safe content',
      text: 'Hello! This is a friendly message about gardening and flowers.',
      expectSafe: true,
    },
    {
      name: 'Potentially harmful content',
      text: 'I hate everyone in this group, you are all terrible people.',
      expectSafe: false,
    },
    {
      name: 'Spam-like content',
      text: 'BUY NOW!!! CLICK HERE!!! FREE MONEY!!! www.spam.com www.spam.com',
      expectSafe: false,
    },
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    log('📝', `Testing: ${testCase.name}`);
    log('   ', `Text: "${testCase.text.substring(0, 50)}..."`);
    
    try {
      const response = await fetch(HIVE_API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_data: testCase.text,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        log('❌', `API Error: ${response.status} ${response.statusText}`);
        log('   ', `Response: ${errorText.substring(0, 200)}`);
        results.push({ name: testCase.name, success: false, error: response.status });
        continue;
      }
      
      const data = await response.json();
      
      // Parse and display classifications
      if (data.status && data.status[0]?.response?.output) {
        const classes = data.status[0].response.output[0]?.classes || [];
        
        // Find highest scoring classes
        const sorted = [...classes].sort((a, b) => b.score - a.score);
        const top5 = sorted.slice(0, 5);
        
        log('✅', `Response received - ${classes.length} classes detected`);
        log('📊', 'Top 5 Classifications:');
        top5.forEach(c => {
          const pct = (c.score * 100).toFixed(1);
          const bar = '█'.repeat(Math.round(c.score * 20));
          console.log(`      ${c.class.padEnd(25)} ${pct.padStart(5)}% ${bar}`);
        });
        
        // Check for concerning classes
        const concerning = classes.filter(c => 
          c.score > 0.5 && 
          ['hate', 'violence', 'bullying', 'spam', 'sexual', 'harassment'].some(x => 
            c.class.toLowerCase().includes(x)
          )
        );
        
        if (concerning.length > 0) {
          log('⚠️', 'Flagged categories:', concerning.map(c => `${c.class}: ${(c.score * 100).toFixed(1)}%`));
        }
        
        results.push({ name: testCase.name, success: true, classes: top5 });
      } else {
        log('⚠️', 'Unexpected response structure');
        results.push({ name: testCase.name, success: false, error: 'unexpected_structure' });
      }
      
    } catch (error) {
      log('❌', `Error: ${error.message}`);
      results.push({ name: testCase.name, success: false, error: error.message });
    }
    
    await sleep(500); // Rate limiting courtesy
    console.log('');
  }
  
  const successCount = results.filter(r => r.success).length;
  log('📈', `Text API Results: ${successCount}/${results.length} tests passed`);
  
  return { success: successCount === results.length, results };
}

// ─────────────────────────────────────────────────────────────
// Image/Visual API Test
// ─────────────────────────────────────────────────────────────

async function testImageAPI() {
  logSection('IMAGE/VISUAL MODERATION API');
  
  const apiKey = API_KEYS.image;
  if (!apiKey) {
    log('⚠️', 'HIVE_IMAGE_KEY not set - skipping image API test');
    return { success: false, skipped: true };
  }
  
  log('🔑', `API Key: ${maskKey(apiKey)}`);
  
  const testCases = [
    {
      name: 'Landscape photo (safe)',
      url: TEST_IMAGES.safe,
      expectSafe: true,
    },
    {
      name: 'Portrait photo (safe)',
      url: TEST_IMAGES.portrait,
      expectSafe: true,
    },
    {
      name: 'Nature scene (safe)',
      url: TEST_IMAGES.nature,
      expectSafe: true,
    },
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    log('🖼️', `Testing: ${testCase.name}`);
    log('   ', `URL: ${testCase.url}`);
    
    try {
      const response = await fetch(HIVE_API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: testCase.url,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        log('❌', `API Error: ${response.status} ${response.statusText}`);
        log('   ', `Response: ${errorText.substring(0, 300)}`);
        results.push({ name: testCase.name, success: false, error: response.status });
        continue;
      }
      
      const data = await response.json();
      
      // Parse image moderation response
      if (data.status && data.status[0]?.response?.output) {
        const outputs = data.status[0].response.output;
        
        log('✅', `Response received - ${outputs.length} output(s)`);
        
        // Collect all classes from all outputs
        const allClasses = [];
        outputs.forEach((output, idx) => {
          if (output.classes) {
            output.classes.forEach(c => allClasses.push(c));
          }
        });
        
        if (allClasses.length > 0) {
          // Find highest scoring classes
          const sorted = [...allClasses].sort((a, b) => b.score - a.score);
          const top5 = sorted.slice(0, 5);
          
          log('📊', 'Top 5 Image Classifications:');
          top5.forEach(c => {
            const pct = (c.score * 100).toFixed(1);
            const bar = '█'.repeat(Math.round(c.score * 20));
            console.log(`      ${c.class.padEnd(25)} ${pct.padStart(5)}% ${bar}`);
          });
          
          // Check for NSFW/concerning classes
          const concerning = allClasses.filter(c => 
            c.score > 0.5 && 
            ['nudity', 'adult', 'gore', 'violence', 'weapon', 'drug'].some(x => 
              c.class.toLowerCase().includes(x)
            )
          );
          
          if (concerning.length > 0) {
            log('⚠️', 'Flagged categories:', concerning.map(c => `${c.class}: ${(c.score * 100).toFixed(1)}%`));
          } else {
            log('✅', 'Image appears safe');
          }
          
          results.push({ name: testCase.name, success: true, classes: top5 });
        } else {
          log('⚠️', 'No classes in response');
          results.push({ name: testCase.name, success: true, classes: [] });
        }
      } else {
        log('⚠️', 'Unexpected response structure');
        console.log('Raw response:', JSON.stringify(data, null, 2).substring(0, 500));
        results.push({ name: testCase.name, success: false, error: 'unexpected_structure' });
      }
      
    } catch (error) {
      log('❌', `Error: ${error.message}`);
      results.push({ name: testCase.name, success: false, error: error.message });
    }
    
    await sleep(1000); // Image API may need more time between requests
    console.log('');
  }
  
  const successCount = results.filter(r => r.success).length;
  log('📈', `Image API Results: ${successCount}/${results.length} tests passed`);
  
  return { success: successCount === results.length, results };
}

// ─────────────────────────────────────────────────────────────
// Deepfake Detection API Test
// ─────────────────────────────────────────────────────────────

async function testDeepfakeAPI() {
  logSection('DEEPFAKE DETECTION API');
  
  const apiKey = API_KEYS.deepfake;
  if (!apiKey) {
    log('⚠️', 'HIVE_DEEPFAKE_KEY not set - skipping deepfake API test');
    return { success: false, skipped: true };
  }
  
  log('🔑', `API Key: ${maskKey(apiKey)}`);
  log('ℹ️', 'Deepfake detection requires images/videos with human faces');
  
  const testCases = [
    {
      name: 'Real human portrait',
      url: TEST_IMAGES.portrait,
      description: 'Authentic photograph - should show low deepfake score',
    },
    {
      name: 'Landscape (no faces)',
      url: TEST_IMAGES.safe,
      description: 'No faces - may return no detection or N/A',
    },
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    log('🎭', `Testing: ${testCase.name}`);
    log('   ', `URL: ${testCase.url}`);
    log('   ', `Note: ${testCase.description}`);
    
    try {
      // Deepfake API endpoint may be different - try the sync endpoint first
      const response = await fetch(HIVE_API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: testCase.url,
          // Specify deepfake detection model if available
          models: ['deepfake_image_detection', 'ai_generated_image_detection'],
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        log('❌', `API Error: ${response.status} ${response.statusText}`);
        
        // Check for specific error messages
        if (response.status === 403 || response.status === 401) {
          log('⚠️', 'API key may not have deepfake detection enabled');
          log('   ', 'Contact Hive AI to enable deepfake detection on your account');
        } else if (response.status === 400) {
          log('⚠️', 'Bad request - model may not be available');
        }
        
        log('   ', `Response: ${errorText.substring(0, 300)}`);
        results.push({ name: testCase.name, success: false, error: response.status });
        continue;
      }
      
      const data = await response.json();
      
      // Parse deepfake detection response
      if (data.status && data.status[0]?.response?.output) {
        const outputs = data.status[0].response.output;
        
        log('✅', `Response received - ${outputs.length} output(s)`);
        
        // Look for deepfake-related classes
        const allClasses = [];
        outputs.forEach(output => {
          if (output.classes) {
            output.classes.forEach(c => allClasses.push(c));
          }
        });
        
        if (allClasses.length > 0) {
          // Find deepfake-related scores
          const deepfakeClasses = allClasses.filter(c => 
            c.class.toLowerCase().includes('fake') ||
            c.class.toLowerCase().includes('synthetic') ||
            c.class.toLowerCase().includes('ai_generated') ||
            c.class.toLowerCase().includes('manipulated') ||
            c.class.toLowerCase().includes('real') ||
            c.class.toLowerCase().includes('authentic')
          );
          
          const sorted = [...allClasses].sort((a, b) => b.score - a.score);
          const top5 = sorted.slice(0, 5);
          
          log('📊', 'Top 5 Deepfake Analysis Results:');
          top5.forEach(c => {
            const pct = (c.score * 100).toFixed(1);
            const bar = '█'.repeat(Math.round(c.score * 20));
            console.log(`      ${c.class.padEnd(30)} ${pct.padStart(5)}% ${bar}`);
          });
          
          if (deepfakeClasses.length > 0) {
            log('🎭', 'Deepfake-specific scores:');
            deepfakeClasses.forEach(c => {
              const pct = (c.score * 100).toFixed(1);
              console.log(`      ${c.class}: ${pct}%`);
            });
          }
          
          results.push({ name: testCase.name, success: true, classes: top5 });
        } else {
          log('⚠️', 'No face detected or no classification returned');
          log('   ', 'This is expected for images without clear faces');
          results.push({ name: testCase.name, success: true, classes: [], noFace: true });
        }
      } else {
        log('⚠️', 'Unexpected response structure');
        console.log('Raw response:', JSON.stringify(data, null, 2).substring(0, 500));
        results.push({ name: testCase.name, success: false, error: 'unexpected_structure' });
      }
      
    } catch (error) {
      log('❌', `Error: ${error.message}`);
      results.push({ name: testCase.name, success: false, error: error.message });
    }
    
    await sleep(1000);
    console.log('');
  }
  
  const successCount = results.filter(r => r.success).length;
  log('📈', `Deepfake API Results: ${successCount}/${results.length} tests passed`);
  
  return { success: successCount === results.length, results };
}

// ─────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🐝 HIVE AI API TEST SUITE');
  console.log('Testing Text, Image, and Deepfake moderation APIs\n');
  
  // Parse command line args
  const args = process.argv.slice(2);
  const runAll = args.length === 0;
  const runText = runAll || args.includes('--text');
  const runImage = runAll || args.includes('--image');
  const runDeepfake = runAll || args.includes('--deepfake');
  
  // Show API key status
  logSection('API KEY STATUS');
  log('🔑', `Text API Key:     ${maskKey(API_KEYS.text)}`);
  log('🔑', `Image API Key:    ${maskKey(API_KEYS.image)}`);
  log('🔑', `Deepfake API Key: ${maskKey(API_KEYS.deepfake)}`);
  
  if (!API_KEYS.text && !API_KEYS.image && !API_KEYS.deepfake) {
    log('❌', 'No API keys found! Set environment variables:');
    console.log('   export HIVE_TEXT_KEY="your-key"');
    console.log('   export HIVE_IMAGE_KEY="your-key"');
    console.log('   export HIVE_DEEPFAKE_KEY="your-key"');
    console.log('   # Or use a single key for all:');
    console.log('   export HIVE_API_KEY="your-key"');
    process.exit(1);
  }
  
  const results = {};
  
  // Run selected tests
  if (runText) {
    results.text = await testTextAPI();
  }
  
  if (runImage) {
    results.image = await testImageAPI();
  }
  
  if (runDeepfake) {
    results.deepfake = await testDeepfakeAPI();
  }
  
  // Summary
  logSection('TEST SUMMARY');
  
  let allPassed = true;
  
  for (const [api, result] of Object.entries(results)) {
    if (result.skipped) {
      log('⏭️', `${api.toUpperCase()}: Skipped (no API key)`);
    } else if (result.success) {
      log('✅', `${api.toUpperCase()}: All tests passed`);
    } else {
      log('❌', `${api.toUpperCase()}: Some tests failed`);
      allPassed = false;
    }
  }
  
  console.log('\n');
  
  if (allPassed) {
    log('🎉', 'All API tests completed successfully!');
    process.exit(0);
  } else {
    log('⚠️', 'Some tests failed - check output above');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
