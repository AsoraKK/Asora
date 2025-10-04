/*
  Reconciliation script: compare profiles between Postgres and Cosmos DB
  Writes CSV report and inserts a summary row into Postgres audit_log.

  Usage:
    POSTGRES_CONN=... COSMOS_CONNECTION_STRING=... node tools/reconcile_profiles.js

  Requirements:
    - Postgres schema (profiles, audit_log) exists
    - Cosmos `users` container contains profile docs keyed by id (user_uuid)
*/
var CosmosClient = require('@azure/cosmos').CosmosClient;
var Pool = require('pg').Pool;
var fs = require('fs');
var path = require('path');

function nowTs() {
  var d = new Date();
  return d.toISOString().replace(/[:.]/g, '-');
}

function main() {
  var pgConn = process.env.POSTGRES_CONN || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
  var cosmosConn = process.env.COSMOS_CONNECTION_STRING;
  var cosmosDbName = process.env.COSMOS_DATABASE_NAME || 'asora';
  if (!pgConn || !cosmosConn) {
    console.error('Missing POSTGRES_CONN or COSMOS_CONNECTION_STRING');
    process.exit(2);
  }

  var pool = new Pool({ connectionString: pgConn });
  var cosmos = new CosmosClient(cosmosConn);
  var db = cosmos.database(cosmosDbName);
  var usersContainer = db.container('users');

  var reportDir = path.join(process.cwd(), 'migration_reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);
  var ts = nowTs();
  var csvPath = path.join(reportDir, 'reconcile_profiles_' + ts + '.csv');

  console.log('Loading Cosmos users...');
  return usersContainer.items.readAll().fetchAll()
    .then(function (all) {
      var cosmosMap = Object.create(null);
      (all.resources || []).forEach(function (doc) {
        var id = doc.id || doc.userId || doc.user_id;
        if (id) cosmosMap[id] = doc;
      });
      console.log('Loaded ' + Object.keys(cosmosMap).length + ' docs from Cosmos');

      return pool.query('SELECT user_uuid, display_name, bio, avatar_url FROM profiles');
    })
    .then(function (res) {
      var rows = res.rows || [];
      var total = rows.length;
      var mismatches = { display_name: 0, bio: 0, avatar_url: 0 };
      var fh = fs.createWriteStream(csvPath, { flags: 'w' });
      fh.write('user_uuid,cosmos_display_name,pg_display_name,display_name_match,cosmos_bio,pg_bio,bio_match,cosmos_avatar,pg_avatar,avatar_match\n');

      var seq = Promise.resolve();
      rows.forEach(function (row) {
        seq = seq.then(function () {
          var uid = row.user_uuid;
          return usersContainer.item(uid, uid).read()
            .then(function (itemRes) {
              var doc = itemRes.resource || {};
              var cDisplay = (doc.profile && doc.profile.displayName) || '';
              var cBio = (doc.profile && doc.profile.bio) || '';
              var cAvatar = (doc.profile && doc.profile.avatarUrl) || '';

              var dMatch = String(cDisplay || '') === String(row.display_name || '');
              var bMatch = String(cBio || '') === String(row.bio || '');
              var aMatch = String(cAvatar || '') === String(row.avatar_url || '');

              if (!dMatch) mismatches.display_name++;
              if (!bMatch) mismatches.bio++;
              if (!aMatch) mismatches.avatar_url++;

              fh.write([uid, JSON.stringify(cDisplay), JSON.stringify(row.display_name), dMatch, JSON.stringify(cBio), JSON.stringify(row.bio), bMatch, JSON.stringify(cAvatar), JSON.stringify(row.avatar_url), aMatch].join(',') + '\n');
            })
            .catch(function (e) {
              // If not found, count as full mismatch
              mismatches.display_name++; mismatches.bio++; mismatches.avatar_url++;
              fh.write([uid, '', JSON.stringify(row.display_name), false, '', JSON.stringify(row.bio), false, '', JSON.stringify(row.avatar_url), false].join(',') + '\n');
            });
        });
      });

      return seq.then(function () {
        fh.end();
        var summary = { total: total, mismatches: mismatches, report: csvPath };
        console.log('Reconciliation summary:', summary);

        // Write JSON summary file for CI artifacts
        var jsonPath = path.join(reportDir, 'reconcile_profiles_summary_' + ts + '.json');
        fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

        // Insert summary into audit_log
        var insertSql = 'INSERT INTO audit_log (actor_uuid, action, target_type, target_id, metadata) VALUES ($1, $2, $3, $4, $5)';
        var metadata = JSON.stringify(summary);
        return pool.query(insertSql, [null, 'migration_reconciliation', 'profiles_migration', ts, metadata])
          .then(function () { return { summary: summary, json: jsonPath }; });
      });
    })
    .then(function (summary) { return pool.end().then(function () { return summary; }); })
    .catch(function (e) { console.error('Reconciliation failed', e); process.exit(1); });
}

main();
