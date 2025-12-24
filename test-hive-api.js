#!/usr/bin/env node

/**
 * Test script to verify HIVE API is operational
 * Tests live connectivity with actual API key
 */

const hiveApiKey = process.env.HIVE_API_KEY;

async function testHiveAPI() {
  if (!hiveApiKey) {
    console.log('⚠️  HIVE_API_KEY not set in environment');
    return false;
  }

  try {
    console.log('🔍 Testing HIVE API connectivity...');
    console.log('API Key (first 20 chars):', hiveApiKey.substring(0, 20) + '...');

    const response = await fetch('https://api.hive.ai/api/v2/text/classifyText', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${hiveApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'This is a test message to verify HIVE API is operational.',
        classifiers: ['general_text_classification'],
      }),
      timeout: 10000,
    });

    console.log('✓ Response Status:', response.status, response.statusText);

    if (!response.ok) {
      console.log('❌ HIVE API returned error:', response.status);
      const body = await response.text();
      console.log('Response body:', body.substring(0, 200));
      return false;
    }

    const data = await response.json();
    console.log('✅ HIVE API is OPERATIONAL');
    console.log('Request ID:', data.request_id);
    console.log('Status:', data.status);

    // Check response structure
    if (data.response && data.response.outputs) {
      console.log('✓ Response structure valid');
      const classification = data.response.outputs.general_text_classification;
      if (classification) {
        const summary = classification.summary;
        console.log('  - Action:', summary.action);
        console.log('  - Confidence:', summary.score);
      }
    }

    return true;
  } catch (error) {
    console.log('❌ HIVE API connection failed');
    console.log('Error:', error.message);
    return false;
  }
}

testHiveAPI().then(ok => {
  process.exit(ok ? 0 : 1);
});
