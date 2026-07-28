import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyFullConnectionString } from '../../packages/db/src/index.ts';

test('Hyperdrive strings inherit verify-full when the binding omits the query parameter', () => {
  const result = verifyFullConnectionString('postgres://user:password@example.test/postgres');
  assert.equal(new URL(result).searchParams.get('sslmode'), 'verify-full');
});

test('Hyperdrive strings reject an explicitly weaker TLS mode', () => {
  assert.throws(
    () => verifyFullConnectionString('postgres://user:password@example.test/postgres?sslmode=require'),
    /hyperdrive_requires_sslmode_verify_full/
  );
});

test('PlanetScale Hyperdrive generated require mode is upgraded to verify-full', () => {
  const result = verifyFullConnectionString('postgres://user:password@aws-eu-central-1-1.pg.psdb.cloud/postgres?sslmode=require');
  assert.equal(new URL(result).searchParams.get('sslmode'), 'verify-full');
});

test('Non-PlanetScale require mode remains rejected', () => {
  assert.throws(
    () => verifyFullConnectionString('postgres://user:password@example.test/postgres?sslmode=require'),
    /hyperdrive_requires_sslmode_verify_full/
  );
});

test('Cloudflare Hyperdrive local binding accepts the platform local mode', () => {
  const result = verifyFullConnectionString(
    'postgres://user:password@1ceb53ab1f079a104475e16fe4ce21d5.hyperdrive.local:5432/postgres?sslmode=disable'
  );
  assert.equal(new URL(result).searchParams.get('sslmode'), 'disable');
});

test('Cloudflare Hyperdrive local binding rejects an unexpected mode', () => {
  assert.throws(
    () => verifyFullConnectionString('postgres://user:password@hyperdrive.local/postgres?sslmode=require'),
    /hyperdrive_requires_platform_local_sslmode_disable/
  );
});
