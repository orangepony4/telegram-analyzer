const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const readline = require('node:readline');
const { test } = require('node:test');

const serverPath = path.join(__dirname, '..', 'server.js');

function childOptions(port) {
    return { env: { ...process.env, PORT: port }, windowsHide: true };
}

test('prints the assigned port and serves the app when PORT is zero', { timeout: 10_000 }, async t => {
    const child = spawn(process.execPath, [serverPath], childOptions('0'));
    const exited = once(child, 'close');
    const stdout = readline.createInterface({ input: child.stdout });
    t.after(async () => {
        stdout.close();
        if (child.exitCode === null && child.signalCode === null) child.kill();
        await exited;
    });

    const [message] = await once(stdout, 'line', { signal: AbortSignal.timeout(5000) });
    const address = message.match(/http:\/\/localhost:(\d+)\b/)?.[0];
    assert.ok(address, message);
    assert.ok(Number(new URL(address).port) > 0, message);
    const response = await fetch(address + '/?view=upload', { signal: AbortSignal.timeout(3000) });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /id="jsonFile"/);
});

test('reports an occupied port with a recovery command', { timeout: 10_000 }, async t => {
    const listener = net.createServer().listen(0);
    t.after(() => new Promise(resolve => listener.close(resolve)));
    await once(listener, 'listening');
    const { port } = listener.address();

    const result = spawnSync(process.execPath, [serverPath], {
        ...childOptions(String(port)), encoding: 'utf8', timeout: 5000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp('Port ' + port + ' is already in use'));
    assert.match(result.stderr, /PORT=0/);
    assert.doesNotMatch(result.stderr, /Unhandled 'error' event/);
});

test('rejects invalid PORT values before listening', { timeout: 10_000 }, () => {
    for (const port of ['invalid-port', '-1', '3.5', '65536']) {
        const result = spawnSync(process.execPath, [serverPath], {
            ...childOptions(port), encoding: 'utf8', timeout: 3000,
        });
        assert.ifError(result.error);
        assert.equal(result.status, 1, port);
        assert.match(result.stderr, /PORT must be a whole number from 0 to 65535/);
        assert.equal(result.stdout, '', port);
    }
});
