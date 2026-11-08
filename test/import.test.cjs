const assert = require('node:assert/strict');
const { File } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'analyzer.js'), 'utf8');

function createAnalyzer({ chartsAvailable = true, storage = { getItem: () => null } } = {}) {
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
                style: {},
                children: [],
                append(...children) {
                    this.children.push(...children);
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
            charts.set(id, this);
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

    vm.runInNewContext(source, {
        document: {
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
                return { get innerHTML() { return this.textContent; } };
            },
            body: element('body'),
        },
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        localStorage: storage,
        Chart: chartsAvailable ? Chart : undefined,
        Blob,
        File,
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
        element, charts, alerts, downloads, allTab, monthlyTab, selectFile, selectDemo,
        startupDemo: demoImport(readers[0]),
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
    assert.deepEqual(select.children.map(option => option.value), ['', '0', '1', '2', '3']);
    const labels = select.children.slice(1).map(option => option.textContent);
    assert.match(labels[0], /^1\b.*Shared title/);
    assert.match(labels[1], /^2\b/);
    assert.ok(labels[1].includes(hostileName));
    assert.match(labels[2], /^3\b.*Shared title/);
    assert.match(labels[3], /^4\b/);
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

test('ignores malformed account groups and hides stale choosers on single or demo imports', async () => {
    const app = createAnalyzer();
    const { data } = accountFixture();
    const chooser = app.element('accountChatChooser');
    app.selectFile('left-only.json').complete({
        chats: { list: 'malformed' },
        left_chats: { list: [data.left_chats.list[0]] },
    });
    assert.equal(chooser.hidden, false);
    assert.deepEqual(app.element('accountChatSelect').children.map(option => option.value), ['', '0']);

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
