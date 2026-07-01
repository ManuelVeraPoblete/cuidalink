#!/usr/bin/env node
/**
 * Patches expo-modules-core/package.json so its "main" field points to index.js
 * (exports null) instead of src/index.ts, which Node.js 20.17+ can't load.
 * Metro bundler uses its own resolution and ignores "main", so the app is unaffected.
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'node_modules', 'expo-modules-core', 'package.json');

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.main === 'src/index.ts') {
    pkg.main = 'index.js';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('✓ expo-modules-core patched: main → index.js');
  }
} catch {
  // node_modules not installed yet — runs again after npm install
}
