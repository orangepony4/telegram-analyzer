import { execFileSync } from 'node:child_process';
import { mkdtempSync, renameSync, rmdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const files = [
    'LICENSE',
    'README.md',
    'analyzer.js',
    'docs/preview.webp',
    'index.html',
    'styles.css',
    'vendor/README.md',
    'vendor/chart.umd.min.js',
    'vendor/chartjs-LICENSE.md',
    'vendor/kurkle-color-LICENSE.md',
];

if (process.argv.length > 3) {
    throw new Error('Usage: npm run package:offline -- [output.zip]');
}

const repository = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.argv[2] ?? 'telegram-analyzer-offline.zip');
const directory = mkdtempSync(join(dirname(output), '.telegram-offline-'));
const staged = join(directory, 'archive.zip');

try {
    execFileSync('git', ['archive', '--format=zip', '--prefix=telegram-analyzer/',
        '--output', staged, 'HEAD', '--', ...files], { cwd: repository, stdio: 'inherit' });
    renameSync(staged, output);
    console.log(`Created ${output}`);
} finally {
    rmSync(staged, { force: true });
    rmdirSync(directory);
}
