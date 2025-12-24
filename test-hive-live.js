#!/usr/bin/env node

/**
 * Live HIVE API Health Check
 * Tests actual connectivity to HIVE AI services
 */

const API_KEYS = {
  text: 'zUFs6iphpEt4j4uak08DV68Btg9gnz1w',
  visual: 'vWv55QJndt4RYIW4qlXqRPvptjSOxzdQ',
  deepfake: 'fnknIOa1F3OLPnRmM4vQECSXyzbQ2rkg',
};

async function testTextModeration() {
  console.log('\n🔍 Testing Text Moderation API...');
  console.log('Endpoint: https://api.thehive.ai/api/v2/task/sync');
  
  try {
    const response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEYS.text}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 'test-user-health-check',
        content: {
          text: 'This is a test message to verify the HIVE Text Moderation API is operational.',
        },
        models: ['general_text_classification'],
      }),
    });

    console.log('Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Text API Error:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Text Moderation API is ALIVE');
    console.log('Request ID:', data.request_id);
    console.log('Status:', data.status);
    
    if (data.response?.outputs?.general_text_classification) {
      const summary = data.response.outputs.general_text_classification.summary;
      console.log('Action:', summary.action);
      console.log('Score:', summary.score);
      console.log('Reason:', summary.action_reason || '(none)');
    }

    return true;
  } catch (error) {
    console.log('❌ Text API Failed:', error.message);
    return false;
  }
}

async function testVisualModeration() {
  console.log('\n🔍 Testing Visual Moderation API...');
  console.log('Endpoint: https://api.thehive.ai/api/v2/task/sync');
  
  try {
    // Test with a safe sample image URL
    const response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEYS.visual}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 'test-user-health-check',
        content: {
          url: 'https://via.placeholder.com/150',
        },
        models: ['general'],
      }),
    });

    console.log('Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Visual API Error:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Visual Moderation API is ALIVE');
    console.log('Request ID:', data.request_id);
    console.log('Status:', data.status);

    return true;
  } catch (error) {
    console.log('❌ Visual API Failed:', error.message);
    return false;
  }
}

async function testDeepfakeDetection() {
  console.log('\n🔍 Testing Deepfake Detection API...');
  console.log('Endpoint: https://api.thehive.ai/api/v2/task/sync');
  
  try {
    const response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEYS.deepfake}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 'test-user-health-check',
        content: {
          url: 'https://via.placeholder.com/150',
        },
        models: ['ai_generated_media'],
      }),
    });

    console.log('Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Deepfake API Error:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Deepfake Detection API is ALIVE');
    console.log('Request ID:', data.request_id);
    console.log('Status:', data.status);

    return true;
  } catch (error) {
    console.log('❌ Deepfake API Failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════');
  console.log('   HIVE AI - Live API Health Check');
  console.log('═══════════════════════════════════════════');
  console.log('Date:', new Date().toISOString());

  const results = {
    text: await testTextModeration(),
    visual: await testVisualModeration(),
    deepfake: await testDeepfakeDetection(),
  };

  console.log('\n═══════════════════════════════════════════');
  console.log('   Summary');
  console.log('═══════════════════════════════════════════');
  console.log('Text Moderation:', results.text ? '✅ OPERATIONAL' : '❌ FAILED');
  console.log('Visual Moderation:', results.visual ? '✅ OPERATIONAL' : '❌ FAILED');
  console.log('Deepfake Detection:', results.deepfake ? '✅ OPERATIONAL' : '❌ FAILED');
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\nOverall Status:', allPassed ? '✅ ALL APIS OPERATIONAL' : '⚠️  SOME APIS DOWN');

  return allPassed;
}

runAllTests().then(success => {
  process.exit(success ? 0 : 1);
});
