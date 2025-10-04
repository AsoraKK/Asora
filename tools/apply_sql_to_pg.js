var fs = require('fs');
var path = require('path');
var Pool = require('pg').Pool;

function main() {
  var sqlPath = process.argv[2] || path.join(process.cwd(), 'database', 'migrate_to_target_schema.sql');
  var pgConn = process.env.POSTGRES_CONN || process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
  if (!pgConn) {
    console.error('Missing POSTGRES_CONN or DATABASE_URL');
    process.exit(2);
  }

  var sql = fs.readFileSync(sqlPath, 'utf8');
  var pool = new Pool({ connectionString: pgConn });

  return pool.connect()
    .then(function (client) {
      return client.query(sql)
        .then(function (res) {
          console.log('SQL applied successfully');
        })
        .catch(function (e) {
          console.error('Error applying SQL:', e && e.message || e);
          throw e;
        })
        .finally(function () { client.release(); });
    })
    .then(function () { return pool.end(); })
    .catch(function (e) { console.error('Failed', e); process.exit(1); });
}

main();
