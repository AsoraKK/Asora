import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workflowPatterns = [
  ['Azure OIDC login', /uses:\s*azure\/login@/i],
  ['Azure Functions deployment', /uses:\s*azure\/functions-action@/i],
  ['Azure web application deployment', /uses:\s*azure\/webapps-deploy@/i],
  ['Azure resource mutation command', /\baz\s+(?:functionapp|webapp|deployment|role\s+assignment|group\s+deployment|account\s+management-group)\s+(?:create|delete|restart|start|stop|update|set)\b/i],
  ['Azure data-plane command', /\baz\s+(?:cosmosdb|storage|keyvault|postgres)\b/i],
  ['Azure Resource Manager call', /management\.azure\.com/i],
  ['Azure deployment credential reference', /(?:secrets|vars)\.(?:AZURE_(?:CLIENT_ID|TENANT_ID|SUBSCRIPTION_ID|CREDENTIALS|FUNCTIONAPP_[A-Z_]+|RESOURCE_GROUP)|ARM_(?:CLIENT_ID|TENANT_ID|SUBSCRIPTION_ID|CLIENT_SECRET)|POSTGRES_ADMIN_PASSWORD)/i],
  ['Legacy Azure deployment workflow trigger', /workflows:\s*\[[^\]]*(?:Deploy to lythaus-function|Deploy Lythaus MVP backend|deploy-lythaus-function)/i],
];

export function scanWorkflowText(relativePath, source) {
  const findings = [];
  const lines = source.split(/\r?\n/);
  for (const [label, pattern] of workflowPatterns) {
    lines.forEach((line, index) => {
      if (pattern.test(line)) findings.push({ file: relativePath, line: index + 1, label });
    });
  }
  return findings;
}

export function scanWorkflows(root) {
  const workflowRoot = path.join(root, '.github', 'workflows');
  if (!fs.existsSync(workflowRoot)) return [];
  return fs.readdirSync(workflowRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .flatMap((entry) => {
      const relativePath = path.posix.join('.github', 'workflows', entry.name);
      return scanWorkflowText(relativePath, fs.readFileSync(path.join(workflowRoot, entry.name), 'utf8'));
    });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const findings = scanWorkflows(process.cwd());
  if (findings.length) {
    console.error('GitHub-to-Azure execution paths remain:');
    for (const finding of findings) console.error(`${finding.file}:${finding.line} ${finding.label}`);
    process.exitCode = 1;
  } else {
    console.log('GitHub-to-Azure execution paths: disconnected.');
  }
}
