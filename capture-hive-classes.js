const hiveApiKey = "zUFs6iphpEt4j4uak08DV68Btg9gnz1w";

async function captureClasses(apiType, payload) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Querying ${apiType.toUpperCase()} API`);
  console.log('='.repeat(60));

  try {
    const response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${hiveApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.status && data.status[0]) {
      const classes = data.status[0].response?.output?.[0]?.classes || [];
      console.log(`✅ API responded with ${classes.length} classes\n`);
      
      classes.forEach(cls => {
        console.log(`  - ${cls.class.padEnd(35)} | Score: ${(cls.score * 100).toFixed(1).padEnd(5)}%`);
      });

      return classes.map(c => c.class);
    } else {
      console.log(`❌ API error:`, data);
      return [];
    }
  } catch (error) {
    console.log(`❌ Request failed:`, error.message);
    return [];
  }
}

async function main() {
  const textClasses = await captureClasses('TEXT', {
    text_data: 'This is a test to capture all text classification classes from Hive AI v2 API.',
    models: ['general_text_classification'],
  });

  const imageClasses = await captureClasses('IMAGE', {
    image_url: 'https://via.placeholder.com/100',
    models: ['general_image_classification', 'nudity_image_detection', 'violence_image_detection'],
  });

  const deepfakeClasses = await captureClasses('DEEPFAKE', {
    image_url: 'https://via.placeholder.com/100',
    models: ['deepfake_detection'],
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log('CLASS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Text API classes: ${textClasses.length}`);
  console.log(`Image API classes: ${imageClasses.length}`);
  console.log(`Deepfake API classes: ${deepfakeClasses.length}`);

  const allClasses = new Set([...textClasses, ...imageClasses, ...deepfakeClasses]);
  console.log(`Total unique classes: ${allClasses.size}`);

  // Output as JSON for easy copy-paste
  console.log(`\n${'='.repeat(60)}`);
  console.log('JSON OUTPUT');
  console.log('='.repeat(60));
  console.log(JSON.stringify({
    text: textClasses,
    image: imageClasses,
    deepfake: deepfakeClasses,
    all_unique: Array.from(allClasses).sort(),
  }, null, 2));
}

main().catch(console.error);
