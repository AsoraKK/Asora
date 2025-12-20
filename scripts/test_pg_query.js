#!/usr/bin/env node
/**
 * Quick PostgreSQL query script to check users table
 */

const { Pool } = require('pg');

async function testQuery() {
  const connectionString = process.env.POSTGRES_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('❌ POSTGRES_CONNECTION_STRING env var not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  
  try {
    console.log('🔍 Checking users table...\n');
    
    // Test connection and check users
    const result = await pool.query('SELECT id, tier, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    
    console.log(`✅ Found ${result.rowCount} users:\n`);
    result.rows.forEach(row => {
      console.log(`  ID: ${row.id}`);
      console.log(`  Tier: ${row.tier}`);
      console.log(`  Created: ${row.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    if (error.code === '42P01') {
      console.error('\n💡 Table "users" does not exist. Run migrations first.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testQuery();
