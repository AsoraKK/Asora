import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import jp from 'jsonpointer';

const specPath = path.resolve('api/openapi/dist/openapi.json');
if (!fs.existsSync(specPath)) {
  console.error(`Spec file not found at ${specPath}`);
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

let errors = 0;

function deref<T = any>(schema: T, root: any): T {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  if ((schema as any).$ref && typeof (schema as any).$ref === 'string') {
    const ref = (schema as any).$ref as string;
    if (ref.startsWith('#/')) {
      return deref(jp.get(root, ref.substring(1)), root);
    }
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((entry) => deref(entry, root)) as unknown as T;
  }
  const clone: Record<string, any> = {};
  for (const [key, value] of Object.entries(schema as Record<string, any>)) {
    clone[key] = deref(value, root);
  }
  return clone as unknown as T;
}

for (const [specPathKey, operations] of Object.entries<Record<string, any>>(spec.paths || {})) {
  for (const [method, operation] of Object.entries<Record<string, any>>(operations || {})) {
    const responses = operation?.responses || {};
    for (const [code, response] of Object.entries<Record<string, any>>(responses)) {
      const jsonContent = response?.content?.['application/json'];
      if (!jsonContent) {
        continue;
      }
      const schema = deref(jsonContent.schema, spec);
      if (!schema) {
        continue;
      }

      const validate = ajv.compile(schema);

      if (jsonContent.example !== undefined) {
        if (!validate(jsonContent.example)) {
          report(specPathKey, method, code, validate.errors);
        }
      }

      const examples = jsonContent.examples || {};
      for (const [exampleKey, exampleObject] of Object.entries<Record<string, any>>(examples)) {
        const exampleValue = exampleObject?.value;
        if (exampleValue === undefined) {
          continue;
        }
        if (!validate(exampleValue)) {
          report(`${specPathKey}#${exampleKey}`, method, code, validate.errors);
        }
      }
    }
  }
}

process.exit(errors ? 1 : 0);

function report(specPathKey: string, method: string, code: string, ajvErrors: any) {
  errors += 1;
  console.error(`Example validation failed for ${method.toUpperCase()} ${specPathKey} ${code}`);
  console.error(JSON.stringify(ajvErrors, null, 2));
}
