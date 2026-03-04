const hiveApiKey = "zUFs6iphpEt4j4uak08DV68Btg9gnz1w";

async function testHiveAPI() {
  console.log('Testing Hive AI with corrected Token auth...\n');

  const response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
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

  console.log(`Status: ${response.status} ${response.statusText}`);
  const data = await response.json();

  if (response.ok) {
    console.log('✅ HIVE API CONNECTION SUCCESSFUL\n');
    console.log('Response:');
    console.log('- Request ID:', data.id);
    console.log('- Code:', data.code);
    console.log('- Status:', data.status[0].status.message);
    console.log('- Classes detected:', data.status[0].response.output[0].classes.length);
    console.log('\nFirst 5 classes:');
    data.status[0].response.output[0].classes.slice(0, 5).forEach(cls => {
      console.log(`  - ${cls.class}: ${(cls.score * 100).toFixed(1)}%`);
    });
  } else {
    console.log('❌ API Error:', data);
  }
}

testHiveAPI().catch(console.error);
