import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const git = spawnSync('git', ['ls-files', '--', '*.dart'], {
  encoding: 'utf8',
  windowsHide: true,
});
if (git.error) {
  throw git.error;
}
if (git.status !== 0) {
  process.exit(git.status ?? 1);
}

const files = git.stdout
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(
    (file) =>
      file.length > 0 &&
      !file.replaceAll('\\', '/').startsWith('lib/generated/api_client/') &&
      existsSync(file),
  );
const dart = process.platform === 'win32' ? 'dart.bat' : 'dart';

for (let offset = 0; offset < files.length; offset += 100) {
  const batch = files.slice(offset, offset + 100);
  const result = spawnSync(
    dart,
    ['format', '--output=none', '--set-exit-if-changed', ...batch],
    {
      encoding: 'utf8',
      stdio: 'inherit',
      shell: process.platform === 'win32',
      windowsHide: true,
    },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Formatting is clean for ${files.length} hand-maintained Dart files.`);
