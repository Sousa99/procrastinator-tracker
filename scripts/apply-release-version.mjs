#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/apply-release-version.mjs <version>');
  process.exit(1);
}

const target = resolve(new URL('..', import.meta.url).pathname);
const packages = ['package.json', 'backend/package.json', 'frontend/package.json'];

for (const pkg of packages) {
  const file = resolve(target, pkg);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  json.version = version;
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`[version] ${pkg} -> ${version}`);
}
