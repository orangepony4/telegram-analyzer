const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

test('the local browser bundle matches the pinned Chart.js 4.5.1 distribution', () => {
    const bundle = readFileSync(join(__dirname, '../vendor/chart.umd.min.js'));
    const sha384 = createHash('sha384').update(bundle).digest('base64');
    assert.equal(sha384, 'jb8JQMbMoBUzgWatfe6COACi2ljcDdZQ2OxczGA3bGNeWe+6DChMTBJemed7ZnvJ');
});
