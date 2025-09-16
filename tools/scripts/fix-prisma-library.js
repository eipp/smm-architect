#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const files = [path.join(root, 'packages/shared/src/generated/client/runtime/library.d.ts')];

const pnpmDir = path.join(root, 'node_modules/.pnpm');
if (fs.existsSync(pnpmDir)) {
  const prismaRuntime = fs
    .readdirSync(pnpmDir)
    .find(d => d.startsWith('@prisma+client@'));
  if (prismaRuntime) {
    files.push(path.join(pnpmDir, prismaRuntime, 'node_modules/@prisma/client/runtime/library.d.ts'));
  }
}

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content
    .replace(
      /count = "count",\/\/ TODO: count does not actually exist, why\?/,
      '/** Counts the number of records matching the query */\n        count = "count",'
    )
    .replace(
      /\s*\/\*\* TODO what is this \*\/\s*dataPath: string\[];/,
      '    /** Path to the property being operated on, used for nested writes */\n    dataPath: string[];'
    )
    .replace(
      /\s*\/\*\* TODO what is this \*\/\s*runInTransaction: boolean;/,
      '    /** Whether this query is executed inside a transaction */\n    runInTransaction: boolean;'
    )
    .replace(/\n {8}\/\*\* Path to the property/, '\n    /** Path to the property')
    .replace(/\n {8}\/\*\* Whether this query/, '\n    /** Whether this query');
  if (content.includes('TODO')) {
    console.warn(`Warning: TODO markers remain in ${file}`);
  }
  fs.writeFileSync(file, content);
  console.log(`Patched ${file}`);
}
