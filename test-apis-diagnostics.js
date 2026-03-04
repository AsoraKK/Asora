#!/usr/bin/env node

/**
 * Comprehensive diagnostics for Hive and Azure Content Safety APIs
 */

const hiveApiKey = process.env.HIVE_API_KEY;
const acsEndpoint = process.env.ACS_ENDPOINT;
const acsKey = process.env.ACS_KEY;

async function testHiveAPI() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         HIVE AI API DIAGNOSTICS (v2 - Sync Endpoint)      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!hiveApiKey) {
    console.log('❌ HIVE_API_KEY not set in environment');
    return { status: 'not_configured', message: 'HIVE_API_KEY missing' };
  }

  console.log('ℹ️  API Key (first 20 chars):', hiveApiKey.substring(0, 20) + '...');
  console.log('ℹ️  Endpoint: https://api.thehive.ai/api/v2/task/sync');
  console.log('ℹ️  Auth: Bearer token\n');

  try {
    const payload = {
      user_id: 'test-user-123',
      content: {
        text: 'This is a test message to verify HIVE API is operational.',
      },
      models: ['general_text_classification', 'hate_speech_detection_text', 'violence_text_detection'],
    };

    console.log('📤 Sending test request...');
    const response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${hiveApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.log('❌ HIVE API returned error');
      const body = await response.text();
      console.log('Response body (first 500 chars):', body.substring(0, 500));
      
      // Specific error diagnostics
      if (response.status === 401) {
        console.log('🔐 Auth Error: Invalid or expired API key');
        return { status: 'auth_failed', code: 401 };
      } else if (response.status === 403) {
        console.log('🔒 Forbidden: Check API key permissions');
        return { status: 'forbidden', code: 403 };
      } else if (response.status === 404) {
        console.log('⚠️  Endpoint not found - check URL');
        return { status: 'endpoint_not_found', code: 404 };
      } else if (response.status === 429) {
        console.log('⏱️  Rate limited - try again later');
        return { status: 'rate_limited', code: 429 };
      } else if (response.status === 500) {
        console.log('🔥 Server error - Hive API may be down');
        return { status: 'server_error', code: 500 };
      }
      return { status: 'http_error', code: response.status };
    }

    const data = await response.json();
    console.log('✅ HIVE API is OPERATIONAL\n');
    console.log('✓ Request ID:', data.request_id);
    console.log('✓ Status:', data.status);

    // Validate response structure
    if (data.response && data.response.outputs) {
      console.log('✓ Response structure is valid');
      const outputs = data.response.outputs;
      for (const [modelName, output] of Object.entries(outputs)) {
        const summary = output.summary;
        console.log(`\n  Model: ${modelName}`);
        console.log(`    - Action: ${summary.action}`);
        console.log(`    - Score: ${summary.score}`);
        console.log(`    - Classes detected: ${output.classes?.length || 0}`);
      }
    } else {
      console.log('⚠️  Response structure might be invalid');
    }

    return { status: 'operational', data };
  } catch (error) {
    console.log('❌ HIVE API connection failed');
    console.log('Error:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('🌐 DNS resolution failed - check internet connection');
      return { status: 'dns_failed' };
    } else if (error.message.includes('timeout')) {
      console.log('⏱️  Request timeout - API may be slow or unreachable');
      return { status: 'timeout' };
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('🚫 Connection refused - API may be down');
      return { status: 'connection_refused' };
    }
    
    return { status: 'error', error: error.message };
  }
}

async function testAzureContentSafety() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      AZURE CONTENT SAFETY API DIAGNOSTICS                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (!acsEndpoint || !acsKey) {
    console.log('⚠️  Azure Content Safety not fully configured');
    if (!acsEndpoint) console.log('   - ACS_ENDPOINT not set');
    if (!acsKey) console.log('   - ACS_KEY not set');
    return { status: 'not_configured', message: 'ACS credentials missing' };
  }

  console.log('ℹ️  Endpoint:', acsEndpoint);
  console.log('ℹ️  API version: 2024-02-15-preview\n');

  try {
    const url = `${acsEndpoint.replace(/\/$/, '')}/contentsafety/text:analyze?api-version=2024-02-15-preview`;
    const payload = {
      text: 'This is a test message to verify Azure Content Safety is operational.',
      categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'],
      outputType: 'FourSeverityLevels',
    };

    console.log('📤 Sending test request...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': acsKey,
      },
      body: JSON.stringify(payload),
    });

    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.log('❌ Azure Content Safety returned error');
      const body = await response.text();
      console.log('Response body (first 500 chars):', body.substring(0, 500));

      if (response.status === 401) {
        console.log('🔐 Auth Error: Invalid API key');
        return { status: 'auth_failed', code: 401 };
      } else if (response.status === 403) {
        console.log('🔒 Forbidden: Check permissions');
        return { status: 'forbidden', code: 403 };
      } else if (response.status === 404) {
        console.log('⚠️  Endpoint not found - check URL');
        return { status: 'endpoint_not_found', code: 404 };
      } else if (response.status === 429) {
        console.log('⏱️  Rate limited');
        return { status: 'rate_limited', code: 429 };
      }
      return { status: 'http_error', code: response.status };
    }

    const data = await response.json();
    console.log('✅ Azure Content Safety is OPERATIONAL\n');
    
    if (data.categoriesAnalysis) {
      console.log('✓ Categories analysis:');
      for (const cat of data.categoriesAnalysis) {
        console.log(`  - ${cat.category}: severity ${cat.severity}`);
      }
    }

    return { status: 'operational', data };
  } catch (error) {
    console.log('❌ Azure Content Safety connection failed');
    console.log('Error:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('🌐 DNS resolution failed - check endpoint URL');
      return { status: 'dns_failed' };
    } else if (error.message.includes('timeout')) {
      console.log('⏱️  Request timeout');
      return { status: 'timeout' };
    }

    return { status: 'error', error: error.message };
  }
}

async function main() {
  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('   ASORA MODERATION APIs - Comprehensive Diagnostics');
  console.log('═════════════════════════════════════════════════════════════');

  const hiveResult = await testHiveAPI();
  const acsResult = await testAzureContentSafety();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Hive AI Status:', hiveResult.status);
  if (hiveResult.status === 'operational') {
    console.log('  ✅ Hive moderation API is functional');
  } else {
    console.log('  ❌ Hive moderation API issue:', hiveResult.message || hiveResult.code);
  }

  console.log('\nAzure Content Safety Status:', acsResult.status);
  if (acsResult.status === 'operational') {
    console.log('  ✅ Azure Content Safety API is functional');
  } else if (acsResult.status === 'not_configured') {
    console.log('  ⚠️  Azure Content Safety not configured (fallback)');
  } else {
    console.log('  ❌ Azure Content Safety issue:', acsResult.message || acsResult.code);
  }

  console.log('\n═════════════════════════════════════════════════════════════\n');

  // Exit with appropriate code
  const allOperational = 
    hiveResult.status === 'operational' || 
    acsResult.status === 'operational';
  
  process.exit(allOperational ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
