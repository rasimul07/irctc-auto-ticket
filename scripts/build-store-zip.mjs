#!/usr/bin/env node
/**
 * Build packages/core and create a Chrome Web Store upload zip.
 * Output: dist/irctc-extension.zip (manifest.json at zip root)
 *
 * Usage: node scripts/build-store-zip.mjs [--bump=patch|minor|major] [--no-bump]
 *
 * By default bumps manifest.json patch version before packaging (1.1.2 → 1.1.3).
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGING = path.join(ROOT, 'dist', 'chrome-store-package');
const DIST_DIR = path.join(ROOT, 'dist');

const ROOT_FILES = [
  'manifest.json',
  'background.js',
  'popup.html',
  'popup.js',
  'popup.css',
  'qr-code.png'
];

const ROOT_DIRS = ['icons', 'lib', 'overlay', 'sites'];

const CORE_FILES = [
  'packages/core/dist/chrome-core.iife.js',
  'packages/core/dist/extension-bot.iife.js',
  'packages/core/dist/extension-gateway.iife.js',
  'packages/core/src/bot/sites/eticket/config.js',
  'packages/core/src/bot/sites/nget/config.js',
  'packages/core/src/theme/tokens.css'
];

function log(msg) {
  console.log(`[store-zip] ${msg}`);
}

function fail(msg) {
  console.error(`[store-zip] ERROR: ${msg}`);
  process.exit(1);
}

const MANIFEST_PATH = path.join(ROOT, 'manifest.json');

function readManifest() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  return manifest;
}

function writeManifest(manifest) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function parseVersionParts(version) {
  const parts = String(version || '0.0.0')
    .split('.')
    .map((segment) => parseInt(segment, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 4);
}

function formatVersion(parts) {
  return parts.join('.');
}

function bumpVersion(version, level = 'patch') {
  const parts = parseVersionParts(version);

  if (level === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
    if (parts.length > 3) parts[3] = 0;
  } else if (level === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
    if (parts.length > 3) parts[3] = 0;
  } else if (level === 'patch') {
    parts[2] += 1;
    if (parts.length > 3) parts[3] = 0;
  } else {
    fail(`invalid --bump level: ${level} (use patch, minor, or major)`);
  }

  return formatVersion(parts);
}

function parseCliArgs(argv) {
  let bump = 'patch';
  let noBump = false;

  for (const arg of argv) {
    if (arg === '--no-bump') {
      noBump = true;
      continue;
    }
    if (arg.startsWith('--bump=')) {
      bump = arg.slice('--bump='.length).trim();
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/build-store-zip.mjs [--bump=patch|minor|major] [--no-bump]`);
      process.exit(0);
    }
  }

  return { bump, noBump };
}

function resolveManifestVersion({ bump, noBump }) {
  const manifest = readManifest();
  const current = manifest.version || '0.0.0';

  if (noBump) {
    log(`version unchanged: ${current}`);
    return current;
  }

  const next = bumpVersion(current, bump);
  manifest.version = next;
  writeManifest(manifest);
  log(`manifest version ${current} → ${next}`);
  return next;
}

function buildCore() {
  log('building packages/core...');
  execSync('npm run build', {
    cwd: path.join(ROOT, 'packages', 'core'),
    stdio: 'inherit'
  });
}

function copyFile(relPath) {
  const src = path.join(ROOT, relPath);
  const dest = path.join(STAGING, relPath);
  if (!existsSync(src)) {
    fail(`missing required file: ${relPath}`);
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(src, dest);
}

function copyDir(relPath) {
  const src = path.join(ROOT, relPath);
  const dest = path.join(STAGING, relPath);
  if (!existsSync(src)) {
    fail(`missing required directory: ${relPath}`);
  }
  cpSync(src, dest, { recursive: true });
}

function stagePackage() {
  log('staging extension files...');
  rmSync(STAGING, { recursive: true, force: true });
  mkdirSync(STAGING, { recursive: true });

  for (const file of ROOT_FILES) copyFile(file);
  for (const dir of ROOT_DIRS) copyDir(dir);
  for (const file of CORE_FILES) copyFile(file);
}

function createZip(outZip) {
  rmSync(outZip, { force: true });
  mkdirSync(path.dirname(outZip), { recursive: true });

  if (process.platform === 'win32') {
    const stagingGlob = path.join(STAGING, '*').replace(/'/g, "''");
    const dest = outZip.replace(/'/g, "''");
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${stagingGlob}' -DestinationPath '${dest}' -Force"`,
      { stdio: 'inherit' }
    );
    return;
  }

  execSync(`zip -r "${outZip}" .`, { cwd: STAGING, stdio: 'inherit' });
}

function main() {
  const { bump, noBump } = parseCliArgs(process.argv.slice(2));
  const version = resolveManifestVersion({ bump, noBump });

  buildCore();
  stagePackage();

  const zipName = `irctc-extension-v${version}.zip`;
  const outZip = path.join(DIST_DIR, zipName);

  log(`creating ${zipName}...`);
  createZip(outZip);

  log(`done: ${path.relative(ROOT, outZip)}`);
  log('upload this zip in Chrome Web Store Developer Dashboard');
}

main();
