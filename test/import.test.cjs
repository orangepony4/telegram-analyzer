const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'analyzer.js'), 'utf8');

function createAnalyzer() {
    const elements = new Map();
    const charts = new Map();
    const readers = [];
    const alerts = [];

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
            createElement() {
                return { get innerHTML() { return this.textContent; } };
            },
            body: element('body'),
        },
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        localStorage: { getItem: () => null },
        Chart,
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

    return { element, charts, alerts, monthlyTab, selectFile };
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
