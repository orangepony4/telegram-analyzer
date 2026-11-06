const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'analyzer.js'), 'utf8');

function createAnalyzer({ chartsAvailable = true } = {}) {
    const elements = new Map();
    const charts = new Map();
    const readers = [];
    const alerts = [];
    const downloads = [];
    let downloadedBlob;

    function element(id) {
        if (!elements.has(id)) {
            const classes = new Set();
            elements.set(id, {
                style: {},
                classList: {
                    add: name => classes.add(name),
                    remove: name => classes.delete(name),
                    contains: name => classes.has(name),
                },
                getContext: () => id,
                setAttribute() {},
                removeAttribute() {},
                querySelector: () => null,
                addEventListener(name, handler) {
                    this[name] = handler;
                },
            });
        }
        return elements.get(id);
    }

    const allTab = element('.tab-btn[data-tab="all"]');
    const monthlyTab = element('.tab-btn[data-tab="monthly"]');
    allTab.dataset = { tab: 'all' };
    monthlyTab.dataset = { tab: 'monthly' };

    class Chart {
        static defaults = {};
        static getChart(id) { return charts.get(id); }

        constructor(id, config) {
            this.options = config.options;
            this.data = config.data;
            this.id = id;
            charts.set(id, this);
        }

        update() {}
        destroy() { charts.delete(this.id); }
    }

    vm.runInNewContext(source, {
        document: {
            addEventListener(event, handler) { handler(); },
            getElementById: element,
            querySelector: element,
            querySelectorAll(selector) {
                if (selector === '.tab-btn') return [allTab, monthlyTab];
                if (selector === '.tab-content') return [element('all'), element('monthly')];
                return [];
            },
            createElement(tag) {
                if (tag === 'a') {
                    return { click() { downloads.push({ name: this.download, blob: downloadedBlob }); } };
                }
                return { get innerHTML() { return this.textContent; } };
            },
            body: element('body'),
        },
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        localStorage: { getItem: () => null },
        Chart: chartsAvailable ? Chart : undefined,
        Blob,
        URL: {
            createObjectURL(blob) {
                downloadedBlob = blob;
                return 'blob:participant-summary';
            },
            revokeObjectURL() {},
        },
        setTimeout(callback) { callback(); },
        FileReader: class {
            readAsText() { readers.push(this); }
        },
        alert: message => alerts.push(message),
        console,
    });

    function selectFile(name) {
        element('jsonFile').change({ target: { files: [{ name }] } });
        const reader = readers.at(-1);
        return {
            complete(data) { reader.onload({ target: { result: JSON.stringify(data) } }); },
            fail() { reader.onerror(); },
        };
    }

    return { element, charts, alerts, downloads, monthlyTab, selectFile };
}

test('rejects unrelated JSON and malformed message entries', () => {
    const app = createAnalyzer();
    for (const data of [{}, { messages: [null] }]) {
        app.selectFile('invalid.json').complete(data);
        assert.match(app.alerts.at(-1), /Telegram Desktop/);
        assert.equal(app.element('.stats-container').style.display, 'none');
        assert.equal(app.element('loadingIndicator').style.display, 'none');
        assert.equal(app.element('jsonFile').value, '');
    }
    assert.equal(app.alerts.length, 2);
});

test('shows text statistics when the chart library is unavailable', () => {
    const app = createAnalyzer({ chartsAvailable: false });
    app.selectFile('chat.json').complete({
        messages: [{ id: 1, from: 'Alice', date: '2026-11-01T00:00:00', text: 'Hello there' }],
    });
    assert.deepEqual(app.alerts, []);
    assert.equal(app.element('.stats-container').style.display, 'block');
    assert.equal(app.element('.stats-container').classList.contains('charts-unavailable'), true);
    assert.equal(app.element('chartsUnavailableNotice').hidden, false);
    assert.match(app.element('wordCountStats').innerHTML, /Alice<\/strong>: 2 слов/);
    assert.match(app.element('monthlyWordCountStats').innerHTML, /Alice<\/strong>: 2 слов/);
    assert.equal(app.charts.size, 0);
});

test('keeps the last upload and disables monthly statistics for an empty export', () => {
    const app = createAnalyzer();
    const older = app.selectFile('old.json');
    const messages = [{ id: 1, from: 'Alice', date: '2026-11-01T00:00:00', text: 'Hi' }];
    app.selectFile('new.json').complete({ messages });
    older.complete({ messages: [] });
    older.fail();
    assert.equal(app.element('dropFileName').textContent, 'new.json');
    assert.deepEqual(app.alerts, []);
    app.monthlyTab.click();
    assert.equal(app.element('monthly').classList.contains('active'), true);

    app.selectFile('empty.json').complete({ messages: [] });
    assert.equal(app.monthlyTab.disabled, true);
    assert.equal(app.element('monthly').classList.contains('active'), false);
    assert.match(app.element('messageCount').innerHTML, /Всего сообщений: 0/);

    app.selectFile('restored.json').complete({ messages });
    assert.equal(app.monthlyTab.disabled, false);
});

test('exports participant totals with quoted, formula-safe names', async () => {
    const app = createAnalyzer();
    const from = '=1+1, "quoted"';
    const date = '2026-11-01T00:00:00';
    app.selectFile('chat.json').complete({
        messages: [
            { id: 1, from, date, text: 'Привет' },
            { id: 2, from, date, text: 'Hi' },
        ],
    });
    const button = app.element('exportParticipants');
    assert.equal(button.disabled, false);
    button.click();
    const [{ name, blob }] = app.downloads;
    assert.equal(name, 'telegram-analyzer-participants.csv');
    assert.equal(blob.type, 'text/csv;charset=utf-8');
    assert.equal(await blob.text(),
        `Участник,Сообщения,Средняя длина сообщения\r\n"'=1+1, ""quoted""",2,4.0\r\n`);

    app.selectFile('empty.json').complete({ messages: [] });
    assert.equal(button.disabled, true);
});

test('counts cross-month replies once and skips service events', () => {
    const app = createAnalyzer();
    app.selectFile('chat.json').complete({
        messages: [
            { id: 4, date: '2026-11-01T00:00:00', from: 'Bob', text: 'Follow-up' },
            { id: 5, date: 'invalid', text: 'Unknown date' },
            { id: 1, date: '2026-10-31T23:50:00', from: '__proto__', text: 'Question' },
            { id: 2, date: '2026-10-31T23:55:00', type: 'service', actor: 'Carol' },
            { id: 3, date: '2026-11-01T00:00:00', from: 'Bob', text: ['Hi ', { type: 'bold', text: 'Alice' }] },
        ],
    });
    assert.deepEqual(app.alerts, []);
    assert.match(app.element('wordCountStats').innerHTML, /Bob<\/strong>: 3 слов/);
    assert.match(app.element('monthlyParticipantStats').innerHTML, /<strong>Bob<\/strong>/);
    assert.doesNotMatch(app.element('monthlyParticipantStats').innerHTML, /<strong>__proto__<\/strong>/);
    assert.match(app.element('participantStats').innerHTML, /<strong>Bob<\/strong>: 10 мин/);
    for (const id of ['responseTimeChart', 'monthlyResponseTimeChart']) {
        const chart = app.charts.get(id);
        assert.equal(chart.data.labels.join(), '__proto__ -> Bob');
        assert.equal(chart.data.datasets[0].data.join(), '10');
    }

    app.element('ignoredThreshold').change({ target: { valueAsNumber: 5 } });
    assert.match(app.element('monthlyThresholdExceededMessagesStats').innerHTML, /<strong>Bob<\/strong>: 1/);
    app.element('prevMonth').click();
    assert.match(app.element('currentMonth').textContent, /октябрь/);
    assert.doesNotMatch(app.element('monthlyWordCountStats').innerHTML, /<strong>Bob<\/strong>/);
    assert.equal(app.charts.get('monthlyResponseTimeChart').data.labels.length, 0);
});

test('keeps renamed senders together and separates identical display names', async () => {
    const app = createAnalyzer();
    app.selectFile('chat.json').complete({
        messages: [
            { id: 1, date: '2026-11-01T12:00:00', from: 'Старое имя', from_id: 'user100001', text: 'Question' },
            { id: 2, date: '2026-11-01T12:10:00', from: 'Лена', from_id: 'user100002', text: 'Reply' },
            { id: 3, date: '2026-11-01T12:20:00', from: 'Лена', from_id: 'user100001', text: 'Follow-up' },
            { id: 4, date: '2026-11-01T12:30:00', from: 'Лена (1)', from_id: 'user100003', text: 'Another participant' },
        ],
    });
    assert.deepEqual(app.alerts, []);
    const summary = app.element('participantStats').innerHTML;
    assert.doesNotMatch(summary, /Старое имя|user10000[123]/);
    const chart = app.charts.get('responseTimeChart');
    assert.equal(chart.data.labels.length, 3);
    assert.equal(chart.data.datasets[0].data.join(), '10,10,10');

    app.element('exportParticipants').click();
    const csv = await app.downloads[0].blob.text();
    assert.doesNotMatch(csv, /Старое имя|user10000[123]/);
    const [, ...rows] = csv.trim().split('\r\n');
    const participants = rows.map(row => row.match(/^"([^"]+)",(\d+),/));
    assert.equal(participants.length, 3);
    assert.equal(new Set(participants.map(([, name]) => name)).size, 3);
    assert.deepEqual(participants.map(([, , count]) => Number(count)).sort(), [1, 1, 2]);
    assert.ok(participants.some(([, name, count]) => name === 'Лена (1)' && count === '1'));
});

test('matches old numeric sender IDs and keeps the latest dated name', async () => {
    const app = createAnalyzer();
    app.selectFile('chat.json').complete({
        messages: [
            { id: 4, date: 'invalid', from: 'Недатированное имя', from_id: 'user101', text: 'Unknown date' },
            { id: 2, date: '2026-11-01T12:10:00', from: 'Новое имя', from_id: 'user101', text: 'New' },
            { id: 1, date: '2026-11-01T12:00:00', from: 'Старое имя', from_id: 101, text: 'Old' },
            { id: 3, date: '2026-11-01T12:20:00', from_id: 'user101', text: 'Missing name' },
        ],
    });
    assert.deepEqual(app.alerts, []);
    const participantStats = app.element('participantStats').innerHTML;
    assert.match(participantStats, /<strong>Новое имя<\/strong>/);
    assert.match(participantStats, /Сообщений: 4/);
    assert.doesNotMatch(participantStats, /Старое имя|Недатированное имя|user101/);
    assert.equal(app.charts.get('responseTimeChart').data.labels.length, 0);
});
