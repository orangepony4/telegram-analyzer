const assert = require('node:assert/strict');
const { File } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'analyzer.js'), 'utf8');
const russianLocale = { getItem: key => key === 'telegramAnalyzerLocale' ? 'ru' : null };

function createAnalyzer({ chartsAvailable = true, storage = russianLocale, intl = Intl, search = '' } = {}) {
    const elements = new Map();
    const charts = new Map();
    const readers = [];
    const alerts = [];
    const downloads = [];
    let downloadedBlob;
    let focusedElement;

    function element(id) {
        if (!elements.has(id)) {
            const classes = new Set();
            const attributes = new Map();
            elements.set(id, {
                style: { setProperty(name, value) { this[name] = value; } },
                dataset: {},
                children: [],
                append(...children) {
                    this.children.push(...children);
                },
                get lastElementChild() {
                    return this.children.at(-1);
                },
                get options() {
                    return this.children.flatMap(child => child.tagName === 'OPTGROUP' ? child.children : [child]);
                },
                replaceChildren(...children) {
                    this.children = children;
                    this.value = children[0]?.value ?? '';
                },
                classList: {
                    add: name => classes.add(name),
                    remove: name => classes.delete(name),
                    contains: name => classes.has(name),
                    toggle(name, enabled) {
                        if (enabled) classes.add(name);
                        else classes.delete(name);
                    },
                },
                getContext: () => id,
                setAttribute: (name, value) => attributes.set(name, value),
                getAttribute: name => attributes.get(name),
                removeAttribute: name => attributes.delete(name),
                querySelector: () => null,
                focus() {
                    if (!this.disabled) focusedElement = this;
                },
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
    allTab.tabIndex = 0;
    monthlyTab.tabIndex = -1;
    allTab.setAttribute('aria-selected', 'true');
    monthlyTab.setAttribute('aria-selected', 'false');
    allTab.classList.add('active');
    element('all').classList.add('active');
    element('accountChatChooser').hidden = true;
    element('analyzeAccountChat').disabled = true;

    class Chart {
        static defaults = {};
        static getChart(id) { return charts.get(id); }

        constructor(id, config) {
            this.options = config.options;
            this.data = config.data;
            this.id = id;
            this.hiddenDatasets = new Set();
            charts.set(id, this);
        }

        isDatasetVisible(index) { return !this.hiddenDatasets.has(index); }
        setDatasetVisibility(index, visible) {
            if (visible) this.hiddenDatasets.delete(index);
            else this.hiddenDatasets.add(index);
        }

        update() {}
        destroy() { charts.delete(this.id); }
    }

    class MockFileReader {
        static LOADING = 1;
        static DONE = 2;
        readyState = 0;
        aborted = false;

        readAsText(file) {
            this.file = file;
            this.readyState = MockFileReader.LOADING;
            readers.push(this);
        }

        abort() {
            if (this.readyState !== MockFileReader.LOADING) return;
            this.aborted = true;
            this.readyState = MockFileReader.DONE;
            this.onabort();
        }

        complete(result) {
            this.readyState = MockFileReader.DONE;
            this.onload({ target: { result } });
        }

        fail() {
            this.readyState = MockFileReader.DONE;
            this.onerror();
        }
    }

    const documentElement = element('html');
    vm.runInNewContext(source, {
        document: {
            documentElement,
            addEventListener(event, handler) { handler(); },
            getElementById: element,
            querySelector: element,
            get activeElement() { return focusedElement; },
            querySelectorAll(selector) {
                if (selector === '.tab-btn') return [allTab, monthlyTab];
                return [];
            },
            createElement(tag) {
                if (tag === 'a') {
                    return { click() { downloads.push({ name: this.download, blob: downloadedBlob }); } };
                }
                if (tag === 'optgroup') {
                    const group = element(Symbol(tag));
                    group.tagName = 'OPTGROUP';
                    return group;
                }
                if (['button', 'span', 'tr', 'th', 'td'].includes(tag)) return element(Symbol(tag));
                return { get innerHTML() { return this.textContent; } };
            },
            body: element('body'),
        },
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        location: { search },
        Intl: intl,
        localStorage: storage,
        Chart: chartsAvailable ? Chart : undefined,
        Blob,
        File,
        URLSearchParams,
        URL: {
            createObjectURL(blob) {
                downloadedBlob = blob;
                return 'blob:participant-summary';
            },
            revokeObjectURL() {},
        },
        setTimeout(callback) { callback(); },
        FileReader: MockFileReader,
        alert: message => alerts.push(message),
        console,
    });

    function selectFile(name) {
        element('jsonFile').change({ target: { files: [{ name }] } });
        const reader = readers.at(-1);
        const completeRaw = result => reader.complete(result);
        return {
            complete(data) { completeRaw(JSON.stringify(data)); },
            completeRaw,
            fail() { reader.fail(); },
            abort() { reader.abort(); },
            get aborted() { return reader.aborted; },
        };
    }

    function demoImport(reader) {
        return {
            file: reader.file,
            async complete() {
                reader.complete(await reader.file.text());
            },
        };
    }

    function selectDemo() {
        element('loadDemoChat').click();
        return demoImport(readers.at(-1));
    }

    return {
        element, charts, alerts, downloads, allTab, monthlyTab, selectFile, selectDemo, documentElement,
        startupDemo: readers.length ? demoImport(readers[0]) : null,
        get focusedElement() { return focusedElement; },
    };
}

test('toggles the visible theme in both directions when saving preferences is blocked', t => {
    t.mock.method(console, 'warn', () => {});
    const denyStorage = () => { throw new Error('Storage unavailable'); };
    for (const [getItem, initial, alternate] of [
        [denyStorage, 'theme-muted-light', 'theme-default'],
        [() => 'default', 'theme-default', 'theme-muted-light'],
    ]) {
        const app = createAnalyzer({ storage: { getItem, setItem: denyStorage } });
        const body = app.element('body');
        const toggle = app.element('themeToggleBtn');
        assert.equal(body.classList.contains(initial), true);

        toggle.click();
        assert.equal(body.classList.contains(alternate), true);
        assert.equal(body.classList.contains(initial), false);

        toggle.click();
        assert.equal(body.classList.contains(initial), true);
        assert.equal(body.classList.contains(alternate), false);
    }
});

test('defaults to English and switches language without losing the report, month or series visibility', async () => {
    const preferences = new Map();
    const app = createAnalyzer({
        storage: { getItem: key => preferences.get(key), setItem: (key, value) => preferences.set(key, value) },
        search: '?view=upload',
    });
    const toggle = app.element('languageToggle');
    const toggleLabel = app.element('languageToggleLabel');
    assert.equal(app.documentElement.lang, 'en');
    assert.ok(toggle.getAttribute('aria-label').startsWith(toggleLabel.textContent));

    app.selectFile('two-months.json').complete({
        name: 'Synthetic report',
        messages: [
            { id: 1, from: 'Алиса', date: '2026-10-01T12:00:00', text: 'Hi' },
            { id: 2, from: 'Bob', date: '2026-11-01T12:00:00', text: 'Hi' },
        ],
    });
    const trend = app.charts.get('monthlyChart');
    app.element('monthlyChartSeries').children[0].click();
    app.monthlyTab.click();
    app.element('prevMonth').click();
    assert.match(app.element('currentMonth').textContent, /October/i);
    app.element('exportMonthlyParticipants').click();
    const before = await app.downloads.at(-1).blob.text();

    toggle.focus();
    toggle.click();
    assert.equal(app.documentElement.lang, 'ru');
    assert.ok(toggle.getAttribute('aria-label').startsWith(toggleLabel.textContent));
    assert.equal(preferences.get('telegramAnalyzerLocale'), 'ru');
    assert.equal(app.monthlyTab.getAttribute('aria-selected'), 'true');
    assert.match(app.element('currentMonth').textContent, /октябр/i);
    assert.equal(app.focusedElement, toggle);
    assert.equal(app.charts.get('monthlyChart').isDatasetVisible(0), false);
    assert.equal(trend.data.datasets[0].label, 'Алиса');
    app.element('exportMonthlyParticipants').click();
    assert.equal(await app.downloads.at(-1).blob.text(), before);

    toggle.click();
    assert.equal(app.documentElement.lang, 'en');
    assert.match(app.element('currentMonth').textContent, /October/i);
});

test('can measure linked replies across months without changing the active month, trend or CSV', async () => {
    const app = createAnalyzer({ search: '?view=upload' });
    app.selectFile('direct-replies.json').complete({
        messages: [
            { id: 3, from: 'Bob', date: '2026-02-01T00:10:00', reply_to_message_id: '1', text: 'Linked answer' },
            { id: 1, from: 'Alice', date: '2026-01-31T23:50:00', text: 'Question' },
            { id: 2, from: 'Eve', date: '2026-02-01T00:00:00', text: 'Unrelated turn' },
            { id: 4, from: 'Alice', date: '2026-03-01T12:00:00', text: 'Question' },
            { id: 5, from: 'Eve', date: '2026-03-01T12:00:00', reply_to_message_id: 4, text: 'Same-second answer' },
        ],
    });
    const mode = app.element('replyTiming');
    assert.equal(mode.disabled, false);
    assert.equal(mode.value, 'adjacent');
    const pairs = id => {
        const { labels, datasets } = app.charts.get(id).data;
        return Object.fromEntries(labels.map((label, index) => [label, datasets[0].data[index]]));
    };
    assert.equal(pairs('responseTimeChart')['Eve -> Bob'], 10);
    const trend = app.charts.get('monthlyChart');
    app.element('monthlyChartSeries').children[0].click();
    app.monthlyTab.click();
    app.element('prevMonth').click();
    assert.match(app.element('currentMonth').textContent, /феврал/);
    app.element('exportMonthlyParticipants').click();
    const priorCsv = await app.downloads.at(-1).blob.text();

    mode.value = 'direct';
    mode.change();
    assert.deepEqual(pairs('responseTimeChart'), { 'Alice -> Bob': 20, 'Alice -> Eve': 0 });
    assert.deepEqual(pairs('monthlyResponseTimeChart'), { 'Alice -> Bob': 20 });
    assert.match(app.element('currentMonth').textContent, /феврал/);
    assert.equal(app.monthlyTab.getAttribute('aria-selected'), 'true');
    assert.equal(app.charts.get('monthlyChart'), trend);
    assert.equal(trend.isDatasetVisible(0), false);
    app.element('exportMonthlyParticipants').click();
    assert.equal(await app.downloads.at(-1).blob.text(), priorCsv);

    app.element('ignoredThreshold').change({ target: { valueAsNumber: 15 } });
    assert.match(app.element('thresholdExceededMessagesStats').innerHTML, /Bob<\/strong>: 1/);
    assert.match(app.element('monthlyThresholdExceededMessagesStats').innerHTML, /Bob<\/strong>: 1/);
    app.element('prevMonth').click();
    assert.deepEqual(pairs('monthlyResponseTimeChart'), {});
    assert.match(app.element('currentMonth').textContent, /январ/);

    app.selectFile('invalid.json').completeRaw('{');
    assert.equal(mode.value, 'direct');
    assert.deepEqual(pairs('responseTimeChart'), { 'Alice -> Bob': 20, 'Alice -> Eve': 0 });
    app.selectFile('plain.json').complete({ messages: [
        { id: 1, from: 'Alice', date: '2026-01-01T12:00:00' },
        { id: 2, from: 'Bob', date: '2026-01-01T12:02:00' },
    ] });
    assert.equal(mode.disabled, true);
    assert.equal(mode.value, 'adjacent');
    assert.deepEqual(pairs('responseTimeChart'), { 'Alice -> Bob': 2 });
});

test('weights participant reply averages by each response, including zero-second replies', async () => {
    const app = createAnalyzer({ search: '?view=upload' });
    const base = Date.parse('2026-10-01T00:00:00Z') / 1000;
    const row = (id, from, second, reply_to_message_id) => ({
        id, from, date_unixtime: String(base + second), reply_to_message_id, text: 'X',
    });
    app.selectFile('weighted-replies.json').complete({ messages: [
        row(1, 'Sender A', 0),
        row(2, '__proto__', 0, 1),
        row(3, 'Sender A', 1),
        row(4, '__proto__', 11, 3),
        row(5, 'Sender B', 12),
        row(6, '__proto__', 32, 5),
        row(7, '0', 32, 6),
    ] });
    const details = app.element('participantStats');
    assert.match(details.innerHTML, /<strong>__proto__<\/strong>: 10 сек/);
    assert.match(details.innerHTML, /<strong>0<\/strong>: 0 сек/);
    app.element('exportParticipants').click();
    const mode = app.element('replyTiming');
    mode.value = 'direct';
    mode.change({ target: mode });
    assert.match(details.innerHTML, /<strong>Sender B<\/strong>: Нет данных/);
    assert.match(details.innerHTML, /<strong>__proto__<\/strong>: 10 сек/);
    assert.match(details.innerHTML, /<strong>0<\/strong>: 0 сек/);
    app.element('languageToggle').click();
    assert.match(details.innerHTML, /<strong>Sender B<\/strong>: No data/);
    assert.match(details.innerHTML, /<strong>__proto__<\/strong>: 10 sec/);
    assert.match(details.innerHTML, /<strong>0<\/strong>: 0 sec/);
    app.element('exportParticipants').click();
    const before = await app.downloads[0].blob.text();
    assert.equal(await app.downloads[1].blob.text(), before);
    assert.match(before, /"Sender A",2,1\.0\r\n"__proto__",3,1\.0\r\n"Sender B",1,1\.0\r\n"0",1,1\.0\r\n$/);
});

test('does not guess direct reply pairs for duplicate, foreign, missing, future or undated targets', () => {
    const app = createAnalyzer({ search: '?view=upload' });
    const at = (id, from, hour, extra = {}) => ({
        id, from, date: `2026-03-01T${String(hour).padStart(2, '0')}:00:00`, ...extra,
    });
    app.selectFile('unmatched.json').complete({ messages: [
        at(1, 'Alice', 8),
        at(2, 'Bob', 9, { reply_to_message_id: 1, reply_to_peer_id: 'channel42' }),
        at(3, 'Alice', 10, { reply_to_message_id: 1 }),
        at(4, 'Bob', 11, { reply_to_message_id: 5 }),
        at(5, 'Alice', 12),
        at(6, 'Bob', 12, { reply_to_message_id: 7 }),
        at(7, 'Alice', 12),
        at(8, 'Alice', 13),
        at(8, 'Bob', 14),
        at(9, 'Cora', 15, { reply_to_message_id: 8 }),
        at(10, 'Bob', 16, { type: 'service' }),
        at(11, 'Cora', 17, { reply_to_message_id: 10 }),
        { id: 12, from: 'Bob' },
        at(13, 'Cora', 18, { reply_to_message_id: 12 }),
        at(14, 'Cora', 19, { reply_to_message_id: 99 }),
        at(15, 'Cora', 20, { reply_to_message_id: 1, type: 'service' }),
    ] });
    assert.equal(app.element('directRepliesOption').disabled, true);
    assert.equal(app.element('replyTiming').disabled, true);
    assert.equal(app.element('replyTiming').value, 'adjacent');
    assert.equal(app.element('replyTimingHint').textContent, 'Замерено прямых ответов · 0 из 8');
    assert.ok(app.charts.get('responseTimeChart').data.labels.length > 0);
});

test('matches direct replies in migrated Telegram history with negative message IDs', () => {
    const app = createAnalyzer({ search: '?view=upload' });
    const date = '2026-04-01T12:00:00';
    app.selectFile('migrated.json').complete({ messages: [
        { id: -999999999, from: 'Alice', date },
        { id: -999999998, from: 'Bob', date, reply_to_message_id: '-999999999' },
        { id: 1, from: 'Bob', date },
        { id: 2, from: 'Alice', date, reply_to_message_id: 1 },
    ] });
    const mode = app.element('replyTiming');
    assert.equal(mode.disabled, false);
    mode.value = 'direct';
    mode.change();
    const { labels, datasets } = app.charts.get('responseTimeChart').data;
    assert.deepEqual(Array.from(labels), ['Alice -> Bob', 'Bob -> Alice']);
    assert.deepEqual(Array.from(datasets[0].data), [0, 0]);
});

test('shows timed replies out of recorded links for the current report scope and language', () => {
    const app = createAnalyzer({ storage: { getItem: () => null, setItem() {} }, search: '?view=upload' });
    const row = (id, from, day, extra) => ({ id, from, date: `${day}T12:00:00`, ...extra });
    app.selectFile('partial-replies.json').complete({ messages: [
        row(1, 'Alice', '2026-01-01'),
        row(2, 'Bob', '2026-02-01', { reply_to_message_id: 1 }),
        row(3, 'Casey', '2026-02-02', { reply_to_message_id: 999 }),
        row(4, 'Casey', '2026-01-02', { reply_to_message_id: 1, reply_to_peer_id: 'channel42' }),
        row(5, null, '2026-02-03', { reply_to_message_id: 1 }),
        { id: 6, from: 'Casey', reply_to_message_id: 1 },
        row(7, 'Casey', '2026-03-01', { reply_to_message_id: 1, type: 'service' }),
        row(8, 'Alice', '2026-03-02'),
    ] });
    const hint = app.element('replyTimingHint');
    assert.equal(hint.textContent, 'Direct replies timed · 1 of 5');
    app.monthlyTab.click();
    assert.equal(hint.textContent, 'No direct reply links in this view.');
    app.element('prevMonth').click();
    assert.equal(hint.textContent, 'Direct replies timed · 1 of 3');
    app.element('languageToggle').click();
    assert.equal(hint.textContent, 'Замерено прямых ответов · 1 из 3');
    app.element('prevMonth').click();
    assert.equal(hint.textContent, 'Замерено прямых ответов · 0 из 1');
    app.allTab.click();
    assert.equal(hint.textContent, 'Замерено прямых ответов · 1 из 5');
});

test('rejects unrelated JSON and malformed message entries', () => {
    const app = createAnalyzer();
    for (const data of [{}, { messages: [null] }]) {
        app.selectFile('invalid.json').complete(data);
        assert.match(app.element('fileError').textContent, /Telegram Desktop/);
        assert.equal(app.element('fileError').hidden, false);
        assert.equal(app.element('reportPlaceholder').hidden, false);
        assert.equal(app.element('.stats-container').style.display, 'none');
        assert.equal(app.element('loadingIndicator').style.display, 'none');
        assert.equal(app.element('importStatus').textContent, '');
        assert.equal(app.element('jsonFile').value, '');
    }
    assert.deepEqual(app.alerts, []);
    app.selectFile('valid.json').complete({ messages: [] });
    assert.equal(app.element('fileError').hidden, true);
    assert.equal(app.element('reportPlaceholder').hidden, true);
});

function accountFixture() {
    const hostileName = '<img src=x onerror=probe()>';
    return {
        hostileName,
        data: {
            chats: { list: [
                null,
                { name: 'Shared title', type: 'personal_chat', id: 101, messages: [
                    { id: 1, from: 'Alpha', date: '2025-01-10T12:00:00', text: 'First' },
                    { id: 2, from: 'Alpha', date: '2025-02-10T12:00:00', text: 'Second' },
                ] },
                { name: 'Bad row', type: 'personal_chat', id: 102, messages: [null] },
                { name: hostileName, type: 'private_group', id: 103, messages: [] },
                { name: 'Missing messages', type: 'personal_chat', id: 104 },
            ] },
            left_chats: { list: [
                { name: 'Shared title', type: 'private_group', id: 201, messages: [
                    { id: 1, from: 'Beta', date: '2025-03-10T12:00:00', text: 'Third' },
                    { id: 2, from: 'Gamma', date: '2025-04-10T12:00:00', text: 'Fourth' },
                ] },
                { type: 'private_group', id: 202, messages: [] },
            ] },
        },
    };
}

function chooseAccountChat(app, value) {
    const select = app.element('accountChatSelect');
    select.value = value;
    select.change({ target: select });
}

test('filters account chats by part of a name without changing the open report or stable chat IDs', () => {
    const app = createAnalyzer({ search: '?view=upload' });
    const filter = app.element('accountChatSearch');
    const select = app.element('accountChatSelect');
    const matches = app.element('accountChatSearchStatus');
    const analyze = app.element('analyzeAccountChat');
    const values = () => select.options.map(option => option.value);
    const search = value => {
        filter.value = value;
        filter.input();
    };
    app.selectFile('account.json').complete({
        chats: { list: [
            { name: 'Family notes', messages: [] },
            { name: 'Café Alpha notes', messages: [{ id: 1, from: 'Ari', text: 'First' }] },
            { type: 'saved_messages', messages: [] },
        ] },
        left_chats: { list: [{ name: 'Weekly Cafe\u0301 Alpha', messages: [{ id: 1, from: 'Bo', text: 'Second' }] }] },
    });
    assert.equal(app.element('accountChatSearchField').hidden, false);
    assert.deepEqual(values(), ['', '0', '1', '2', '3']);
    chooseAccountChat(app, '3');
    analyze.click();
    assert.match(app.element('reportTitle').textContent, /Weekly/);

    search('  CAFÉ ALPHA  ');
    assert.deepEqual(values(), ['', '1', '3']);
    assert.match(matches.textContent, /2 из 4/);
    assert.equal(select.value, '3');
    assert.equal(analyze.disabled, false);
    app.element('languageToggle').click();
    assert.equal(filter.value, '  CAFÉ ALPHA  ');
    assert.equal(select.value, '3');
    assert.match(matches.textContent, /2 of 4/);
    assert.match(select.options[2].textContent, /Left chat.*#4/);

    search('notes');
    assert.deepEqual(values(), ['', '0', '1']);
    assert.equal(select.value, '');
    assert.equal(analyze.disabled, true);
    assert.match(app.element('reportTitle').textContent, /Weekly/);
    chooseAccountChat(app, '1');
    analyze.click();
    assert.match(app.element('reportTitle').textContent, /Café Alpha notes/);

    search('no match');
    assert.deepEqual(values(), ['']);
    assert.equal(select.disabled, true);
    assert.equal(analyze.disabled, true);
    assert.match(matches.textContent, /0 of 4/);
    assert.match(app.element('reportTitle').textContent, /Café Alpha notes/);
    search('saved');
    assert.deepEqual(values(), ['', '2']);
    assert.equal(select.disabled, false);
    assert.equal(analyze.disabled, true);
    search('');
    assert.deepEqual(values(), ['', '0', '1', '2', '3']);

    search('notes');
    app.selectFile('invalid.json').completeRaw('{bad');
    assert.equal(filter.value, 'notes');
    assert.deepEqual(values(), ['', '0', '1']);
    app.selectFile('replacement.json').complete({
        chats: { list: [{ name: 'Single chat', messages: [] }] },
    });
    assert.equal(filter.value, '');
    assert.equal(app.element('accountChatSearchField').hidden, true);
    assert.deepEqual(values(), ['', '0']);
});

test('lists valid account chats safely and waits for an explicit analysis', () => {
    const app = createAnalyzer();
    const chooser = app.element('accountChatChooser');
    const select = app.element('accountChatSelect');
    const analyze = app.element('analyzeAccountChat');
    assert.equal(chooser.hidden, true);

    app.selectFile('previous.json').complete({ messages: [
        { id: 1, from: 'Previous sender', date: '2025-04-01T12:00:00', text: 'Previous chat' },
    ] });
    assert.ok(app.charts.size > 0);

    const { data, hostileName } = accountFixture();
    data.chats.list.push({
        name: 'Bad sender field', messages: [{ id: 1, from: ['Invalid'] }],
    });
    app.selectFile('account.json').complete(data);
    assert.equal(chooser.hidden, false);
    assert.equal(select.value, '');
    assert.equal(analyze.disabled, true);
    assert.deepEqual(select.options.map(option => option.value), ['', '0', '1', '2', '3']);
    assert.equal(select.lastElementChild.label, 'Доступные чаты');
    const labels = select.options.slice(1).map(option => option.textContent);
    assert.deepEqual(labels, [
        'Shared title · 2 сообщ. · #1',
        hostileName + ' · 0 сообщ. · #2',
        'Shared title · Покинутый чат · 2 сообщ. · #3',
        'Чат без названия · Покинутый чат · 0 сообщ. · #4',
    ]);
    assert.doesNotMatch(labels.join(' '), /Bad row|Bad sender field|Missing messages/);
    assert.equal(app.element('.stats-container').style.display, 'none');
    assert.equal(app.element('exportParticipants').disabled, true);
    assert.equal(app.element('exportMonthlyParticipants').disabled, true);
    analyze.click();
    assert.equal(app.charts.size, 0);

    chooseAccountChat(app, '0');
    assert.equal(analyze.disabled, false);
    assert.equal(app.element('.stats-container').style.display, 'none');
    assert.equal(app.charts.size, 0);
    const choices = select.children;
    app.element('languageToggle').click();
    assert.equal(select.children, choices);
    assert.equal(select.value, '0');
    assert.equal(select.lastElementChild.label, 'Available chats');
    assert.deepEqual(select.options.map(option => [option.value, option.textContent]), [
        ['', 'Choose a chat'],
        ['0', 'Shared title · 2 messages · #1'],
        ['1', hostileName + ' · 0 messages · #2'],
        ['2', 'Shared title · Left chat · 2 messages · #3'],
        ['3', 'Untitled chat · Left chat · 0 messages · #4'],
    ]);
    analyze.click();
    assert.equal(app.element('.stats-container').style.display, 'block');
    assert.match(app.element('messageCount').innerHTML, /class="metric-value">2<\/strong>/);
    assert.match(app.element('participantStats').innerHTML, /Alpha/);
    assert.match(app.element('accountChatStatus').textContent, /Shared title/);
    assert.deepEqual(app.alerts, []);
});

test('resets the month and both CSV exports when switching account chats', async () => {
    const app = createAnalyzer();
    app.selectFile('account.json').complete(accountFixture().data);
    const analyze = app.element('analyzeAccountChat');
    chooseAccountChat(app, '0');
    analyze.click();
    assert.match(app.element('currentMonth').textContent, /февраль/);
    app.monthlyTab.click();
    app.element('prevMonth').click();
    app.element('exportMonthlyParticipants').click();

    chooseAccountChat(app, '2');
    analyze.click();
    assert.match(app.element('currentMonth').textContent, /апрель/);
    assert.equal(app.charts.get('monthlyChart').data.labels.join(), '2025-03,2025-04');
    assert.doesNotMatch(app.element('participantStats').innerHTML, /Alpha/);
    app.element('exportMonthlyParticipants').click();
    app.element('exportParticipants').click();

    const reports = await Promise.all(app.downloads.map(async ({ name, blob }) => [name, await blob.text()]));
    assert.equal(reports.length, 3);
    assert.equal(reports[0][0], 'telegram-analyzer-2025-01-participants.csv');
    assert.match(reports[0][1], /"Alpha",1,/);
    assert.equal(reports[1][0], 'telegram-analyzer-2025-04-participants.csv');
    assert.match(reports[1][1], /"Gamma",1,/);
    assert.doesNotMatch(reports[1][1], /Alpha|Beta/);
    assert.equal(reports[2][0], 'telegram-analyzer-participants.csv');
    assert.match(reports[2][1], /"Beta",1,/);
    assert.match(reports[2][1], /"Gamma",1,/);
    assert.doesNotMatch(reports[2][1], /Alpha/);

    chooseAccountChat(app, '3');
    analyze.click();
    assert.match(app.element('messageCount').innerHTML, /class="metric-value">0<\/strong>/);
    assert.equal(app.monthlyTab.disabled, true);
    assert.equal(app.element('exportParticipants').disabled, true);
    assert.equal(app.element('exportMonthlyParticipants').disabled, true);
});

test('jumps between available months and keeps charts, arrows, language and CSV in sync', async () => {
    const app = createAnalyzer({ search: '?view=upload' });
    const picker = app.element('reportMonth');
    const previous = app.element('prevMonth');
    const next = app.element('nextMonth');
    const upload = (name, messages) => app.selectFile(name).complete({ name, messages });
    const messages = [
        { id: 1, from: 'Ari', date: '2021-04-03T12:00:00', text: 'Earliest' },
        { id: 2, from: 'Bo', date: '2024-11-04T12:00:00', text: 'Middle' },
        { id: 3, from: 'Cam', date: '2026-07-06T12:00:00', text: 'Latest' },
    ];
    upload('long.json', messages);
    app.monthlyTab.click();
    assert.deepEqual(picker.children.map(option => option.value), ['2021-04', '2024-11', '2026-07']);
    assert.equal(picker.disabled, false);
    assert.equal(picker.value, '2026-07');
    assert.equal(next.disabled, true);

    picker.focus();
    picker.value = '2021-04';
    picker.change();
    assert.equal(app.focusedElement, picker);
    assert.equal(previous.disabled, true);
    assert.equal(next.disabled, false);
    assert.match(app.element('currentMonth').textContent, /апрель.*2021/);
    assert.match(app.element('monthlyParticipantStats').innerHTML, /Ari/);
    assert.doesNotMatch(app.element('monthlyParticipantStats').innerHTML, /Cam/);
    app.element('exportMonthlyParticipants').click();
    assert.equal(app.downloads[0].name, 'telegram-analyzer-2021-04-participants.csv');
    assert.match(await app.downloads[0].blob.text(), /"Ari",1,/);

    next.click();
    assert.equal(picker.value, '2024-11');
    app.element('languageToggle').click();
    assert.equal(picker.value, '2024-11');
    assert.match(picker.children[1].textContent, /November 2024/);
    assert.match(app.element('currentMonth').textContent, /November 2024/);
    const invalid = app.selectFile('invalid.json');
    invalid.completeRaw('{bad json');
    assert.equal(picker.value, '2024-11');
    assert.equal(app.monthlyTab.getAttribute('aria-selected'), 'true');

    upload('single.json', [messages[2]]);
    assert.equal(picker.value, '2026-07');
    assert.equal(picker.disabled, true);
    assert.deepEqual(picker.children.map(option => option.value), ['2026-07']);
    upload('empty.json', []);
    assert.equal(picker.disabled, true);
    assert.equal(picker.value, '');
    assert.equal(picker.children.length, 0);
    assert.equal(app.monthlyTab.disabled, true);
});

test('opens dated activity as a localized table without charts and jumps to its month', () => {
    const app = createAnalyzer({ chartsAvailable: false, search: '?view=upload' });
    const details = app.element('monthlyActivity');
    const rows = app.element('monthlyActivityRows');
    app.selectFile('activity.json').complete({ messages: [
        { id: 1, from: 'Ari', date: '2021-04-03T12:00:00', text: 'First' },
        { id: 2, from: 'Bo', date: '2021-04-03T12:05:00', text: 'Second' },
        { id: 3, type: 'service', date: '2021-04-04T01:30:00', action: 'pin_message' },
        { id: 4, from: 'Cam', date: '2024-10-06T18:00:00', text: 'Latest' },
        { id: 5, type: 'unsupported' },
    ] });
    assert.equal(details.hidden, false);
    assert.equal(rows.children.length, 0);
    details.open = true;
    details.toggle();
    assert.equal(rows.children.length, 2);
    const cells = index => rows.children[index].children;
    assert.match(cells(0)[0].children[0].textContent, /апрель.*2021/);
    assert.deepEqual(cells(0).slice(1).map(cell => cell.textContent), ['3', '2']);
    assert.deepEqual(cells(1).slice(1).map(cell => cell.textContent), ['1', '1']);

    app.element('languageToggle').click();
    assert.equal(details.open, true);
    assert.match(cells(0)[0].children[0].textContent, /April 2021/);
    cells(0)[0].children[0].click();
    assert.equal(app.monthlyTab.getAttribute('aria-selected'), 'true');
    assert.equal(app.focusedElement, app.monthlyTab);
    assert.equal(app.element('reportMonth').value, '2021-04');
    assert.match(app.element('monthlyParticipantStats').innerHTML, /Ari/);

    app.selectFile('empty.json').complete({ messages: [{ id: 6, type: 'unsupported' }] });
    assert.equal(details.hidden, true);
    assert.equal(details.open, false);
    assert.equal(rows.children.length, 0);
});

test('exports dated monthly activity as stable CSV without charts or participant names', async () => {
    const app = createAnalyzer({ chartsAvailable: false, search: '?view=upload' });
    const activity = app.element('monthlyActivity');
    const exportActivity = app.element('exportMonthlyActivity');
    assert.equal(exportActivity.disabled, true);
    exportActivity.click();
    assert.deepEqual(app.downloads, []);

    app.selectFile('activity.json').complete({ messages: [
        { id: 2, from: 'Synthetic name', date: '2026-10-02T23:55:00-07:00', text: 'One' },
        { id: 3, from: 'Synthetic name', date: '2026-10-02T23:58:00-07:00', text: 'Two' },
        { id: 1, type: 'service', date: '2024-02-29T12:00:00Z', action: 'pin_message' },
        { id: 4, type: 'service', date: '2026-10-03T00:10:00-07:00', action: 'pin_message' },
        { id: 5, type: 'unsupported' },
    ] });
    activity.open = true;
    activity.toggle();
    assert.equal(exportActivity.disabled, false);
    exportActivity.click();
    app.element('languageToggle').click();
    exportActivity.click();
    const expected = '\uFEFFmonth,records,active_days\r\n2024-02,1,1\r\n2026-10,3,2\r\n';
    assert.equal(app.downloads.length, 2);
    for (const { name, blob } of app.downloads) {
        assert.equal(name, 'telegram-analyzer-monthly-activity.csv');
        assert.equal(Buffer.from(await blob.arrayBuffer()).toString('utf8'), expected);
    }
    app.selectFile('undated.json').complete({ messages: [{ id: 6, type: 'unsupported' }] });
    assert.equal(activity.hidden, true);
    assert.equal(exportActivity.disabled, true);
    exportActivity.click();
    assert.equal(app.downloads.length, 2);
});

test('lists every day of the selected month without charts, including leap day and zero counts', () => {
    const app = createAnalyzer({ chartsAvailable: false, search: '?view=upload' });
    const table = app.element('dailyActivity');
    const rows = app.element('dailyActivityRows');
    app.selectFile('days.json').complete({ messages: [
        { id: 1, from: 'Ari', date: '2024-02-29T23:59:00-08:00', text: 'Leap day' },
        { id: 2, type: 'service', date: '2024-02-29T01:30:00Z', action: 'pin_message' },
        { id: 3, from: 'Bo', date: '2024-04-02T00:01:00Z', text: 'April' },
    ] });
    app.monthlyTab.click();
    assert.equal(table.hidden, false);
    assert.equal(rows.children.length, 0);
    table.open = true;
    table.toggle();
    assert.equal(rows.children.length, 30);
    assert.equal(rows.children[1].children[1].textContent, '1');
    app.element('prevMonth').click();
    assert.equal(rows.children.length, 29);
    assert.equal(rows.children[0].children[1].textContent, '0');
    assert.equal(rows.children.at(-1).children[1].textContent, '2');
    const lastDay = () => rows.children.at(-1).children[0].children[0];
    assert.equal(lastDay().dateTime, '2024-02-29');
    assert.match(lastDay().textContent, /29 фев/i);
    app.element('languageToggle').click();
    assert.equal(table.open, true);
    assert.match(lastDay().textContent, /Feb 29/i);
    app.selectFile('undated.json').complete({ messages: [] });
    assert.equal(table.hidden, true);
    assert.equal(table.open, false);
    assert.equal(rows.children.length, 0);
});

test('exports reply timing for the active report scope and method with formula-safe CSV names', async () => {
    const app = createAnalyzer({ chartsAvailable: false, search: '?view=upload' });
    const button = app.element('exportReplyTiming');
    const mode = app.element('replyTiming');
    const unsafe = '=A,"quoted"';
    const name = `"'=A,""quoted"""`;
    assert.equal(button.disabled, true);
    app.selectFile('replies.json').complete({ messages: [
        { id: 1, from: unsafe, date: '2026-01-31T23:58:00Z', text: 'Question' },
        { id: 2, from: 'Eve', date: '2026-01-31T23:59:00Z', text: 'Other' },
        { id: 3, from: 'Bob', date: '2026-02-01T00:00:00Z', reply_to_message_id: 1, text: 'Reply' },
        { id: 4, from: 'Bob', date: '2026-02-01T00:00:01Z', text: 'More' },
        { id: 5, from: unsafe, date: '2026-02-01T00:00:30Z', text: 'Question' },
        { id: 6, from: 'Bob', date: '2026-02-01T00:01:30Z', reply_to_message_id: 5, text: 'Reply' },
    ] });
    const threshold = app.element('ignoredThreshold');
    threshold.valueAsNumber = 1;
    threshold.change({ target: threshold });
    assert.equal(button.disabled, false);
    button.click();

    app.monthlyTab.click();
    button.click();
    mode.value = 'direct';
    mode.change({ target: mode });
    button.click();
    app.element('languageToggle').click();
    button.click();

    app.element('prevMonth').click();
    assert.equal(button.disabled, true);
    button.click();
    assert.equal(app.downloads.length, 4);
    mode.value = 'adjacent';
    mode.change({ target: mode });
    assert.equal(button.disabled, false);
    button.click();

    const files = await Promise.all(app.downloads.map(async ({ name, blob }) => ({
        name, csv: Buffer.from(await blob.arrayBuffer()).toString('utf8'),
    })));
    const heading = '\uFEFFsender,responder,timed_replies,average_seconds,long_replies,threshold_seconds\r\n';
    assert.equal(files[0].name, 'telegram-analyzer-adjacent-replies.csv');
    assert.ok(files[0].csv.includes(`${name},"Eve",1,60.000,0,60\r\n`));
    assert.equal(files[1].name, 'telegram-analyzer-2026-02-adjacent-replies.csv');
    assert.ok(files[1].csv.includes(`"Bob",${name},1,29.000,0,60\r\n`));
    assert.doesNotMatch(files[1].csv, /"Eve",1,60\.000/);
    assert.equal(files[2].name, 'telegram-analyzer-2026-02-direct-replies.csv');
    assert.equal(files[2].csv, heading + `${name},"Bob",2,90.000,1,60\r\n`);
    assert.deepEqual(files[3], files[2]);
    assert.equal(files[4].name, 'telegram-analyzer-2026-01-adjacent-replies.csv');
    assert.equal(files[4].csv, heading + `${name},"Eve",1,60.000,0,60\r\n`);

    app.selectFile('empty.json').complete({ messages: [] });
    assert.equal(button.disabled, true);
});

test('shares a long reply threshold between the overview, monthly report and both CSV scopes', async () => {
    const app = createAnalyzer({ chartsAvailable: false, search: '?view=upload' });
    app.selectFile('replies.json').complete({ messages: [
        { id: 1, from: 'Alice', date: '2026-01-01T00:00:00Z' },
        { id: 2, from: 'Bob', date: '2026-01-01T00:02:00Z', reply_to_message_id: 1 },
    ] });
    const overviewThreshold = app.element('ignoredThreshold');
    const monthThreshold = app.element('monthlyIgnoredThreshold');
    const change = (input, value) => {
        input.valueAsNumber = value;
        input.change({ target: input });
    };
    app.monthlyTab.click();
    change(monthThreshold, 3);
    assert.equal(Number(overviewThreshold.value), 3);
    app.element('exportReplyTiming').click();
    assert.match(await app.downloads[0].blob.text(), /"Alice","Bob",1,120\.000,0,180/);
    app.allTab.click();
    change(overviewThreshold, 1);
    assert.equal(Number(monthThreshold.value), 1);
    app.element('exportReplyTiming').click();
    assert.match(await app.downloads[1].blob.text(), /"Alice","Bob",1,120\.000,1,60/);
    app.monthlyTab.click();
    change(monthThreshold, 0.5);
    assert.equal(Number(monthThreshold.value), 1);
    assert.equal(Number(overviewThreshold.value), 1);
    app.element('exportReplyTiming').click();
    assert.match(await app.downloads[2].blob.text(), /"Alice","Bob",1,120\.000,1,60/);
});

test('clears the report and account data and aborts a pending replacement without losing language', () => {
    const app = createAnalyzer({ search: '?view=upload' });
    const clear = app.element('clearLoadedData');
    const chooser = app.element('accountChatChooser');
    app.selectFile('account.json').complete({
        chats: { list: [
            { name: 'Synthetic open chat', messages: [
                { id: 1, from: 'Synthetic participant', date: '2026-10-01T00:00:00Z', text: 'Test' },
            ] },
            { name: 'Synthetic other chat', messages: [] },
        ] },
    });
    chooseAccountChat(app, '0');
    app.element('analyzeAccountChat').click();
    assert.equal(clear.hidden, false);
    assert.equal(chooser.hidden, false);
    assert.equal(app.element('reportTitle').textContent, 'Synthetic open chat');

    const pending = app.selectFile('slow.json');
    clear.click();
    assert.equal(pending.aborted, true);
    pending.complete({ name: 'Old callback', messages: [] });
    pending.fail();
    assert.equal(app.element('loadingIndicator').style.display, 'none');
    assert.equal(app.element('fileError').hidden, true);
    assert.equal(app.element('reportTitle').textContent, 'Анализ переписки');
    assert.equal(app.element('placeholderTitle').textContent, 'Выберите JSON-файл');
    assert.equal(app.element('dropFileName').textContent, 'Файл не выбран');
    assert.equal(app.element('reportPlaceholder').hidden, false);
    assert.equal(app.element('.stats-container').style.display, 'none');
    assert.equal(app.element('exportParticipants').disabled, true);
    assert.equal(app.element('exportReplyTiming').disabled, true);
    assert.equal(chooser.hidden, true);
    assert.equal(app.element('accountChatSelect').children.length, 0);
    assert.equal(clear.hidden, true);
    assert.equal(app.focusedElement, app.element('jsonFile'));
    assert.equal(app.charts.size, 0);
    assert.equal(app.documentElement.lang, 'ru');
    assert.equal(app.element('importStatus').textContent, 'Отчёт очищен.');
    app.element('languageToggle').click();
    assert.equal(app.element('reportTitle').textContent, 'Chat analysis');
    app.selectFile('new.json').complete({ name: 'Fresh report', messages: [] });
    assert.equal(app.element('reportTitle').textContent, 'Fresh report');
    assert.equal(clear.hidden, false);
});

test('shows written-hour and weekday counts in both scopes without charts', () => {
    const app = createAnalyzer({ chartsAvailable: false, search: '?view=upload' });
    const overall = app.element('overviewActivityPatterns');
    const month = app.element('monthlyActivityPatterns');
    const row = (id, index) => app.element(id).children[index].children.map(cell => cell.textContent);
    app.selectFile('patterns.json').complete({ messages: [
        { id: 1, from: 'Alice', date: '2026-01-05T23:10:00-08:00' },
        { id: 2, from: 'Bob', date: '2026-01-05T23:15:00Z' },
        { id: 3, type: 'service', date: '2026-02-01T04:00:00Z' },
        { id: 4, from: 'Alice' },
    ] });
    assert.equal(overall.hidden, false);
    assert.equal(app.element('overviewWeekdayRows').children.length, 0);
    overall.open = true;
    overall.toggle();
    assert.deepEqual(row('overviewWeekdayRows', 0), ['воскресенье', '1']);
    assert.deepEqual(row('overviewWeekdayRows', 1), ['понедельник', '2']);
    assert.deepEqual(row('overviewWeekdayRows', 2), ['вторник', '0']);
    assert.deepEqual(row('overviewHourlyRows', 23), ['23:00', '2']);
    assert.deepEqual(row('overviewHourlyRows', 4), ['04:00', '1']);
    assert.equal(app.element('overviewHourlyRows').children.length, 24);

    app.monthlyTab.click();
    month.open = true;
    month.toggle();
    assert.deepEqual(row('monthlyWeekdayRows', 0), ['воскресенье', '1']);
    assert.deepEqual(row('monthlyHourlyRows', 23), ['23:00', '0']);
    app.element('prevMonth').click();
    assert.equal(month.open, true);
    assert.deepEqual(row('monthlyWeekdayRows', 1), ['понедельник', '2']);
    assert.deepEqual(row('monthlyHourlyRows', 23), ['23:00', '2']);
    app.element('languageToggle').click();
    assert.deepEqual(row('overviewWeekdayRows', 1), ['Monday', '2']);
    assert.deepEqual(row('monthlyWeekdayRows', 1), ['Monday', '2']);
    app.element('clearLoadedData').click();
    assert.equal(overall.hidden, true);
    assert.equal(month.hidden, true);
    assert.equal(app.element('overviewWeekdayRows').children.length, 0);
    assert.equal(app.element('monthlyHourlyRows').children.length, 0);
    app.selectFile('undated.json').complete({ messages: [{ id: 5, from: 'Alice' }] });
    assert.equal(overall.hidden, true);
    assert.equal(month.hidden, true);
});

test('exports every date in the selected month without names and includes leap day', async () => {
    const app = createAnalyzer({ chartsAvailable: false, search: '?view=upload' });
    const exportDay = app.element('exportDailyActivity');
    app.selectFile('activity.json').complete({ messages: [
        { id: 1, from: 'Synthetic name', date: '2024-02-29T23:59:00-08:00' },
        { id: 2, type: 'service', date: '2024-02-29T01:00:00Z' },
        { id: 3, from: 'Other name', date: '2024-04-02T00:00:00Z' },
        { id: 4, type: 'unsupported' },
    ] });
    app.monthlyTab.click();
    exportDay.click();
    app.element('prevMonth').click();
    exportDay.click();
    app.element('languageToggle').click();
    exportDay.click();

    const files = await Promise.all(app.downloads.map(async ({ name, blob }) => [
        name, Buffer.from(await blob.arrayBuffer()).toString('utf8'),
    ]));
    const april = files[0][1].split('\r\n');
    const february = files[1][1].split('\r\n');
    assert.equal(files[0][0], 'telegram-analyzer-2024-04-daily-activity.csv');
    assert.equal(april.length, 32);
    assert.equal(april[2], '2024-04-02,1');
    assert.equal(files[1][0], 'telegram-analyzer-2024-02-daily-activity.csv');
    assert.equal(february[0], '\uFEFFdate,records');
    assert.equal(february.length, 31);
    assert.equal(february[1], '2024-02-01,0');
    assert.equal(february[29], '2024-02-29,2');
    assert.deepEqual(files[2], files[1]);
    assert.doesNotMatch(files[1][1], /Synthetic name|Other name/);

    app.allTab.click();
    exportDay.click();
    assert.equal(app.downloads.length, 3);
    app.selectFile('undated.json').complete({ messages: [{ type: 'unsupported' }] });
    assert.equal(exportDay.disabled, true);
    exportDay.click();
    assert.equal(app.downloads.length, 3);
});

test('ignores malformed account groups and hides stale choosers on single or demo imports', async () => {
    const app = createAnalyzer();
    const { data } = accountFixture();
    const chooser = app.element('accountChatChooser');
    app.selectFile('left-only.json').complete({
        chats: { list: 'malformed' },
        left_chats: { list: [data.left_chats.list[0]] },
    });
    assert.equal(chooser.hidden, false);
    assert.deepEqual(app.element('accountChatSelect').options.map(option => option.value), ['', '0']);

    const stale = app.selectFile('stale-account.json');
    app.selectFile('single.json').complete({
        messages: [{ id: 1, from: 'Single user', date: '2025-08-01T12:00:00', text: 'Current' }],
    });
    stale.complete(data);
    stale.fail();
    assert.equal(chooser.hidden, true);
    assert.match(app.element('participantStats').innerHTML, /Single user/);
    assert.deepEqual(app.alerts, []);

    app.selectFile('account.json').complete(data);
    assert.equal(chooser.hidden, false);
    const demo = app.selectDemo();
    assert.equal(chooser.hidden, true);
    await demo.complete();
    assert.equal(chooser.hidden, true);
    assert.match(app.element('messageCount').innerHTML, /class="metric-value">14<\/strong>/);

    app.selectFile('malformed-account.json').complete({
        chats: { list: [null, { messages: [null] }] }, left_chats: { list: false },
    });
    assert.equal(chooser.hidden, true);
    assert.equal(app.element('.stats-container').style.display, 'block');
    assert.equal(app.element('reportKind').textContent, 'Демо-отчёт');
    assert.equal(app.element('fileError').hidden, false);
    assert.deepEqual(app.alerts, []);
});

test('restores the same month and exports after malformed or unreadable replacements', async () => {
    const app = createAnalyzer();
    const monthExport = app.element('exportMonthlyParticipants');
    const overallExport = app.element('exportParticipants');
    app.selectFile('saved.json').complete({
        name: 'Saved chat',
        messages: [
            { id: 1, from: 'Alice', date: '2026-10-10T12:00:00', text: 'First' },
            { id: 2, from: 'Bob', date: '2026-11-10T12:00:00', text: 'Second' },
        ],
    });
    app.monthlyTab.click();
    app.element('prevMonth').click();
    const previousChart = app.charts.get('dailyActivityChart');
    const previousMonth = app.element('currentMonth').textContent;

    const stale = app.selectFile('stale.json');
    const malformed = app.selectFile('<test>.json');
    assert.equal(app.element('dropFileName').textContent, 'saved.json');
    assert.equal(app.element('.stats-container').style.display, 'none');
    assert.equal(monthExport.disabled, true);
    assert.equal(overallExport.disabled, true);
    monthExport.click();
    overallExport.click();
    assert.equal(app.downloads.length, 0);

    malformed.completeRaw('{ malformed');
    stale.complete({ name: 'Stale chat', messages: [] });
    stale.fail();
    assert.match(app.element('fileError').textContent, /<test>\.json/);
    assert.equal(app.element('reportTitle').textContent, 'Saved chat');
    assert.equal(app.element('dropFileName').textContent, 'saved.json');
    assert.equal(app.element('reportPlaceholder').hidden, true);
    assert.equal(app.element('.stats-container').style.display, 'block');
    assert.equal(app.monthlyTab.getAttribute('aria-selected'), 'true');
    assert.equal(app.element('currentMonth').textContent, previousMonth);
    assert.equal(app.charts.get('dailyActivityChart'), previousChart);
    assert.equal(app.element('loadingIndicator').style.display, 'none');
    assert.equal(app.element('jsonFile').value, '');
    assert.equal(monthExport.disabled, false);
    assert.equal(overallExport.disabled, false);

    app.selectFile('unreadable.json').fail();
    assert.match(app.element('fileError').textContent, /unreadable\.json/);
    assert.equal(app.element('reportTitle').textContent, 'Saved chat');
    assert.equal(app.element('currentMonth').textContent, previousMonth);

    app.selectFile('bad-sender.json').complete({
        messages: [{ id: 1, from: { toString: 0 }, date: '2026-11-01T12:00:00' }],
    });
    assert.match(app.element('fileError').textContent, /bad-sender\.json/);
    assert.equal(app.element('reportTitle').textContent, 'Saved chat');
    assert.equal(app.element('.stats-container').style.display, 'block');
    assert.equal(app.element('currentMonth').textContent, previousMonth);
    assert.equal(app.charts.get('dailyActivityChart'), previousChart);
    assert.equal(monthExport.disabled, false);
    assert.equal(overallExport.disabled, false);
    monthExport.click();
    assert.equal(app.downloads[0].name, 'telegram-analyzer-2026-10-participants.csv');
    assert.match(await app.downloads[0].blob.text(), /"Alice",1,/);

    app.selectFile('replacement.json').complete({ name: 'Replacement', messages: [] });
    assert.equal(app.element('reportTitle').textContent, 'Replacement');
    assert.equal(app.element('dropFileName').textContent, 'replacement.json');
    assert.equal(app.element('fileError').hidden, true);
    assert.equal(monthExport.disabled, true);
    assert.equal(overallExport.disabled, true);
});

test('preserves an account chooser and its selection when the next export is invalid', () => {
    const app = createAnalyzer();
    const chooser = app.element('accountChatChooser');
    const select = app.element('accountChatSelect');
    const analyze = app.element('analyzeAccountChat');
    app.selectFile('account.json').complete(accountFixture().data);
    chooseAccountChat(app, '2');
    const choices = select.children;
    const placeholder = app.element('placeholderTitle').textContent;

    const invalid = app.selectFile('bad-sender.json');
    assert.equal(chooser.hidden, true);
    invalid.complete({ messages: [{ id: 1, from: 123 }] });

    assert.equal(chooser.hidden, false);
    assert.equal(select.children, choices);
    assert.equal(select.value, '2');
    assert.equal(analyze.disabled, false);
    assert.equal(app.element('dropFileName').textContent, 'account.json');
    assert.equal(app.element('placeholderTitle').textContent, placeholder);
    assert.match(app.element('fileError').textContent, /bad-sender\.json/);
    analyze.click();
    assert.match(app.element('accountChatStatus').textContent, /Покинутый чат/);
    assert.match(app.element('participantStats').innerHTML, /Gamma/);
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

test('keeps text, month navigation, language and CSV usable without a canvas context', () => {
    const deniedContexts = [
        () => null,
        () => { throw new Error('Canvas context unavailable'); },
    ];
    for (const getContext of deniedContexts) {
        const app = createAnalyzer({ search: '?view=upload' });
        // This chart follows the trend, so the fallback must dispose of partial charts.
        app.element('messageTypesChart').getContext = getContext;
        app.selectFile('chat.json').complete({ messages: [
            { id: 1, from: 'Alice', date: '2026-10-01T00:00:00', text: 'Hello there' },
            { id: 2, from: 'Bob', date: '2026-11-01T00:00:00', text: 'Reply', reply_to_message_id: 1 },
        ] });
        const stats = app.element('.stats-container');
        assert.equal(stats.style.display, 'block');
        assert.equal(stats.classList.contains('charts-unavailable'), true);
        assert.equal(app.element('chartsUnavailableNotice').hidden, false);
        assert.equal(app.element('monthlyChartLegend').hidden, true);
        assert.equal(app.charts.size, 0);

        app.monthlyTab.click();
        app.element('prevMonth').click();
        app.element('languageToggle').click();
        assert.match(app.element('currentMonth').textContent, /October/i);
        assert.match(app.element('wordCountStats').innerHTML, /Alice<\/strong>: 2 words/);
        assert.match(app.element('monthlyWordCountStats').innerHTML, /Alice<\/strong>: 2 words/);
        const mode = app.element('replyTiming');
        assert.equal(mode.disabled, false);
        mode.value = 'direct';
        mode.change({ target: mode });
        app.element('nextMonth').click();
        assert.match(app.element('currentMonth').textContent, /November/i);
        assert.equal(app.element('replyTimingHint').textContent, 'Direct replies timed · 1 of 1');
        assert.equal(app.charts.size, 0);

        app.element('exportMonthlyParticipants').click();
        app.element('exportParticipants').click();
        assert.deepEqual(app.downloads.map(({ name }) => name), [
            'telegram-analyzer-2026-11-participants.csv', 'telegram-analyzer-participants.csv',
        ]);
    }
});

test('cancels a superseded file read without disturbing the newest import', () => {
    const app = createAnalyzer();
    app.selectFile('saved.json').complete({
        name: 'Saved chat',
        messages: [{ id: 1, from: 'Alice', date: '2026-11-01T00:00:00', text: 'Hello' }],
    });
    app.monthlyTab.click();
    const older = app.selectFile('large-old.json');
    const newest = app.selectFile('newest.json');
    assert.equal(older.aborted, true);
    assert.equal(newest.aborted, false);
    assert.equal(app.element('loadingIndicator').style.display, 'flex');
    assert.equal(app.element('fileError').hidden, true);
    assert.equal(app.element('exportMonthlyParticipants').disabled, true);

    newest.abort();
    assert.equal(app.element('loadingIndicator').style.display, 'none');
    assert.match(app.element('fileError').textContent, /newest\.json/);
    assert.equal(app.element('reportTitle').textContent, 'Saved chat');
    assert.equal(app.element('dropFileName').textContent, 'saved.json');
    assert.equal(app.monthlyTab.getAttribute('aria-selected'), 'true');
    assert.equal(app.element('exportMonthlyParticipants').disabled, false);
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
    assert.equal(app.monthlyTab.getAttribute('aria-selected'), 'false');
    assert.equal(app.monthlyTab.tabIndex, -1);
    assert.equal(app.allTab.getAttribute('aria-selected'), 'true');
    assert.equal(app.allTab.tabIndex, 0);
    assert.match(app.element('messageCount').innerHTML, /class="metric-value">0<\/strong>/);

    app.selectFile('restored.json').complete({ messages });
    assert.equal(app.monthlyTab.disabled, false);
});

test('starts on the upload view only for an explicit query and lets a newer upload replace the demo', async () => {
    for (const search of ['', '?view', '?view=demo', '?view=UPLOAD', '?View=upload',
        '?view=upload&view=demo', '?view=upload&view=upload']) {
        const app = createAnalyzer({ search });
        assert.equal(app.startupDemo.file.name, 'demo-chat.json', search);
    }
    const upload = createAnalyzer({ search: '?source=profile&view=upload' });
    assert.equal(upload.startupDemo, null);
    assert.equal(upload.charts.size, 0);

    const app = createAnalyzer();
    const demo = app.startupDemo;
    assert.equal(demo.file.name, 'demo-chat.json');
    app.selectFile('newest.json').complete({
        name: 'Newest chat',
        messages: [{ id: 1, from: 'Synthetic sender', date: '2026-11-01T12:00:00', text: 'Hello' }],
    });
    await demo.complete();
    assert.equal(app.element('reportTitle').textContent, 'Newest chat');
    assert.equal(app.element('dropFileName').textContent, 'newest.json');
    assert.equal(app.charts.get('monthlyChart').data.labels.join(), '2026-11');
});

test('loads the fictional demo through normal file import and keeps the newest selection', async () => {
    const app = createAnalyzer();
    await app.startupDemo.complete();
    assert.equal(app.element('reportKind').textContent, 'Демо-отчёт');
    assert.equal(app.element('reportTitle').textContent, 'Демонстрационный чат');
    assert.match(app.element('reportMeta').textContent, /Вымышленная переписка/);
    assert.equal(app.element('reportPlaceholder').hidden, true);
    const oldUpload = app.selectFile('old.json');
    const demo = app.selectDemo();
    assert.ok(demo.file instanceof File);
    assert.equal(demo.file.name, 'demo-chat.json');
    assert.equal(demo.file.type, 'application/json');
    assert.equal(app.element('loadingIndicator').style.display, 'flex');
    assert.match(app.element('importStatus').textContent, /Загрузка и анализ/);
    await demo.complete();
    oldUpload.complete({ messages: [] });

    assert.equal(app.element('dropFileName').textContent, 'Встроенный пример');
    assert.match(app.element('importStatus').textContent, /Анализ завершён/);
    assert.match(app.element('messageCount').innerHTML, /class="metric-value">14<\/strong>/);
    assert.equal(app.charts.get('monthlyChart').data.labels.join(), '2025-01,2025-02,2025-03');
    assert.ok(app.charts.get('responseTimeChart').data.labels.length > 0);
    assert.match(app.element('mediaTypeStats').innerHTML, /Фото: 2/);
    assert.match(app.element('thresholdExceededMessagesStats').innerHTML, /Лев<\/strong>: 1/);

    app.element('exportParticipants').click();
    const csv = await app.downloads[0].blob.text();
    for (const [name, count] of [['Ника', 6], ['Лев', 4], ['Мира', 4]]) {
        assert.ok(csv.includes(`"${name}",${count},`));
    }

    const repeatedDemo = app.selectDemo();
    assert.notEqual(repeatedDemo.file, demo.file);
    assert.equal(await repeatedDemo.file.text(), await demo.file.text());
    app.selectFile('new.json').complete({ messages: [{ id: 1, from: 'Другой участник', text: 'Привет' }] });
    await repeatedDemo.complete();
    assert.equal(app.element('dropFileName').textContent, 'new.json');
    assert.match(app.element('participantStats').innerHTML, /Другой участник/);
    assert.doesNotMatch(app.element('participantStats').innerHTML, /Ника|Лев|Мира/);
    assert.deepEqual(app.alerts, []);
});

test('selects one statistics tab at a time and wraps keyboard navigation', async () => {
    const app = createAnalyzer();
    await app.selectDemo().complete();
    const press = (tab, key) => {
        let prevented = false;
        tab.keydown({ key, preventDefault() { prevented = true; } });
        assert.equal(prevented, true);
    };
    const checkSelection = (active, inactive) => {
        assert.equal(app.focusedElement, active);
        assert.equal(active.getAttribute('aria-selected'), 'true');
        assert.equal(active.tabIndex, 0);
        assert.equal(app.element(active.dataset.tab).classList.contains('active'), true);
        assert.equal(inactive.getAttribute('aria-selected'), 'false');
        assert.equal(inactive.tabIndex, -1);
        assert.equal(app.element(inactive.dataset.tab).classList.contains('active'), false);
    };
    press(app.allTab, 'ArrowLeft');
    checkSelection(app.monthlyTab, app.allTab);
    press(app.monthlyTab, 'ArrowRight');
    checkSelection(app.allTab, app.monthlyTab);
    press(app.allTab, 'End');
    checkSelection(app.monthlyTab, app.allTab);
    press(app.monthlyTab, 'Home');
    checkSelection(app.allTab, app.monthlyTab);

    app.selectFile('empty.json').complete({ messages: [] });
    press(app.allTab, 'ArrowRight');
    checkSelection(app.allTab, app.monthlyTab);
});

test('keeps keyboard focus on an enabled month control at both ends', async () => {
    const app = createAnalyzer();
    await app.selectDemo().complete();
    app.monthlyTab.click();
    const previous = app.element('prevMonth');
    const next = app.element('nextMonth');
    previous.focus();
    previous.click();
    assert.equal(app.focusedElement, previous);
    previous.click();
    assert.equal(previous.disabled, true);
    assert.equal(app.focusedElement, next);
    assert.match(app.element('currentMonth').textContent, /январь/);
    next.click();
    assert.equal(app.focusedElement, next);
    next.click();
    assert.equal(next.disabled, true);
    assert.equal(app.focusedElement, previous);
    assert.match(app.element('currentMonth').textContent, /март/);
});

test('preserves daily activity counts across month navigation', async () => {
    const app = createAnalyzer();
    await app.selectDemo().complete();
    const daysWithMessages = () => {
        const { labels, datasets } = app.charts.get('dailyActivityChart').data;
        return Array.from(labels).flatMap((day, index) => {
            const count = datasets[0].data[index];
            return count ? [[day, count]] : [];
        });
    };
    assert.deepEqual(daysWithMessages(), [[8, 4]]);
    app.element('prevMonth').click();
    assert.deepEqual(daysWithMessages(), [[14, 4]]);
    app.element('prevMonth').click();
    assert.deepEqual(daysWithMessages(), [[10, 6]]);
    app.element('nextMonth').click();
    assert.deepEqual(daysWithMessages(), [[14, 4]]);
});

test('shows only calendar days in the selected month', () => {
    const app = createAnalyzer();
    const monthEnds = ['2024-02-29', '2025-02-28', '2025-04-30', '2025-12-31'];
    app.selectFile('chat.json').complete({
        messages: monthEnds.map((date, id) => ({ id, from: 'Alice', date, text: 'Hi' })),
    });

    for (const lastDay of [31, 30, 28, 29]) {
        const { labels, datasets } = app.charts.get('dailyActivityChart').data;
        assert.deepEqual(Array.from(labels), Array.from({ length: lastDay }, (_, index) => index + 1));
        assert.equal(datasets[0].data.length, lastDay);
        assert.equal(datasets[0].data.at(-1), 1);
        app.element('prevMonth').click();
    }
});

test('exposes and toggles every trend series without replacing focused legend controls', () => {
    const app = createAnalyzer();
    const messages = Array.from({ length: 20 }, (_, index) => ({
        id: index + 1,
        from: `Participant ${index + 1}`,
        date: index % 2 ? '2026-11-01T12:00:00' : '2026-10-01T12:00:00',
    }));
    messages.push({ id: 21, date: '2026-11-02T12:00:00' });
    app.selectFile('large-group.json').complete({ messages });

    const legend = app.element('monthlyChartLegend');
    const series = app.element('monthlyChartSeries');
    const chart = app.charts.get('monthlyChart');
    assert.equal(legend.hidden, false);
    assert.equal(chart.options.plugins.legend.display, false);
    assert.deepEqual(series.children.map(button => button.children[1].textContent),
        Array.from(chart.data.datasets, dataset => dataset.label));
    const unattributed = series.children.at(-1);
    assert.equal(unattributed.children[1].textContent, 'Записи без отправителя');
    assert.equal(unattributed.children[0].dataset.dashed, 'true');

    unattributed.focus();
    unattributed.click();
    assert.equal(chart.isDatasetVisible(20), false);
    assert.equal(unattributed.getAttribute('aria-pressed'), 'false');
    assert.equal(app.focusedElement, unattributed);
    app.monthlyTab.click();
    app.element('prevMonth').click();
    app.allTab.click();
    assert.equal(series.children.at(-1), unattributed);
    assert.equal(chart.isDatasetVisible(20), false);
    unattributed.click();
    assert.equal(chart.isDatasetVisible(20), true);
    assert.equal(unattributed.getAttribute('aria-pressed'), 'true');

    app.selectFile('empty.json').complete({ messages: [] });
    assert.equal(legend.hidden, true);
    assert.deepEqual(series.children, []);
});

test('bounds large trend datasets and keeps any other participant available for comparison', async () => {
    const app = createAnalyzer({ search: '?view=upload', storage: { ...russianLocale, setItem() {} } });
    const date = '2026-10-01T00:00:00';
    const names = Array.from({ length: 24 }, (_, index) => 'Guest ' + (index + 1));
    const messages = names.map((from, index) => ({ id: index + 1, from, date, text: 'X' }));
    names.slice(12).forEach(from => messages.push({ id: messages.length + 1, from, date, text: 'X' }));
    for (let index = 0; index < 3; index++) messages.push({ id: messages.length + 1, from: 'Guest 1', text: 'X' });
    messages.push({ id: messages.length + 1, date, type: 'service' });
    app.selectFile('large-group.json').complete({ messages });

    const chart = app.charts.get('monthlyChart');
    const panel = app.element('trendComparisonPanel');
    const select = app.element('trendComparison');
    const series = app.element('monthlyChartSeries');
    const labels = () => Array.from(chart.data.datasets, dataset => dataset.label);
    assert.equal(panel.hidden, false);
    assert.deepEqual(labels(), [...names.slice(12), 'Записи без отправителя']);
    assert.deepEqual(select.options.map(option => option.textContent), ['Без сравнения', ...names.slice(0, 12)]);
    assert.equal(app.element('overviewParticipantCount').textContent, '24');
    series.children[0].click();
    select.value = '2';
    select.change({ target: select });
    assert.equal(labels().at(-1), 'Guest 3');
    assert.equal(chart.data.datasets.at(-1).data[0], 1);
    assert.equal(chart.isDatasetVisible(0), false);
    assert.equal(series.children.length, 14);

    select.focus();
    const options = select.children;
    app.element('languageToggle').click();
    app.element('themeToggleBtn').click();
    assert.equal(app.focusedElement, select);
    assert.equal(select.children, options);
    assert.equal(select.value, '2');
    assert.equal(labels().at(-2), 'Records without a sender');
    assert.equal(labels().at(-1), 'Guest 3');
    assert.equal(chart.isDatasetVisible(0), false);
    assert.equal(app.charts.get('monthlyChart'), chart);

    series.children.at(-1).click();
    select.value = '1';
    select.change({ target: select });
    assert.equal(labels().at(-1), 'Guest 2');
    assert.equal(chart.isDatasetVisible(13), true);
    select.value = '';
    select.change({ target: select });
    assert.equal(series.children.length, 13);
    assert.equal(chart.isDatasetVisible(0), false);
    app.element('exportParticipants').click();
    assert.match(await app.downloads[0].blob.text(), /"Guest 1",4,1\.0/);
    app.selectFile('small-group.json').complete({ messages: messages.slice(0, 20) });
    assert.equal(panel.hidden, true);
    assert.equal(select.children.length, 0);
    assert.equal(app.charts.get('monthlyChart').data.datasets.length, 20);
    app.selectFile('undated-group.json').complete({ messages: names.map(from => ({ from, text: 'X' })) });
    assert.equal(panel.hidden, true);
    assert.equal(select.children.length, 0);
    assert.equal(app.monthlyTab.disabled, true);
    assert.equal(app.element('overviewParticipantCount').textContent, '24');
});

test('filters comparison participants by substring while preserving the selected chart series', () => {
    const app = createAnalyzer({ search: '?view=upload' });
    const names = Array.from({ length: 24 }, (_, index) => 'Guest ' + (index + 1));
    names[12] = 'North Cafe\u0301 notes';
    names[13] = 'Other Café group';
    app.selectFile('comparison-search.json').complete({ messages: names.map((from, index) => ({
        id: index + 1, from, date: '2026-10-01T00:00:00', text: 'X',
    })) });
    const chart = app.charts.get('monthlyChart');
    const series = app.element('monthlyChartSeries');
    const search = app.element('trendComparisonSearch');
    const select = app.element('trendComparison');
    const status = app.element('trendComparisonSearchStatus');
    const options = () => select.options.map(option => [option.value, option.textContent]);
    const filter = value => {
        search.value = value;
        search.input();
    };
    const choose = value => {
        select.value = value;
        select.change({ target: select });
    };

    filter('  CAFÉ  ');
    assert.deepEqual(options(), [['', 'Без сравнения'], ['0', names[12]], ['1', names[13]]]);
    assert.equal(status.textContent, 'Найдено 2 из 12');
    choose('0');
    series.children[0].click();
    search.focus();
    let updates = 0;
    chart.update = () => { updates++; };
    filter('group');
    assert.equal(updates, 0);
    assert.equal(select.value, '0');
    assert.deepEqual(options(), [['', 'Без сравнения'], ['0', names[12] + ' · текущее сравнение'], ['1', names[13]]]);
    assert.equal(chart.data.datasets.at(-1).label, names[12]);
    assert.equal(chart.isDatasetVisible(0), false);
    assert.equal(status.textContent, 'Найдено 1 из 12');

    filter('not present');
    assert.equal(updates, 0);
    assert.deepEqual(options(), [['', 'Без сравнения'], ['0', names[12] + ' · текущее сравнение']]);
    assert.equal(status.textContent, 'Подходящих участников нет · Найдено 0 из 12');
    app.element('languageToggle').click();
    assert.equal(app.focusedElement, search);
    assert.equal(search.value, 'not present');
    assert.equal(select.value, '0');
    assert.equal(options()[1][1], names[12] + ' · current comparison');
    assert.equal(status.textContent, 'No matching participants · 0 of 12 participants');

    filter('group');
    choose('1');
    assert.deepEqual(options(), [['', 'No comparison'], ['1', names[13]]]);
    assert.equal(chart.data.datasets.at(-1).label, names[13]);
    filter('');
    assert.equal(options().length, 13);
    assert.equal(select.value, '1');
    assert.equal(chart.isDatasetVisible(0), false);
    app.selectFile('new-chat.json').complete({ messages: [{ from: 'New sender' }] });
    assert.equal(search.value, '');
    assert.equal(status.textContent, '');
    assert.equal(app.element('trendComparisonPanel').hidden, true);
});

test('includes dated rows without a sender in monthly activity and totals', async () => {
    const app = createAnalyzer();
    app.selectFile('chat.json').complete({ messages: [
        { id: 1, from: 'Alice', date: '2025-04-03T10:00:00', text: 'A' },
        { id: 2, type: 'message', from: null, date: '2025-04-04T11:00:00', media_type: 'photo' },
        { id: 3, type: 'service', actor: 'Bob', date: '2025-05-02T12:00:00' },
        { id: 4, from: 'Carol', text: 'Undated' },
    ] });

    const data = id => app.charts.get(id).data.datasets[0].data;
    const monthlyExport = app.element('exportMonthlyParticipants');
    assert.match(app.element('messageCount').innerHTML, /class="metric-value">4</);
    const trend = app.charts.get('monthlyChart').data;
    assert.equal(trend.labels.join(), '2025-04,2025-05');
    assert.equal(trend.datasets.find(series => series.label === 'Записи без отправителя').data.join(), '1,1');
    app.monthlyTab.click();
    assert.match(app.element('monthlyMessageCount').innerHTML, /class="metric-value">1</);
    assert.equal(data('dailyActivityChart')[1], 1);
    assert.equal(app.element('monthlyParticipantCount').textContent, '0');
    assert.equal(monthlyExport.disabled, true);

    app.element('prevMonth').click();
    assert.match(app.element('monthlyMessageCount').innerHTML, /class="metric-value">2</);
    assert.equal(app.element('monthlyActiveDayCount').textContent, '2');
    assert.equal(data('dailyActivityChart')[3], 1);
    assert.equal(data('monthlyTimeOfDayChart')[11], 1);
    assert.equal(data('monthlyDayOfWeekChart')[5], 1);
    const types = app.charts.get('monthlyMessageTypesChart').data;
    assert.equal(data('monthlyMessageTypesChart')[types.labels.indexOf('Фото')], 1);
    assert.equal(app.element('monthlyParticipantCount').textContent, '1');
    assert.equal(monthlyExport.disabled, false);
    monthlyExport.click();
    assert.match(await app.downloads[0].blob.text(), /\r\n"Alice",1,1\.0\r\n$/);

    app.element('nextMonth').click();
    assert.equal(monthlyExport.disabled, true);
});

test('classifies Telegram photos and file attachments in both reports without exposing paths', () => {
    const app = createAnalyzer();
    const skipped = '(File not included. Change data exporting settings to download.)';
    const fields = [
        { text: 'Plain text', photo: ' ', file: '' },
        { text: 'A photo caption', photo: 'photos/fixture.jpg', width: 640, height: 480 },
        { file: 'files/fixture.pdf', mime_type: 'application/pdf' },
        { file: 'voice_messages/fixture.ogg', media_type: 'voice_message' },
        { photo: skipped },
        { file: skipped, media_type: '  ' },
    ];
    app.selectFile('attachments.json').complete({
        messages: fields.map((fields, index) => ({
            id: index + 1, type: 'message', from: 'Fixture sender', from_id: 'user1',
            date: `2026-11-01T12:00:0${index}`, text: '', ...fields,
        })),
    });

    for (const id of ['messageTypesChart', 'monthlyMessageTypesChart']) {
        const { labels, datasets } = app.charts.get(id).data;
        assert.deepEqual(Object.fromEntries(labels.map((label, index) => [label, datasets[0].data[index]])), {
            'Текст': 1, 'Фото': 2, 'Файлы': 2, 'Голосовые': 1,
        });
    }
    for (const id of ['mediaTypeStats', 'monthlyMediaTypeStats']) {
        const html = app.element(id).innerHTML;
        assert.match(html, /Fixture sender/);
        assert.match(html, /Фото: 2/);
        assert.match(html, /Файлы: 2/);
        assert.match(html, /Голосовые: 1/);
        assert.doesNotMatch(html, /fixture\.(?:jpg|pdf|ogg)|File not included|A photo caption/);
    }
});

test('classifies service and unsupported records separately from text and shared content', async () => {
    const app = createAnalyzer();
    const at = (minutes, fields) => ({
        date: '2026-10-01T00:' + minutes + ':00', ...fields,
    });
    app.selectFile('group-events.json').complete({ messages: [
        at('00', { id: 1, type: 'message', from: 'Alice', text: 'Hello' }),
        at('05', { id: 2, type: 'service', actor: 'Synthetic admin', action: 'invite_members', members: ['Synthetic member'] }),
        at('06', { id: 3, type: 'service', actor: 'Synthetic admin', action: 'edit_group_photo', photo: 'photos/group-private.jpg' }),
        at('08', { id: 4, type: 'service', from: 'Bob', photo: 'photos/legacy-private.jpg' }),
        at('10', { id: 5, type: 'message', from: 'Bob', photo: 'photos/shared-private.jpg' }),
        { id: 6, type: 'unsupported' },
        { id: 7, type: 'unsupported', from: 'Bob', file: 'files/unsupported-private.pdf' },
    ] });

    const counts = id => {
        const { labels, datasets } = app.charts.get(id).data;
        return Object.fromEntries(labels.map((label, index) => [label, datasets[0].data[index]]));
    };
    assert.deepEqual(counts('messageTypesChart'), {
        Текст: 1, 'Служебные события': 3, Фото: 1, 'Неподдерживаемые записи': 2,
    });
    assert.deepEqual(counts('monthlyMessageTypesChart'), { Текст: 1, 'Служебные события': 3, Фото: 1 });
    assert.deepEqual(counts('responseTimeChart'), { 'Alice -> Bob': 10 });
    assert.deepEqual(counts('monthlyResponseTimeChart'), { 'Alice -> Bob': 10 });
    assert.match(app.element('messageCount').innerHTML, /class="metric-value">7</);
    assert.match(app.element('monthlyMessageCount').innerHTML, /class="metric-value">5</);
    app.element('languageToggle').click();
    assert.deepEqual(counts('messageTypesChart'), { Text: 1, 'Service events': 3, Photos: 1, 'Unsupported records': 2 });
    assert.deepEqual(counts('monthlyMessageTypesChart'), { Text: 1, 'Service events': 3, Photos: 1 });
    for (const id of ['mediaTypeStats', 'monthlyMediaTypeStats']) {
        const html = app.element(id).innerHTML;
        assert.match(html, /Bob/);
        assert.match(html, /Photos: 1/);
        assert.doesNotMatch(html, /Synthetic admin|Synthetic member|private\.(?:jpg|pdf)|Service events|Unsupported records|Files/);
    }
    app.element('exportParticipants').click();
    app.element('exportMonthlyParticipants').click();
    const header = 'Участник,Сообщения,Средняя длина сообщения\r\n"Alice",1,5.0\r\n';
    const [overall, month] = app.downloads;
    assert.equal(await overall.blob.text(), header + '"Bob",3,0.0\r\n');
    assert.equal(await month.blob.text(), header + '"Bob",2,0.0\r\n');
});

test('counts embedded rich media once per message without exposing attachment data', async () => {
    const app = createAnalyzer();
    const empty = { type: 'empty' };
    const caption = { text: empty, credit: empty };
    const photo = { type: 'photo', photo_id: '123', photo_skip_reason: 'file_type', caption };
    const withRich = (...blocks) => ({ rich_message: { rtl: false, part: false, blocks } });
    let deep = photo;
    for (let depth = 0; depth < 70; depth++) deep = { type: 'cover', block: deep };
    const fields = [
        { text: 'Plain message' },
        withRich({ type: 'paragraph', text: { type: 'plain', text: 'Formatted words' } }),
        withRich({ ...photo, caption: { text: { type: 'plain', text: 'Photo caption' }, credit: empty } }),
        withRich({ type: 'slideshow', items: [photo, {
            type: 'video', document_id: '456', file: 'video_files/private.mp4', caption,
        }], caption }),
        withRich({ type: 'cover', block: photo }),
        withRich({ type: 'details', title: empty, blocks: [
            { type: 'audio', document_id: '789', file: 'audio_files/private.ogg', caption },
        ] }),
        withRich({ type: 'list', kind: 'unordered', items: [{ content: 'blocks', blocks: [
            { type: 'file', document_id: '999', file: 'files/private.pdf', caption },
        ] }] }),
        withRich(null, { type: 'paragraph', blocks: [photo] }),
        withRich(deep),
        { media_type: 'sticker', ...withRich(photo) },
        { photo: 'photos/private.jpg', ...withRich(photo) },
        { type: 'service', ...withRich(photo) },
    ];
    const messages = fields.map((fields, index) => ({
        id: index + 1, type: 'message', from: 'Synthetic sender', from_id: 'channel1',
        date: '2026-11-01T12:00:00', ...fields,
    }));
    messages.push({ id: 13, type: 'unsupported', ...withRich(photo) });
    app.selectFile('rich-media.json').complete({ messages });

    const counts = id => {
        const { labels, datasets } = app.charts.get(id).data;
        return Object.fromEntries(labels.map((label, index) => [label, datasets[0].data[index]]));
    };
    const monthly = { Текст: 4, 'Медиа в форматированных постах': 5, Стикеры: 1, Фото: 1, 'Служебные события': 1 };
    assert.deepEqual(counts('messageTypesChart'), { ...monthly, 'Неподдерживаемые записи': 1 });
    assert.deepEqual(counts('monthlyMessageTypesChart'), monthly);
    assert.match(app.element('wordCountStats').innerHTML, /Synthetic sender<\/strong>: 6 слов/);
    assert.match(app.element('monthlyWordCountStats').innerHTML, /Synthetic sender<\/strong>: 6 слов/);
    app.element('languageToggle').click();
    const english = { Text: 4, 'Rich media': 5, Stickers: 1, Photos: 1, 'Service events': 1 };
    assert.deepEqual(counts('messageTypesChart'), { ...english, 'Unsupported records': 1 });
    assert.deepEqual(counts('monthlyMessageTypesChart'), english);
    for (const id of ['mediaTypeStats', 'monthlyMediaTypeStats']) {
        const html = app.element(id).innerHTML;
        assert.match(html, /Rich media: 5/);
        assert.match(html, /Photos: 1/);
        assert.doesNotMatch(html, /private\.|file_type|Photo caption|Service events|Unsupported records/);
    }
    app.element('exportParticipants').click();
    app.element('exportMonthlyParticipants').click();
    for (const { blob } of app.downloads) {
        assert.match(await blob.text(), /"Synthetic sender",12,3\.4\r\n$/);
    }
});

test('classifies shared polls, contacts and locations without exposing their contents', () => {
    const app = createAnalyzer();
    const poll = { question: ['Private ', { type: 'bold', text: 'poll' }], answers: [] };
    const contact = { first_name: 'Private contact', last_name: '', phone_number: '+000000000' };
    const pin = { latitude: 12.34, longitude: -56.78 };
    const fields = [
        { text: 'Plain text' },
        { poll },
        { contact_information: contact },
        { location_information: pin },
        { place_name: 'Private venue', address: 'Fictional street', location_information: pin },
        { place_name: 'Venue without coordinates', address: 'Fictional address' },
        { poll: { question: [true, { text: 42 }] }, contact_information: 'Private malformed', location_information: null },
        { poll: [], contact_information: {}, location_information: { latitude: '12.34', longitude: -56.78 }, place_name: [] },
        { location_information: { latitude: 91, longitude: 0 }, place_name: ' ' },
        { media_type: 'sticker', poll },
        { photo: 'photos/private.jpg', contact_information: contact },
        { file: 'files/private.pdf', location_information: pin },
    ];
    app.selectFile('shared-content.json').complete({
        messages: fields.map((fields, index) => ({
            id: index + 1, type: 'message', from: 'Fixture sender', from_id: 'user1',
            date: '2026-11-01T12:00:00', text: '', ...fields,
        })),
    });

    function checkReport(expected, textLabel) {
        for (const id of ['messageTypesChart', 'monthlyMessageTypesChart']) {
            const { labels, datasets } = app.charts.get(id).data;
            assert.deepEqual(Object.fromEntries(labels.map((label, index) => [label, datasets[0].data[index]])), expected);
        }
        for (const id of ['mediaTypeStats', 'monthlyMediaTypeStats']) {
            const html = app.element(id).innerHTML;
            assert.match(html, /Fixture sender/);
            for (const [label, count] of Object.entries(expected)) {
                if (label !== textLabel) assert.ok(html.includes(`${label}: ${count}`));
            }
            assert.doesNotMatch(html, /Private|Fictional|000000000|12\.34|56\.78|private\.(?:jpg|pdf)/i);
        }
    }

    checkReport({ Текст: 4, Опросы: 1, Контакты: 1, Геопозиции: 3, Стикеры: 1, Фото: 1, Файлы: 1 }, 'Текст');
    app.element('languageToggle').click();
    checkReport({ Text: 4, Polls: 1, Contacts: 1, Locations: 3, Stickers: 1, Photos: 1, Files: 1 }, 'Text');
});

test('classifies Telegram checklists without counting or exposing checklist contents', async () => {
    const app = createAnalyzer();
    const checklist = {
        title: ['Synthetic ', { type: 'bold', text: 'checklist title' }],
        others_can_append: true,
        others_can_complete: false,
        answers: [{ id: 1, text: ['Synthetic ', { type: 'italic', text: 'checklist item' }] }],
    };
    const records = [
        { from: 'Alice', text: 'Hello Bob' },
        { from: 'Bob', todo_list: checklist, reply_to_message_id: 1 },
        { from: 'Bob', todo_list: { ...checklist, title: 'Synthetic plain checklist' }, text: 'Visible caption' },
        { from: 'Bob', todo_list: { title: [' ', { text: 42 }], answers: [] } },
        { from: 'Bob', todo_list: { title: 'Synthetic invalid checklist', answers: {} } },
        { from: 'Bob', todo_list: 'Synthetic malformed checklist' },
        { from: 'Bob', media_type: 'sticker', todo_list: checklist },
        { type: 'service', actor: 'Synthetic moderator', todo_list: checklist },
        { type: 'unsupported', todo_list: checklist },
    ];
    app.selectFile('checklists.json').complete({
        messages: records.map((record, index) => ({
            id: index + 1, type: 'message', date: `2026-11-01T12:0${index}:00`, text: '', ...record,
        })),
    });

    const chartCounts = id => {
        const { labels, datasets } = app.charts.get(id).data;
        return Object.fromEntries(labels.map((label, index) => [label, datasets[0].data[index]]));
    };
    for (const id of ['messageTypesChart', 'monthlyMessageTypesChart']) {
        assert.deepEqual(chartCounts(id), {
            Текст: 4, 'Списки задач': 2, Стикеры: 1, 'Служебные события': 1, 'Неподдерживаемые записи': 1,
        });
    }
    assert.deepEqual(chartCounts('responseTimeChart'), { 'Alice -> Bob': 1 });
    assert.deepEqual(chartCounts('monthlyResponseTimeChart'), { 'Alice -> Bob': 1 });
    const timing = app.element('replyTiming');
    timing.value = 'direct';
    timing.change();
    assert.deepEqual(chartCounts('responseTimeChart'), { 'Alice -> Bob': 1 });
    assert.match(app.element('wordCountStats').innerHTML, /Bob<\/strong>: 2 слов/);

    app.element('languageToggle').click();
    for (const id of ['messageTypesChart', 'monthlyMessageTypesChart']) {
        assert.deepEqual(chartCounts(id), {
            Text: 4, Checklists: 2, Stickers: 1, 'Service events': 1, 'Unsupported records': 1,
        });
    }
    for (const id of ['mediaTypeStats', 'monthlyMediaTypeStats']) {
        const html = app.element(id).innerHTML;
        assert.match(html, /Checklists: 2/);
        assert.doesNotMatch(html, /Synthetic|Visible caption|Service events|Unsupported records/);
    }
    app.element('exportParticipants').click();
    app.element('exportMonthlyParticipants').click();
    for (const { blob } of app.downloads) {
        assert.equal(await blob.text(), 'Участник,Сообщения,Средняя длина сообщения\r\n"Alice",1,9.0\r\n"Bob",6,2.5\r\n');
    }
});

test('counts games, invoices, giveaways and paid media without exposing their metadata', async () => {
    const app = createAnalyzer();
    const game = { game_title: 'Synthetic game title', game_link: 'https://example.com/synthetic-game' };
    const invoiceFields = { title: 'Synthetic invoice title', amount: 193170, currency: 'USD' };
    const invoice = { invoice_information: JSON.stringify(invoiceFields) };
    const start = { giveaway_information: { quantity: 4, channels: [1234567], countries: [] } };
    const result = { giveaway_results: { channel: 1234567, winners: [7654321], winners_count: 1 } };
    const paid = { paid_stars_amount: 93472 };
    const records = [
        { from: 'Alice', text: 'Ordinary text' },
        { from: 'Bob', ...game, reply_to_message_id: 1 },
        { from: 'Bob', ...invoice, text: 'Caption' },
        { from: 'Bob', invoice_information: { ...invoiceFields, amount: 2 ** 54 } },
        { from: 'Bob', ...start },
        { from: 'Bob', ...result },
        { from: 'Bob', ...paid },
        { from: 'Bob', game_title: '  ', game_description: 'Synthetic malformed game' },
        { from: 'Bob', invoice_information: JSON.stringify({ ...invoiceFields, amount: '193170' }) },
        { from: 'Bob', invoice_information: '{broken' },
        { from: 'Bob', giveaway_information: { ...start.giveaway_information, channels: null } },
        { from: 'Bob', giveaway_results: { ...result.giveaway_results, winners_count: -1 } },
        { from: 'Bob', paid_stars_amount: '93472' },
        { from: 'Bob', paid_stars_amount: 0 },
        { from: 'Bob', paid_stars_amount: 3.5 },
        { from: 'Bob', photo: 'Synthetic private path', ...paid },
        { from: 'Bob', media_type: 'sticker', ...game },
        { type: 'service', actor: 'Synthetic moderator', ...invoice },
        { type: 'unsupported', ...start },
    ];
    app.selectFile('structured-posts.json').complete({ messages: records.map((record, index) => ({
        id: index + 1, type: 'message', date: new Date(Date.UTC(2026, 10, 1, 12, index)).toISOString(),
        text: '', ...record,
    })) });

    const chartCounts = id => {
        const { labels, datasets } = app.charts.get(id).data;
        return Object.fromEntries(labels.map((label, index) => [label, datasets[0].data[index]]));
    };
    const scopes = ['messageTypesChart', 'monthlyMessageTypesChart'];
    for (const id of scopes) {
        assert.deepEqual(chartCounts(id), {
            Текст: 9, Игры: 1, Счета: 2, Розыгрыши: 2, 'Платные медиа': 1, Фото: 1, Стикеры: 1,
            'Служебные события': 1, 'Неподдерживаемые записи': 1,
        });
    }
    assert.deepEqual(chartCounts('responseTimeChart'), { 'Alice -> Bob': 1 });
    const timing = app.element('replyTiming');
    timing.value = 'direct';
    timing.change();
    assert.deepEqual(chartCounts('monthlyResponseTimeChart'), { 'Alice -> Bob': 1 });
    assert.match(app.element('wordCountStats').innerHTML, /Bob<\/strong>: 1 слов/);

    app.element('languageToggle').click();
    for (const id of scopes) {
        assert.deepEqual(chartCounts(id), {
            Text: 9, Games: 1, Invoices: 2, Giveaways: 2, 'Paid media': 1, Photos: 1, Stickers: 1,
            'Service events': 1, 'Unsupported records': 1,
        });
    }
    for (const id of ['mediaTypeStats', 'monthlyMediaTypeStats']) {
        const html = app.element(id).innerHTML;
        assert.match(html, /Games: 1.*Invoices: 2.*Giveaways: 2.*Paid media: 1/s);
        assert.doesNotMatch(html, /Synthetic|193170|93472|1234567|7654321|USD|example\.com|Caption/);
    }
    app.element('exportParticipants').click();
    app.element('exportMonthlyParticipants').click();
    for (const { blob } of app.downloads) {
        assert.equal(await blob.text(),
            'Участник,Сообщения,Средняя длина сообщения\r\n"Alice",1,13.0\r\n"Bob",16,0.4\r\n');
    }
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

test('counts graphemes across Telegram text entities in report lengths and both CSV scopes', async () => {
    const app = createAnalyzer();
    const texts = ['😀', ['e', { type: 'bold', text: '\u0301' }], '👩‍👩‍👧‍👦', 'OK'];
    app.selectFile('unicode.json').complete({ messages: texts.map((text, index) => ({
        id: index + 1,
        from: 'Alice',
        date: `2026-${index === 3 ? '11' : '10'}-10T12:00:00`,
        text,
    })) });

    assert.match(app.element('participantStats').innerHTML, /Средняя длина: 1\.3 символов/);
    app.monthlyTab.click();
    app.element('prevMonth').click();
    assert.match(app.element('monthlyParticipantStats').innerHTML, /Средняя длина: 1\.0 символов/);
    app.element('exportMonthlyParticipants').click();
    app.element('exportParticipants').click();
    const [month, overall] = app.downloads;
    assert.equal(month.name, 'telegram-analyzer-2026-10-participants.csv');
    assert.match(await month.blob.text(), /"Alice",3,1\.0\r\n$/);
    assert.equal(overall.name, 'telegram-analyzer-participants.csv');
    assert.match(await overall.blob.text(), /"Alice",4,1\.3\r\n$/);
});

test('reuses grapheme totals across monthly views, reply methods, locale changes and CSVs', async () => {
    let graphemeCalls = 0;
    class CountingSegmenter extends Intl.Segmenter {
        segment(text) {
            if (this.resolvedOptions().granularity === 'grapheme') graphemeCalls++;
            return super.segment(text);
        }
    }
    const intl = Object.assign(Object.create(Intl), { Segmenter: CountingSegmenter });
    const app = createAnalyzer({ chartsAvailable: false, intl, search: '?view=upload' });
    const formulaName = '=1+1, "fixture"';
    app.selectFile('account.json').complete({ chats: { list: [
        { name: 'First fixture', messages: [
            { id: 1, from: formulaName, date: '2026-10-01T12:00:00Z',
                text: ['e', { type: 'bold', text: '\u0301' }] },
            { id: 2, date: '2026-10-01T12:01:00Z', type: 'service' },
            { id: 3, from: 'Alice', date: '2026-11-01T12:00:00Z', reply_to_message_id: 1,
                rich_message: { blocks: [{ type: 'paragraph', text: 'A👍🏽' }] } },
            { id: 4, from: formulaName, text: 'XYZ' },
        ] },
        { name: 'Second fixture', messages: [
            { id: 1, from: formulaName, date: '2026-11-01T12:00:00Z', text: 'Different' },
        ] },
    ] } });
    const analyze = app.element('analyzeAccountChat');
    const monthExport = app.element('exportMonthlyParticipants');
    chooseAccountChat(app, '0');
    analyze.click();
    const initialCalls = graphemeCalls;
    app.monthlyTab.click();
    monthExport.click();
    app.element('languageToggle').click();
    const mode = app.element('replyTiming');
    mode.value = 'direct';
    mode.change({ target: mode });
    monthExport.click();
    app.element('prevMonth').click();
    assert.match(app.element('monthlyMessageCount').innerHTML, />2<\/strong>/);
    monthExport.click();
    app.element('exportParticipants').click();
    assert.equal(graphemeCalls, initialCalls, 'views and downloads should use the stored totals');
    assert.equal(initialCalls, 3, 'each attributed message should be segmented once');

    chooseAccountChat(app, '1');
    analyze.click();
    monthExport.click();
    assert.equal(graphemeCalls, 4);
    const header = '\uFEFFУчастник,Сообщения,Средняя длина сообщения\r\n';
    const csvName = '"\'=1+1, ""fixture"""';
    const reports = await Promise.all(app.downloads.map(async ({ name, blob }) =>
        [name, Buffer.from(await blob.arrayBuffer()).toString('utf8')]));
    assert.deepEqual(reports, [
        ['telegram-analyzer-2026-11-participants.csv', header + '"Alice",1,2.0\r\n'],
        ['telegram-analyzer-2026-11-participants.csv', header + '"Alice",1,2.0\r\n'],
        ['telegram-analyzer-2026-10-participants.csv', header + `${csvName},1,1.0\r\n`],
        ['telegram-analyzer-participants.csv', header + `${csvName},2,2.0\r\n"Alice",1,2.0\r\n`],
        ['telegram-analyzer-2026-11-participants.csv', header + `${csvName},1,9.0\r\n`],
    ]);
});

test('counts formatted Telegram Desktop rich text in both report scopes and CSVs', async () => {
    const app = createAnalyzer();
    const plain = text => ({ type: 'plain', text });
    const blocks = [
        { type: 'heading', level: 1, text: plain('Hello') },
        { type: 'paragraph', text: { type: 'concat', text: [
            { type: 'bold', text: plain('Wor') },
            plain('ld'),
            { type: 'url', href: 'https://example.com/private', text: plain(' again') },
        ] } },
        { type: 'list', kind: 'unordered', items: [
            { content: 'text', text: plain('One') },
            { content: 'blocks', blocks: [{ type: 'paragraph', text: plain('Two') }] },
        ] },
        { type: 'table', title: plain('Numbers'), rows: [{ cells: [{ text: plain('Three') }, null] }] },
        { type: 'photo', photo: 'photos/private.jpg', caption: { text: plain('Caption'), credit: { type: 'empty' } } },
        { type: 'details', title: plain('More'), blocks: [{ type: 'paragraph', text: plain('Text') }] },
        { type: 'embed', url: 'https://example.com/private', html: '<b>ignored</b>' },
        null,
    ];
    const rich = { rtl: false, part: false, blocks };
    let tooDeep = plain('Deep');
    // Exceed the report's depth limit without exhausting the test fixture's JSON.stringify stack.
    for (let depth = 0; depth < 128; depth++) tooDeep = { type: 'bold', text: tooDeep };
    const date = '2026-10-10T12:00:00';
    const messages = [
        { id: 1, type: 'message', from: 'Rich', date, rich_message: rich },
        { id: 2, type: 'message', from: 'Legacy', date, text: 'Old text', rich_message: rich },
        { id: 3, type: 'message', from: 'Malformed', date, rich_message: { blocks: 'not an array' } },
        { id: 4, type: 'message', from: 'Deep', date, rich_message: { blocks: [{ type: 'paragraph', text: tooDeep }] } },
    ];
    app.selectFile('rich-account.json').complete({ chats: { list: [{ name: 'Synthetic rich chat', messages }] } });
    chooseAccountChat(app, '0');
    app.element('analyzeAccountChat').click();

    for (const id of ['wordCountStats', 'monthlyWordCountStats']) {
        const html = app.element(id).innerHTML;
        assert.match(html, /Rich<\/strong>: 10 слов/);
        assert.match(html, /Legacy<\/strong>: 2 слов/);
        assert.match(html, /Malformed<\/strong>: 0 слов/);
        assert.match(html, /Deep<\/strong>: 0 слов/);
    }
    const text = 'Hello\nWorld again\nOne\nTwo\nNumbers\nThree\nCaption\nMore\nText';
    const expectedLength = text.length.toFixed(1);
    for (const id of ['participantStats', 'monthlyParticipantStats']) {
        const html = app.element(id).innerHTML;
        assert.ok(html.includes('Средняя длина: ' + expectedLength + ' символов'));
        assert.doesNotMatch(html, /example\.com|private\.jpg|World again|ignored/);
    }
    app.element('exportParticipants').click();
    app.element('exportMonthlyParticipants').click();
    assert.deepEqual(app.downloads.map(({ name }) => name), [
        'telegram-analyzer-participants.csv', 'telegram-analyzer-2026-10-participants.csv',
    ]);
    const expectedCsv = 'Участник,Сообщения,Средняя длина сообщения\r\n'
        + '"Rich",1,' + expectedLength + '\r\n"Legacy",1,8.0\r\n"Malformed",1,0.0\r\n"Deep",1,0.0\r\n';
    for (const { blob } of app.downloads) assert.equal(await blob.text(), expectedCsv);
});

test('counts words in unspaced scripts and ignores standalone punctuation and emoji', async () => {
    const app = createAnalyzer();
    const date = '2026-10-10T12:00:00';
    app.selectFile('words.json').complete({ messages: [
        { id: 1, from: 'Punctuation', date, text: '… ! ?' },
        { id: 2, from: 'Emoji', date, text: '👩‍💻 1️⃣ 🇺🇳' },
        { id: 3, from: 'Chinese', date, text: ['你好', { type: 'bold', text: '世界' }] },
        { id: 4, from: 'Russian', date, text: ['При', { type: 'bold', text: 'вет' }, ', мир!'] },
        { id: 5, from: 'Russian', text: 'Без даты' },
    ] });

    const overview = app.element('wordCountStats');
    const month = app.element('monthlyWordCountStats');
    for (const report of [overview, month]) {
        assert.match(report.innerHTML, /Punctuation<\/strong>: 0 слов/);
        assert.match(report.innerHTML, /Emoji<\/strong>: 0 слов/);
        assert.match(report.innerHTML, /Chinese<\/strong>: 2 слов/);
    }
    assert.match(overview.innerHTML, /Russian<\/strong>: 4 слов/);
    assert.match(month.innerHTML, /Russian<\/strong>: 2 слов/);
    app.element('languageToggle').click();
    assert.match(overview.innerHTML, /Chinese<\/strong>: 2 words/);
    assert.match(month.innerHTML, /Emoji<\/strong>: 0 words/);

    app.element('exportMonthlyParticipants').click();
    const [{ blob }] = app.downloads;
    assert.equal(await blob.text(), 'Участник,Сообщения,Средняя длина сообщения\r\n'
        + '"Punctuation",1,5.0\r\n"Emoji",1,5.0\r\n"Chinese",1,4.0\r\n"Russian",1,12.0\r\n');
});

test('falls back to letter and number tokens when word segmentation is unavailable', () => {
    const app = createAnalyzer({ intl: { DateTimeFormat: Intl.DateTimeFormat, NumberFormat: Intl.NumberFormat } });
    const date = '2026-10-10T12:00:00';
    app.selectFile('words.json').complete({ messages: [
        { id: 1, from: 'Alice', date, text: '… 🐈 2️⃣ 你好世界 follow-up e\u0301 7' },
    ] });
    assert.match(app.element('wordCountStats').innerHTML, /Alice<\/strong>: 4 слов/);
    assert.match(app.element('monthlyWordCountStats').innerHTML, /Alice<\/strong>: 4 слов/);
});

test('falls back to Unicode code points when grapheme segmentation is unavailable', () => {
    const app = createAnalyzer({ intl: { DateTimeFormat: Intl.DateTimeFormat, NumberFormat: Intl.NumberFormat } });
    app.selectFile('unicode.json').complete({ messages: [
        { id: 1, from: 'Alice', text: '😀' },
        { id: 2, from: 'Alice', text: 'e\u0301' },
    ] });
    assert.match(app.element('participantStats').innerHTML, /Средняя длина: 1\.5 символов/);
});

test('exports the selected month and keeps the whole-chat CSV unchanged', async () => {
    const app = createAnalyzer({ chartsAvailable: false });
    const monthlyExport = app.element('exportMonthlyParticipants');
    monthlyExport.click();
    assert.equal(app.downloads.length, 0);

    const formulaName = '=1+1, "quoted"';
    app.selectFile('chat.json').complete({ messages: [
        { id: 1, from: 'Alice', date: '2026-10-15T12:00:00', text: 'A' },
        { id: 2, from: 'Alice', date: '2026-10-15T12:01:00', text: 'B' },
        { id: 3, from: 'Bob', date: '2026-10-15T12:02:00', text: 'C' },
        { id: 4, from: 'Alice', date: '2026-11-15T12:00:00', text: 'D' },
        { id: 5, from: formulaName, date: '2026-11-15T12:01:00', text: 'E' },
    ] });
    app.monthlyTab.click();
    assert.equal(monthlyExport.disabled, false);

    monthlyExport.click();
    app.element('prevMonth').click();
    monthlyExport.click();
    app.element('nextMonth').click();
    monthlyExport.click();
    app.element('exportParticipants').click();

    const header = 'Участник,Сообщения,Средняя длина сообщения\r\n';
    const formulaRow = `"'=1+1, ""quoted""",1,1.0\r\n`;
    const reports = await Promise.all(app.downloads.map(async ({ name, blob }) => [name, await blob.text()]));
    assert.deepEqual(reports, [
        ['telegram-analyzer-2026-11-participants.csv', header + '"Alice",1,1.0\r\n' + formulaRow],
        ['telegram-analyzer-2026-10-participants.csv', header + '"Alice",2,1.0\r\n"Bob",1,1.0\r\n'],
        ['telegram-analyzer-2026-11-participants.csv', header + '"Alice",1,1.0\r\n' + formulaRow],
        ['telegram-analyzer-participants.csv', header + '"Alice",3,1.0\r\n"Bob",1,1.0\r\n' + formulaRow],
    ]);

    const emptyUpload = app.selectFile('empty.json');
    assert.equal(monthlyExport.disabled, true);
    monthlyExport.click();
    emptyUpload.complete({ messages: [] });
    assert.equal(monthlyExport.disabled, true);
    monthlyExport.click();
    assert.equal(app.downloads.length, 4);
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

test('uses Unix time for reply order during a repeated DST hour', () => {
    const app = createAnalyzer();
    app.selectFile('fall-back.json').complete({ messages: [
        { id: 2, from: 'Bob', date: '2025-11-02T01:05:00', date_unixtime: 1762063500, text: 'Reply' },
        { id: 3, type: 'service', from: 'Service', date: '2025-11-02T01:00:00' },
        { id: 1, from: 'Alice', date: '2025-11-02T01:55:00', date_unixtime: '1762062900', text: 'Question' },
        { id: 4, from: 'Undated', date: null, date_unixtime: 'invalid' },
    ] });
    assert.deepEqual(app.alerts, []);
    for (const id of ['responseTimeChart', 'monthlyResponseTimeChart']) {
        const chart = app.charts.get(id);
        assert.equal(chart.data.labels.join(), 'Alice -> Bob');
        assert.equal(chart.data.datasets[0].data.join(), '10');
    }
    assert.equal(app.charts.get('monthlyChart').data.labels.join(), '2025-11');
});

test('keeps the written calendar hour through a browser DST gap', () => {
    const app = createAnalyzer();
    app.selectFile('moscow-clock.json').complete({ messages: [
        { id: 1, from: 'Alice', date: '2025-03-09T02:30:00', date_unixtime: '1741476600' },
    ] });
    assert.deepEqual(app.alerts, []);
    for (const id of ['timeOfDayChart', 'monthlyTimeOfDayChart']) {
        const counts = app.charts.get(id).data.datasets[0].data;
        assert.equal(counts[2], 1);
        assert.equal(counts[3], 0);
    }
    assert.equal(app.charts.get('dayOfWeekChart').data.datasets[0].data[0], 1);
    assert.equal(app.charts.get('dailyActivityChart').data.datasets[0].data[8], 1);
});

test('groups legacy date-only values at the written midnight', () => {
    const app = createAnalyzer();
    app.selectFile('date-only.json').complete({ messages: [
        { id: 1, from: 'Alice', date: '2025-11-01' },
        { id: 2, from: 'Invalid', date: '2025-02-30', date_unixtime: '' },
        { id: 3, from: 'Missing', date: null, date_unixtime: false },
    ] });
    assert.deepEqual(app.alerts, []);
    assert.equal(app.charts.get('monthlyChart').data.labels.join(), '2025-11');
    assert.equal(app.charts.get('timeOfDayChart').data.datasets[0].data[0], 1);
    assert.equal(app.charts.get('dayOfWeekChart').data.datasets[0].data[6], 1);
    assert.equal(app.charts.get('dailyActivityChart').data.datasets[0].data[0], 1);
});

test('uses explicit ISO offsets for elapsed time when Unix values are absent', () => {
    const app = createAnalyzer();
    app.selectFile('explicit-offsets.json').complete({ messages: [
        { id: 1, from: 'Alice', date: '2025-03-09T01:55:00-05:00' },
        { id: 2, from: 'Bob', date: '2025-03-09T03:05:00-04:00' },
    ] });
    const reply = app.charts.get('responseTimeChart').data;
    assert.equal(reply.labels.join(), 'Alice -> Bob');
    assert.equal(reply.datasets[0].data.join(), '10');
    const hours = app.charts.get('timeOfDayChart').data.datasets[0].data;
    assert.equal(hours[1], 1);
    assert.equal(hours[3], 1);
});

test('uses one civil timeline for mixed legacy rows and a UTC calendar for Unix-only rows', () => {
    const app = createAnalyzer();
    app.selectFile('mixed-clock.json').complete({ messages: [
        { id: 1, from: 'Alice', date: '2025-10-31T23:55:00', date_unixtime: '1761944100' },
        { id: 2, from: 'Bob', date: '2025-11-01T00:05:00', date_unixtime: '1761944700.0' },
        { id: 3, from: 'Unix only', date_unixtime: '1761964200' },
    ] });
    assert.deepEqual(app.alerts, []);
    const reply = app.charts.get('responseTimeChart').data;
    assert.equal(reply.labels.join(), 'Alice -> Bob');
    assert.equal(reply.datasets[0].data.join(), '10');
    assert.equal(app.charts.get('monthlyChart').data.labels.join(), '2025-10,2025-11');
    const hours = app.charts.get('timeOfDayChart').data.datasets[0].data;
    assert.equal(hours[0], 1);
    assert.equal(hours[2], 1);
    assert.equal(hours[23], 1);
});

test('uses absolute clocks for direct pairs even when adjacency needs a mixed legacy timeline', () => {
    const app = createAnalyzer({ search: '?view=upload' });
    const unix = value => String(Date.parse(value) / 1000);
    app.selectFile('direct-clocks.json').complete({ messages: [
        { id: 1, from: 'Alice', date: '2026-11-01T01:55:00', date_unixtime: unix('2026-11-01T05:55:00Z') },
        { id: 2, from: 'Bob', date: '2026-11-01T01:05:00', date_unixtime: unix('2026-11-01T06:05:00Z'), reply_to_message_id: 1 },
        { id: 3, from: 'Cara', date_unixtime: unix('2026-11-01T06:20:00Z'), reply_to_message_id: 2 },
        { id: 4, from: 'Dana', date: '2026-10-31T23:55:00-04:00' },
        { id: 5, from: 'Legacy sender', date: '2026-11-01T00:05:00', reply_to_message_id: 4 },
        { id: 10, from: 'Eve', date: '2026-11-01T01:20:00-05:00' },
        { id: 9, from: 'Earlier ID', date: '2026-11-01T06:20:00Z', reply_to_message_id: 10 },
        { id: 11, from: 'Later ID', date: '2026-11-01T00:20:00-06:00', reply_to_message_id: 10 },
        { id: 12, from: 'Wall clock only', date: '2026-11-01T02:10:00', reply_to_message_id: 3 },
    ] });

    const pairs = id => {
        const { labels, datasets } = app.charts.get(id).data;
        return Object.fromEntries(labels.map((label, index) => [label, datasets[0].data[index]]));
    };
    const adjacent = pairs('responseTimeChart');
    assert.equal(adjacent['Bob -> Eve'], 15);
    assert.equal(adjacent['Eve -> Alice'], 35);
    assert.equal(adjacent['Bob -> Cara'], undefined);
    const hint = app.element('replyTimingHint');
    assert.equal(hint.textContent, 'Замерено прямых ответов · 4 из 6');
    const mode = app.element('replyTiming');
    assert.equal(mode.disabled, false);
    mode.value = 'direct';
    mode.change({ target: mode });
    const expected = {
        'Dana -> Legacy sender': 10,
        'Eve -> Later ID': 0,
        'Alice -> Bob': 10,
        'Bob -> Cara': 15,
    };
    assert.deepEqual(pairs('responseTimeChart'), expected);
    assert.deepEqual(pairs('monthlyResponseTimeChart'), expected);
    app.monthlyTab.click();
    assert.equal(hint.textContent, 'Замерено прямых ответов · 4 из 6');
    app.element('prevMonth').click();
    assert.deepEqual(pairs('monthlyResponseTimeChart'), {});
    assert.equal(hint.textContent, 'В этой сводке нет ссылок на прямые ответы.');
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

test('chooses the latest sender name across mixed date styles without changing reply timing', async () => {
    const app = createAnalyzer();
    const unix = date => String(Date.parse(date) / 1000);
    app.selectFile('mixed-sender-names.json').complete({
        messages: [
            { id: 4, date_unixtime: unix('2026-11-01T12:00:00Z'), from: 'Current name', from_id: 'user1' },
            { id: 1, date: '2026-01-01T12:00:00', from: 'Old civil name', from_id: 'user1' },
            { id: 5, date: '2026-12-01T12:00:00', from: 'Stable name', from_id: 'user2' },
            { id: 2, date: '2026-01-01T12:10:00', from: 'Stable name', from_id: 'user2' },
            { id: 3, date_unixtime: unix('2026-07-01T12:00:00Z'), from: 'Stale Unix name', from_id: 'user2' },
            { id: 6, from: 'Undated name', from_id: 'user1' },
        ],
    });

    const summary = app.element('participantStats').innerHTML;
    assert.match(summary, /<strong>Current name<\/strong>/);
    assert.match(summary, /<strong>Stable name<\/strong>/);
    assert.doesNotMatch(summary, /Old civil name|Stale Unix name|Undated name/);
    const reply = app.charts.get('responseTimeChart').data;
    assert.equal(reply.labels.join(), 'Current name -> Stable name');
    assert.equal(reply.datasets[0].data.join(), '10');
    const activity = app.charts.get('monthlyChart').data;
    assert.equal(activity.labels.join(), '2026-01,2026-07,2026-11,2026-12');
    assert.equal(activity.datasets.map(series => series.label).join(), 'Current name,Stable name');
    assert.equal(activity.datasets[0].data.join(), '1,0,1,0');
    assert.equal(activity.datasets[1].data.join(), '1,1,0,1');

    app.element('exportParticipants').click();
    const csv = await app.downloads[0].blob.text();
    assert.match(csv, /"Current name",3,/);
    assert.match(csv, /"Stable name",3,/);
    assert.doesNotMatch(csv, /Old civil name|Stale Unix name|Undated name/);
});

test('uses exact times for a sender\'s latest alias despite an unrelated legacy date', async () => {
    const app = createAnalyzer();
    app.selectFile('sender-dst.json').complete({
        messages: [
            { id: 5, date: '2025-11-02T01:05:00', date_unixtime: '1762063500', from: 'Latest alias', from_id: 'user1' },
            { id: 3, date: '2025-11-02T01:55:00', date_unixtime: '1762062900', from: 'Old alias', from_id: 'user1' },
            { id: 4, date: '2025-11-02T01:05:00', date_unixtime: '1762063500', from: 'Earlier ID alias', from_id: 'user1' },
            { id: 6, date: '2025-11-02T01:15:00', date_unixtime: '1762064100', from: 'Responder', from_id: 'user3',
                reply_to_message_id: 5 },
            { id: 7, from: 'Undated alias', from_id: 'user1' },
            { id: 1, date: '2025-10-01T16:00:00', from: 'Unrelated legacy', from_id: 'user2' },
        ],
    });

    const trend = app.charts.get('monthlyChart').data;
    assert.equal(trend.labels.join(), '2025-10,2025-11');
    assert.equal(trend.datasets.map(series => series.label).join(), 'Unrelated legacy,Latest alias,Responder');
    assert.equal(trend.datasets[1].data.join(), '0,3');
    const summary = app.element('participantStats').innerHTML;
    assert.match(summary, /Latest alias/);
    assert.doesNotMatch(summary, /Old alias|Earlier ID alias|Undated alias/);
    const replyChart = () => {
        const { labels, datasets } = app.charts.get('responseTimeChart').data;
        return Object.fromEntries(labels.map((label, index) => [label, datasets[0].data[index]]));
    };
    assert.equal(replyChart()['Responder -> Latest alias'], 40);
    const timing = app.element('replyTiming');
    timing.value = 'direct';
    timing.change();
    assert.deepEqual(replyChart(), { 'Latest alias -> Responder': 10 });
    app.element('exportParticipants').click();
    const csv = await app.downloads[0].blob.text();
    assert.match(csv, /"Latest alias",4,0\.0\r\n/);
    assert.doesNotMatch(csv, /Old alias|Earlier ID alias|Undated alias/);
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
