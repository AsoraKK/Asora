/*
  One-time migration: copy user profiles from Cosmos DB -> PostgreSQL
  Usage:
    POSTGRES_CONN=... COSMOS_CONNECTION_STRING=... node tools/migrate_profiles_to_postgres.js

  Emits a CSV-like summary and exit code 0 on success.
*/
var CosmosClient = require('@azure/cosmos').CosmosClient;
var Pool = require('pg').Pool;

function main() {
  var pgConn = process.env.POSTGRES_CONN || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
  var cosmosConn = process.env.COSMOS_CONNECTION_STRING;
  if (!pgConn || !cosmosConn) {
    console.error('Missing POSTGRES_CONN or COSMOS_CONNECTION_STRING');
    process.exit(2);
  }

  var pool = new Pool({ connectionString: pgConn });
  var cosmos = new CosmosClient(cosmosConn);
  var db = cosmos.database(process.env.COSMOS_DATABASE_NAME || 'asora');
  var usersContainer = db.container('users');

  var migrated = { ok: 0, skipped: 0, errors: 0 };

  return usersContainer.items.readAll().fetchAll()
    .then(function (all) {
      var resources = all.resources || [];
      console.log('Found ' + resources.length + ' user docs in Cosmos');

      var seq = Promise.resolve();

      resources.forEach(function (doc) {
        seq = seq.then(function () {
          var userId = doc.id || doc.userId || doc.user_id;
          var profile = doc.profile || {};
          var displayName = profile.displayName || null;
          var bio = profile.bio || '';
          var avatar = profile.avatarUrl || null;
          var extras = JSON.stringify({ legacy: doc });

          return pool.connect().then(function (client) {
            return client.query("INSERT INTO profiles (user_uuid, display_name, bio, avatar_url, extras, created_at, updated_at)\n            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())\n            ON CONFLICT (user_uuid) DO NOTHING", [userId, displayName, bio, avatar, extras])
              .then(function () { migrated.ok++; })
              .catch(function (err) { console.error('Error migrating user', userId, err && err.message || err); migrated.errors++; })
              .then(function () { client.release(); });
          });
        });
      });

      return seq.then(function () { console.log('Migration summary:', migrated); });
    })
    .catch(function (e) { console.error('Migration failed', e); process.exit(1); })
    .then(function () { return pool.end(); });
}

main();
