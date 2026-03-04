/**
 * EXAMPLE: Using Per-Class Moderation Weights
 * 
 * This file demonstrates three ways to use the new per-class weight system:
 * 1. Defaults only (no custom configuration)
 * 2. Hardcoded custom weights
 * 3. Loading from Cosmos DB (future Control Panel integration)
 */

import { createHiveClient, HiveAIClient } from '../shared/hive-client';
import { loadModerationWeights, saveWeightOverride } from '../shared/moderation-weights-loader';
import { getDefaultWeights, getClassByName } from '../shared/hive-classes-config';

// ============================================================================
// EXAMPLE 1: Use Default Weights (Simplest)
// ============================================================================

export async function example1_UseDefaults() {
  console.log('\n=== EXAMPLE 1: Default Weights ===');
  
  // Create client with defaults from hive-classes-config.ts
  const client = createHiveClient({
    apiKey: process.env.HIVE_API_KEY || 'demo-key'
  });

  // Moderate some test content
  const result = await client.moderateTextContent({
    text: "I hate you, you're terrible!",
    userId: 'test-user-123'
  });

  console.log('Result:', {
    action: result.action,        // BLOCK | WARN | ALLOW
    confidence: result.confidence, // Highest score
    reasons: result.reasons        // Which classes triggered
  });

  // Expected output:
  // Result: {
  //   action: 'BLOCK',
  //   confidence: 0.92,
  //   reasons: ['hate: 92.0% (threshold: 85%)']
  // }
}

// ============================================================================
// EXAMPLE 2: Custom Hardcoded Weights
// ============================================================================

export async function example2_CustomWeights() {
  console.log('\n=== EXAMPLE 2: Custom Hardcoded Weights ===');
  
  // Create client with custom thresholds
  const client = new HiveAIClient({
    apiKey: process.env.HIVE_API_KEY || 'demo-key',
    classWeights: {
      hate: 0.95,           // Stricter: only block very confident hate
      spam: 0.70,           // Looser: catch more spam
      violence: 0.80,       // Moderate
      sexual: 0.60,         // More lenient for sexual content
      // All other classes use defaults from config
    }
  });

  // Test 1: Borderline hate (score ~0.92)
  const result1 = await client.moderateTextContent({
    text: "I hate you, you're terrible!",
    userId: 'test-user-123'
  });

  console.log('Hate test (0.92 score vs 0.95 threshold):', result1.action);
  // Expected: WARN or ALLOW (score below custom threshold)

  // Test 2: Obvious spam
  const result2 = await client.moderateTextContent({
    text: "CLICK HERE FOR FREE MONEY!!! BUY NOW!!!",
    userId: 'test-user-456'
  });

  console.log('Spam test (likely >0.70):', result2.action);
  // Expected: BLOCK (spam score above custom 0.70 threshold)
}

// ============================================================================
// EXAMPLE 3: Load from Cosmos DB (Future Control Panel)
// ============================================================================

export async function example3_CosmosDBWeights() {
  console.log('\n=== EXAMPLE 3: Cosmos DB Integration ===');
  
  // This example requires Cosmos DB setup
  // For now, we'll demonstrate the API without actual DB connection
  
  // Step 1: View current defaults
  const defaults = getDefaultWeights();
  console.log('Default weights:', {
    hate: defaults['hate'],           // 0.85
    spam: defaults['spam'],           // 0.80
    violence: defaults['violence'],   // 0.70
  });

  // Step 2: (Future) Admin saves custom weight via Control Panel
  // This would happen via POST /api/admin/moderation-classes/weights
  /*
  await saveWeightOverride(
    cosmosContainer,
    'hate',
    0.90,
    'admin@lythaus.com',
    'Reducing false positives on political discussions'
  );
  */

  // Step 3: Load merged weights (defaults + overrides)
  /*
  const mergedWeights = await loadModerationWeights(cosmosContainer);
  console.log('Merged weights:', {
    hate: mergedWeights['hate'],       // 0.90 (from Cosmos DB)
    spam: mergedWeights['spam'],       // 0.80 (default, no override)
    violence: mergedWeights['violence'] // 0.70 (default, no override)
  });
  */

  // Step 4: Create client with merged weights
  /*
  const client = new HiveAIClient({
    apiKey: process.env.HIVE_API_KEY,
    classWeights: mergedWeights
  });
  */
}

// ============================================================================
// EXAMPLE 4: Inspect Class Configuration
// ============================================================================

export function example4_InspectClasses() {
  console.log('\n=== EXAMPLE 4: Inspect Class Configuration ===');
  
  // Look up specific class details
  const hateClass = getClassByName('hate');
  console.log('Hate class configuration:', {
    id: hateClass?.id,                    // 'text_hate'
    name: hateClass?.name,                // 'hate'
    description: hateClass?.description,  // 'Hateful or discriminatory...'
    defaultWeight: hateClass?.defaultWeight, // 0.85
    minWeight: hateClass?.minWeight,      // 0.30
    maxWeight: hateClass?.maxWeight,      // 1.0
  });

  // Get all defaults
  const allWeights = getDefaultWeights();
  console.log(`\nTotal classes configured: ${Object.keys(allWeights).length}`);
  
  // Show a few examples
  console.log('\nSample defaults:');
  console.log('- child_exploitation:', allWeights['child_exploitation']); // 0.99
  console.log('- self_harm_intent:', allWeights['self_harm_intent']);     // 0.95
  console.log('- hate:', allWeights['hate']);                             // 0.85
  console.log('- spam:', allWeights['spam']);                             // 0.80
  console.log('- sexual:', allWeights['sexual']);                         // 0.50
}

// ============================================================================
// EXAMPLE 5: Compare Different Threshold Strategies
// ============================================================================

export async function example5_CompareStrategies() {
  console.log('\n=== EXAMPLE 5: Compare Moderation Strategies ===');
  
  const testContent = "This is borderline offensive content";
  const userId = 'test-user';

  // Strategy 1: Strict (family-friendly platform)
  const strictClient = new HiveAIClient({
    apiKey: process.env.HIVE_API_KEY || 'demo-key',
    classWeights: {
      hate: 0.50,
      violence: 0.60,
      sexual: 0.40,
      bullying: 0.60,
    }
  });

  // Strategy 2: Moderate (general social network)
  const moderateClient = new HiveAIClient({
    apiKey: process.env.HIVE_API_KEY || 'demo-key',
    classWeights: {
      hate: 0.75,
      violence: 0.70,
      sexual: 0.60,
      bullying: 0.80,
    }
  });

  // Strategy 3: Lenient (adult platform)
  const lenientClient = new HiveAIClient({
    apiKey: process.env.HIVE_API_KEY || 'demo-key',
    classWeights: {
      hate: 0.85,
      violence: 0.80,
      sexual: 0.85,
      bullying: 0.90,
    }
  });

  const strictResult = await strictClient.moderateTextContent({ text: testContent, userId });
  const moderateResult = await moderateClient.moderateTextContent({ text: testContent, userId });
  const lenientResult = await lenientClient.moderateTextContent({ text: testContent, userId });

  console.log('Same content, different strategies:');
  console.log('- Strict:', strictResult.action);
  console.log('- Moderate:', moderateResult.action);
  console.log('- Lenient:', lenientResult.action);
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

export async function runAllExamples() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Per-Class Moderation Weights - Usage Examples        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    // Only run examples that don't require API key
    example4_InspectClasses();
    
    // These require actual API key:
    // await example1_UseDefaults();
    // await example2_CustomWeights();
    // await example3_CosmosDBWeights();
    // await example5_CompareStrategies();

    console.log('\n✅ Examples completed successfully!');
    console.log('\nTo run moderation examples, set HIVE_API_KEY environment variable.');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Uncomment to run when executed directly
// runAllExamples();
