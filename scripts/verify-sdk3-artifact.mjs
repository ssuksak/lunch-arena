import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { AppsInTossBundle } from '@apps-in-toss/ait-format';

const bytes = readFileSync(new URL('../lunch-arena.ait', import.meta.url));
assert.equal(AppsInTossBundle.detect(bytes), AppsInTossBundle.Format.AIT);
const reader = AppsInTossBundle.reader(bytes);
assert.equal(reader.appName, 'lunch-arena');
assert.equal(reader.metadata.sdkVersion, '3.6.0');
for (const name of ['index.html', 'community.js', 'community.css', 'ait-bridge.js', 'lucide.min.js', 'privacy.html']) {
  const embedded = Buffer.from(await reader.readEntry(`sources/${name}`));
  assert.ok(embedded.equals(readFileSync(new URL(`../${name}`, import.meta.url))), `Stale artifact: ${name}`);
}
const metadata = JSON.parse(Buffer.from(await reader.readEntry('bundle.json')).toString());
assert.equal(metadata.deploymentId, reader.deploymentId);
assert.equal(metadata.sdk.version, '3.6.0');
assert.equal(metadata.config.appName, 'lunch-arena');
console.log(JSON.stringify({ appName: reader.appName, sdk: reader.metadata.sdkVersion,
  deploymentId: reader.deploymentId, sha256: createHash('sha256').update(bytes).digest('hex'),
  files: reader.listEntries().length, result: 'PASS' }, null, 2));
