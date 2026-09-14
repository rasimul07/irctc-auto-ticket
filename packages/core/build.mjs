import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, 'dist');
mkdirSync(dist, { recursive: true });

const extensionBotFiles = [
  'src/bot/sites/registry.js',
  'src/bot/sites/eticket/config.js',
  'src/bot/sites/eticket/paths.js',
  'src/bot/sites/eticket/selectors.js',
  'src/bot/sites/eticket/trainList.js',
  'src/bot/sites/eticket/flows/login.js',
  'src/bot/sites/eticket/flows/search.js',
  'src/bot/sites/eticket/flows/booking.js',
  'src/bot/sites/eticket/index.js',
  'src/bot/lib/wait.js',
  'src/bot/lib/modals.js',
  'src/bot/lib/events.js',
  'src/bot/lib/stations.js',
  'src/bot/lib/passengers.js',
  'src/bot/lib/psgnPreferences.js',
  'src/bot/overlay/overlay.js',
  'src/bot/bot.js'
];

const webviewBotFiles = ['src/bot/webview-storage.js', ...extensionBotFiles];

function writeConcatBundle(name, files) {
  const content = files.map((f) => readFileSync(join(__dirname, f), 'utf8')).join('\n;\n');
  writeFileSync(join(dist, `${name}.raw.js`), content);
}

await esbuild.build({
  entryPoints: [join(__dirname, 'src/index.js')],
  outfile: join(dist, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: ['es2020']
});

await esbuild.build({
  entryPoints: [join(__dirname, 'src/chrome-init.js')],
  outfile: join(dist, 'chrome-core.iife.js'),
  bundle: true,
  format: 'iife',
  globalName: 'IRCTCCoreInit',
  platform: 'browser',
  target: ['chrome100']
});

writeConcatBundle('bot-bundle', webviewBotFiles);
writeConcatBundle('extension-bot', extensionBotFiles);

for (const name of ['bot-bundle', 'extension-bot']) {
  await esbuild.build({
    entryPoints: [join(dist, `${name}.raw.js`)],
    outfile: join(dist, `${name}.iife.js`),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome100']
  });
}

console.log('Built @rail-ticket/core');
