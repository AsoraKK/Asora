const hiveApiKey = "zUFs6iphpEt4j4uak08DV68Btg9gnz1w";

async function testHiveAPI() {
  console.log('Testing Hive AI v2 Sync Endpoint...\n');

  // Try format 1: text_data field
  console.log('Attempt 1: Using text_data field');
  let response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${hiveApiKey}`,
    },
    body: JSON.stringify({
      text_data: 'This is a test message to verify HIVE API is operational.',
      models: ['general_text_classification'],
    }),
  });

  console.log(`Response: ${response.status} ${response.statusText}`);
  const body1 = await response.text();
  console.log(`Body: ${body1.substring(0, 200)}\n`);

  // Try format 2: user_id + content.text (what our code uses)
  console.log('Attempt 2: Using user_id + content.text (current code format)');
  response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${hiveApiKey}`,
    },
    body: JSON.stringify({
      user_id: 'test-user',
      content: {
        text: 'This is a test message to verify HIVE API is operational.',
      },
      models: ['general_text_classification'],
    }),
  });

  console.log(`Response: ${response.status} ${response.statusText}`);
  const body2 = await response.text();
  console.log(`Body: ${body2.substring(0, 200)}\n`);

  // Try format 3: text field directly
  console.log('Attempt 3: Using text field directly');
  response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${hiveApiKey}`,
    },
    body: JSON.stringify({
      text: 'This is a test message to verify HIVE API is operational.',
      models: ['general_text_classification'],
    }),
  });

  console.log(`Response: ${response.status} ${response.statusText}`);
  const body3 = await response.text();
  console.log(`Body: ${body3.substring(0, 200)}\n`);
}

testHiveAPI().catch(console.error);
