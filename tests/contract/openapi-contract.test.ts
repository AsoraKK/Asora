import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fetch from 'cross-fetch';

const spec = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'api/openapi/dist/openapi.json'), 'utf-8')
);
const server = process.env.STAGING_DOMAIN
  ? `https://${process.env.STAGING_DOMAIN}`
  : spec.servers?.[0]?.url;
const jwt = process.env.STAGING_SMOKE_TOKEN;

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

function findResponseSchema(pathKey: string, method: string, status = '200') {
  const op = spec.paths?.[pathKey]?.[method];
  const content = op?.responses?.[status]?.content?.['application/json']?.schema;
  if (!content) throw new Error(`No schema for ${method.toUpperCase()} ${pathKey} ${status}`);
  return content;
}

test('GET /feed conforms to schema', async () => {
  const url = `${server}/feed?limit=10`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } });
  expect(res.status).toBe(200);
  const json = await res.json();

  const schema = findResponseSchema('/feed', 'get', String(res.status));
  const validate = ajv.compile(schema);
  const ok = validate(json);
  if (!ok) {
    console.error(validate.errors);
  }
  expect(ok).toBe(true);
});
