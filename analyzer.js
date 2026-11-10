document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('jsonFile');
    const demoButton = document.getElementById('loadDemoChat');
    const demoDownloadButton = document.getElementById('downloadDemoJson');
    const clearLoadedDataButton = document.getElementById('clearLoadedData');
    const accountChatChooser = document.getElementById('accountChatChooser');
    const accountChatSearchField = document.getElementById('accountChatSearchField');
    const accountChatSearch = document.getElementById('accountChatSearch');
    const accountChatSearchStatus = document.getElementById('accountChatSearchStatus');
    const accountChatSelect = document.getElementById('accountChatSelect');
    const analyzeAccountChatButton = document.getElementById('analyzeAccountChat');
    const accountChatStatus = document.getElementById('accountChatStatus');
    const statsContainer = document.querySelector('.stats-container');
    const monthlyChartLegend = document.getElementById('monthlyChartLegend');
    const monthlyChartSeries = document.getElementById('monthlyChartSeries');
    const trendComparisonPanel = document.getElementById('trendComparisonPanel');
    const trendComparisonSearch = document.getElementById('trendComparisonSearch');
    const trendComparisonSearchStatus = document.getElementById('trendComparisonSearchStatus');
    const trendComparisonSelect = document.getElementById('trendComparison');
    const currentMonthDisplay = document.getElementById('currentMonth');
    const reportMonthSelect = document.getElementById('reportMonth');
    const monthlyActivity = document.getElementById('monthlyActivity');
    const monthlyActivityRows = document.getElementById('monthlyActivityRows');
    const exportMonthlyActivityButton = document.getElementById('exportMonthlyActivity');
    const dailyActivity = document.getElementById('dailyActivity');
    const dailyActivityRows = document.getElementById('dailyActivityRows');
    const exportDailyActivityButton = document.getElementById('exportDailyActivity');
    const overviewPatterns = {
        panel: document.getElementById('overviewActivityPatterns'),
        weekdays: document.getElementById('overviewWeekdayRows'),
        hours: document.getElementById('overviewHourlyRows'),
    };
    const monthlyPatterns = {
        panel: document.getElementById('monthlyActivityPatterns'),
        weekdays: document.getElementById('monthlyWeekdayRows'),
        hours: document.getElementById('monthlyHourlyRows'),
    };
    const overviewReactions = {
        panel: document.getElementById('overviewReactionSummary'),
        exportButton: document.getElementById('exportOverviewReactions'),
        rows: document.getElementById('overviewReactionRows'),
        total: document.getElementById('overviewReactionTotal'),
    };
    const monthlyReactions = {
        panel: document.getElementById('monthlyReactionSummary'),
        exportButton: document.getElementById('exportMonthlyReactions'),
        rows: document.getElementById('monthlyReactionRows'),
        total: document.getElementById('monthlyReactionTotal'),
    };
    const allStatsTab = document.querySelector('.tab-btn[data-tab="all"]');
    const monthlyStatsTab = document.querySelector('.tab-btn[data-tab="monthly"]');
    const statsTabs = [...document.querySelectorAll('.tab-btn')];
    const exportParticipantsButton = document.getElementById('exportParticipants');
    const exportMonthlyParticipantsButton = document.getElementById('exportMonthlyParticipants');
    const prevMonthButton = document.getElementById('prevMonth');
    const nextMonthButton = document.getElementById('nextMonth');
    const replyThresholdInputs = ['ignoredThreshold', 'monthlyIgnoredThreshold'].map(id => document.getElementById(id));
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeToggleIcon = themeToggleBtn?.querySelector('i');
    const bodyElement = document.body;
    const dropZone = document.getElementById('dropZone');
    const dropFileNameElement = document.getElementById('dropFileName');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const importStatus = document.getElementById('importStatus');
    const sourceFileType = document.getElementById('sourceFileType');
    const fileError = document.getElementById('fileError');
    const reportKind = document.getElementById('reportKind');
    const reportTitle = document.getElementById('reportTitle');
    const reportMeta = document.getElementById('reportMeta');
    const reportPlaceholder = document.getElementById('reportPlaceholder');
    const placeholderTitle = document.getElementById('placeholderTitle');
    const placeholderText = document.getElementById('placeholderText');
    const replyTimingSelect = document.getElementById('replyTiming');
    const directRepliesOption = document.getElementById('directRepliesOption');
    const replyTimingHint = document.getElementById('replyTimingHint');
    const exportReplyTimingButton = document.getElementById('exportReplyTiming');
    const languageToggle = document.getElementById('languageToggle');
    const languageToggleLabel = document.getElementById('languageToggleLabel');
    const LOCALE_STORAGE_KEY = 'telegramAnalyzerLocale';
    const copy = {
        switchLanguage: ['RU · Switch to Russian', 'EN · Переключить на английский'],
        darkTheme: ['Switch to dark theme', 'Переключить на тёмную тему'],
        lightTheme: ['Switch to light theme', 'Переключить на светлую тему'],
        demoReport: ['Demo report', 'Демо-отчёт'],
        demoTitle: ['Sample chat', 'Демонстрационный чат'],
        demoSource: ['Fictional conversation', 'Вымышленная переписка'],
        demoFile: ['Built-in example', 'Встроенный пример'],
        demoData: ['Demo data', 'Демо-данные'],
        report: ['Chat report', 'Отчёт по чату'],
        emptyReportTitle: ['Chat analysis', 'Анализ переписки'],
        emptyReportMeta: ['Message and participant statistics', 'Статистика сообщений и участников'],
        emptyReportHeading: ['Choose a JSON file', 'Выберите JSON-файл'],
        emptyReportIntro: ['Open a Telegram Desktop export or explore the sample chat.',
            'Откройте экспорт из Telegram Desktop или посмотрите демо-чат.'],
        noSourceFile: ['No file selected', 'Файл не выбран'],
        sourceFileFormat: ['Telegram Desktop JSON', 'JSON из Telegram Desktop'],
        reportCleared: ['Report cleared.', 'Отчёт очищен.'],
        telegramSource: ['Telegram export', 'Экспорт Telegram'],
        accountExport: ['Account export', 'Экспорт аккаунта'],
        localFile: ['File on this device', 'Файл на устройстве'],
        savedMessages: ['Saved Messages', 'Избранное'],
        replies: ['Replies', 'Ответы'],
        verificationCodes: ['Verification Codes', 'Коды подтверждения'],
        untitledChat: ['Untitled chat', 'Чат без названия'],
        leftChat: ['Left chat', 'Покинутый чат'],
        unknownParticipant: ['Unknown participant', 'Неизвестный участник'],
        selectChat: ['Choose a chat', 'Выберите чат'],
        selectChatStatus: ['Choose a chat to see its statistics.', 'Выберите чат, чтобы увидеть его статистику.'],
        noMatchingChats: ['No matching chats', 'Подходящих чатов нет'],
        accountSearchGroup: ['Available chats', 'Доступные чаты'],
        accountSearchMatches: [
            (shown, total) => `${shown} of ${total} chats`,
            (shown, total) => `Найдено ${shown} из ${total}`,
        ],
        accountOption: [
            (name, suffix, count, number) => `${name}${suffix} · ${count} ${count === 1 ? 'message' : 'messages'} · #${number}`,
            (name, suffix, count, number) => `${name}${suffix} · ${count} сообщ. · #${number}`,
        ],
        chosenChat: [label => `Selected chat ${label}`, label => `Выбран чат ${label}`],
        selectedChat: [label => `Showing statistics for chat ${label}`, label => `Статистика открыта для чата ${label}`],
        accountInstructions: [
            'This file contains multiple chats. The report covers one conversation.',
            'В файле несколько переписок. Анализ строится по одной.',
        ],
        noChatSelected: ['No chat selected', 'Чат ещё не выбран'],
        chooseToAnalyze: [
            'Choose a conversation under Chat data, then select Analyze chat.',
            'Выберите переписку в блоке «Данные чата» и нажмите «Показать статистику».',
        ],
        accountReady: ['Account export loaded. Choose a chat to analyze.', 'Экспорт аккаунта загружен. Выберите чат для анализа.'],
        chooseToReport: [
            'The report appears after you analyze the selected conversation.',
            'Отчёт появится после анализа выбранной переписки.',
        ],
        chatFailed: ['The chat could not be opened', 'Чат не открылся'],
        tryOtherChat: ['Try another conversation in the list.', 'Попробуйте выбрать другую переписку из списка.'],
        chatFailedStatus: [
            'Could not analyze this chat. Choose another one.',
            'Не удалось проанализировать этот чат. Выберите другой.',
        ],
        import: ['Import', 'Импорт'],
        openingExport: ['Opening export', 'Открываем экспорт'],
        processingLocally: ['Reading data in the browser', 'Данные читаются в браузере'],
        preparingDemo: ['Preparing the example', 'Подготовка примера'],
        readingFile: ['Reading file', 'Чтение файла'],
        reportAfterRead: ['The report appears after the data is processed.', 'Отчёт появится после обработки данных.'],
        processing: ['Reading and analyzing data…', 'Загрузка и анализ данных...'],
        reportReady: ['Analysis complete. The report is available below.', 'Анализ завершён. Статистика доступна ниже.'],
        chooseJson: ['Choose a JSON export from Telegram Desktop.', 'Выберите JSON из Telegram Desktop.'],
        noChatHistory: [
            'No chat history found. Choose a chat or account export from Telegram Desktop.',
            'В файле нет истории чата. Выберите экспорт чата или аккаунта из Telegram Desktop.',
        ],
        reportFailed: ['Could not build a report from this export.', 'Не удалось построить отчёт по этому экспорту.'],
        invalidEncoding: [
            'The file contains invalid text encoding. Export your data again as JSON.',
            'Не удалось прочитать текст в этой кодировке. Экспортируйте данные заново в формате JSON.',
        ],
        invalidJson: [
            'Check that this file contains a valid JSON export.',
            'Проверьте, что файл содержит корректный экспорт в формате JSON.',
        ],
        fileUnreadable: ['The file could not be read. Try opening it again.', 'Файл не прочитан. Попробуйте открыть его ещё раз.'],
        fileError: [(name, message) => `“${name}” · ${message}`, (name, message) => `«${name}»: ${message}`],
        readingError: ['Read error', 'Ошибка чтения'],
        fileFailed: ['The file could not be opened', 'Файл не открылся'],
        chooseExport: ['Choose a Telegram Desktop export.', 'Выберите экспорт Telegram Desktop.'],
        reportUnavailable: ['Report unavailable', 'Отчёт недоступен'],
        tryOtherFile: ['Open another JSON file or try the demo chat.', 'Можно открыть другой JSON или вернуться к демо-чату.'],
        messages: ['Messages', 'Сообщения'],
        chartMessages: ['Messages', 'Сообщений'],
        activity: ['Activity', 'Активность'],
        unattributed: ['Records without a sender', 'Записи без отправителя'],
        noTrendComparison: ['No comparison', 'Без сравнения'],
        currentTrendComparison: [name => `${name} · current comparison`, name => `${name} · текущее сравнение`],
        noMatchingTrendParticipants: ['No matching participants', 'Подходящих участников нет'],
        trendSearchGroup: ['Available participants', 'Доступные участники'],
        trendSearchMatches: [
            (shown, total) => `${shown} of ${total} participants`,
            (shown, total) => `Найдено ${shown} из ${total}`,
        ],
        weekdays: [['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']],
        chartResponse: ['Average response time (min)', 'Среднее время ответа (мин)'],
        replyCoverage: [
            (timed, linked) => `Direct replies timed · ${timed} of ${linked}`,
            (timed, linked) => `Замерено прямых ответов · ${timed} из ${linked}`,
        ],
        noReplyLinks: [
            'No direct reply links in this view.',
            'В этой сводке нет ссылок на прямые ответы.',
        ],
        participantStats: ['Participant statistics', 'Статистика по участникам:'],
        participantResponse: ['Average response time by participant', 'Среднее время ответа по участникам:'],
        meanDelay: ['Average reply time by pair', 'Среднее время ответа по парам участников'],
        monthDelay: ['Average reply time by pair this month', 'Среднее время ответа по парам за месяц'],
        delayFor: [name => `Average response delay for ${name}`, name => `Средняя задержка ответа ${name}:`],
        totalWords: ['Total word count', 'Общее количество слов:'],
        monthWords: ['Word count', 'Количество слов:'],
        mediaUsage: ['Shared content by participant', 'Вложения и другие материалы по участникам:'],
        longResponses: [
            minutes => `Responses after more than ${minutes} min`,
            minutes => `Количество сообщений с ответом > ${minutes} мин:`,
        ],
        monthLongResponses: [
            minutes => `Responses after more than ${minutes} min this month`,
            minutes => `Сообщений с ответом > ${minutes} мин (за месяц):`,
        ],
        noData: ['No data', 'Нет данных'],
        noDelayData: ['No response delays to report.', 'Нет данных для этой статистики.'],
        noLongResponses: ['No responses exceed this threshold.', 'Нет данных для этой статистики (с учетом порога).'],
        averageLength: [length => `Average length · ${length} characters`, length => `Средняя длина: ${length} символов`],
        messageTotal: [count => `Messages · ${count}`, count => `Сообщений: ${count}`],
        wordTotal: [count => `${count} ${count === 1 ? 'word' : 'words'}`, count => `${count} слов`],
        toParticipant: ['To', 'К'],
        fromParticipant: ['From', 'От'],
        seconds: ['sec', 'сек'],
        lessThan: [value => 'Less than ' + value, value => 'Меньше ' + value],
        minutes: ['min', 'мин'],
        hours: ['hr', 'ч'],
        days: ['d', 'дн'],
    };
    const messageTypeLabels = new Map([
        ['text', ['Text', 'Текст']], ['photo', ['Photos', 'Фото']], ['video_file', ['Videos', 'Видео']],
        ['voice_message', ['Voice messages', 'Голосовые']], ['sticker', ['Stickers', 'Стикеры']],
        ['animation', ['Animations', 'Анимации']], ['audio_file', ['Audio', 'Аудио']],
        ['video_message', ['Video messages', 'Видеосообщения']], ['file', ['Files', 'Файлы']],
        ['poll', ['Polls', 'Опросы']], ['contact', ['Contacts', 'Контакты']], ['location', ['Locations', 'Геопозиции']],
        ['service', ['Service events', 'Служебные события']],
        ['unsupported', ['Unsupported records', 'Неподдерживаемые записи']],
        ['rich_media', ['Rich media', 'Медиа в форматированных постах']],
        ['todo_list', ['Checklists', 'Списки задач']],
        ['game', ['Games', 'Игры']],
        ['invoice', ['Invoices', 'Счета']],
        ['giveaway', ['Giveaways', 'Розыгрыши']],
        ['paid_media', ['Paid media', 'Платные медиа']],
    ]);
    const translatedAttributes = ['aria-label', 'title', 'placeholder'];
    const staticTranslations = [...document.querySelectorAll('[data-ru], [data-ru-aria-label], [data-ru-title], [data-ru-placeholder]')]
        .map(element => ({
            element,
            english: element.textContent,
            russian: element.getAttribute('data-ru'),
            attributes: translatedAttributes.flatMap(attribute => {
                const russian = element.getAttribute(`data-ru-${attribute}`);
                return russian == null ? [] : [{ attribute, russian, english: element.getAttribute(attribute) }];
            }),
        }));
    const localizedText = new Map();
    const chartTranslations = new WeakMap();
    const syntheticNames = new Map();
    let language = 'en';
    let countFormat;
    let replyMinutesFormat;
    let monthFormat;
    let dayFormat;
    let weekdayFormat;
    const graphemeSegmenter = typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter('ru-RU', { granularity: 'grapheme' })
        : null;
    // Keep word counts independent of the current interface language.
    const wordSegmenter = typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter('en', { granularity: 'word' })
        : null;
    const dictionaryWordScripts = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
    const wordCharacter = /[\p{L}\p{N}]/u;
    const reactionPictograph = String.raw`\p{Extended_Pictographic}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?`;
    // These three Unicode tag sequences encode England, Scotland and Wales.
    const subdivisionFlag = String.raw`\u{1F3F4}\u{E0067}\u{E0062}`
        + String.raw`(?:\u{E0065}\u{E006E}\u{E0067}|\u{E0073}\u{E0063}\u{E0074}|\u{E0077}\u{E006C}\u{E0073})\u{E007F}`;
    const reactionEmojiPattern = new RegExp(
        String.raw`^(?:[#*0-9]\uFE0F?\u20E3|\p{Regional_Indicator}{2}|${subdivisionFlag}|`
        + String.raw`${reactionPictograph}(?:\u200D${reactionPictograph})*)$`,
        'u'
    );
    // Telegram Desktop stores each exported reaction count as a uint32.
    const maximumReactionCount = 4_294_967_295;
    const reactionLabels = new Map([
        ['custom_emoji', ['Custom emoji', 'Пользовательские эмодзи']],
        ['paid', ['Paid reactions', 'Платные реакции']],
    ]);
    const richTextDepthLimit = 64;
    const THEME_STORAGE_KEY = 'telegramAnalyzerTheme';
    const DARK_THEME_KEY = 'default';
    const LIGHT_THEME_KEY = 'muted-light';
    const DARK_THEME_CLASS = 'theme-default';
    const LIGHT_THEME_CLASS = 'theme-muted-light';
    const exportDatePattern = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?)?$/i;

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const nextTheme = bodyElement.classList.contains(LIGHT_THEME_CLASS) ? DARK_THEME_KEY : LIGHT_THEME_KEY;
            applyTheme(nextTheme, { refreshCharts: true });
        });
    }

    // --- HTML Element IDs (Updated)
    const averageResponseDelayStatsElement = document.getElementById('averageResponseDelayStats'); // Renamed from averageResponseTimes
    const thresholdExceededMessagesStatsElement = document.getElementById('thresholdExceededMessagesStats'); // Renamed from ignoredMessagesStats
    const monthlyAverageResponseDelayStatsElement = document.getElementById('monthlyAverageResponseDelayStats'); // Renamed from monthlyIgnoringStats
    const monthlyThresholdExceededMessagesStatsElement = document.getElementById('monthlyThresholdExceededMessagesStats'); // Renamed from monthlyIgnoredMessagesStats

    let overallResponseStats = null;
    let replyTimingMode = 'adjacent';
    let overallParticipantTotals = new Map();
    let overviewData = null;
    let activeImport = null;
    let accountChats = [];
    let currentMonthIndex = 0;
    let monthsData = [];
    let allParticipants = new Set();
    let trendComparison = null;
    const fullTrendParticipantLimit = 20;
    const leadingTrendParticipantCount = 12;
    let ignoredMessageThreshold = 3600; // Порог игнорирования по умолчанию: 1 час (в секундах)
    let chartTheme = {
        textColor: '#e4e6ea',
        borderColor: '#2a2d31',
        gridColor: 'rgba(255, 255, 255, 0.1)'
    };
    const renderedCharts = new Map();

    initializeLanguage();
    initializeTheme();
    updateReplyTimingControls();
    if (typeof Chart === 'undefined') {
        showChartsUnavailable();
    }

    statsTabs.forEach(tab => {
        tab.addEventListener('click', () => selectStatsTab(tab));
        tab.addEventListener('keydown', event => handleStatsTabKey(tab, event));
    });

    function selectStatsTab(selected) {
        if (selected.disabled) return;
        for (const tab of statsTabs) {
            const active = tab === selected;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            document.getElementById(tab.dataset.tab).classList.toggle('active', active);
        }
        updateReplyTimingControls();
    }

    function handleStatsTabKey(tab, event) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

        const enabled = statsTabs.filter(candidate => !candidate.disabled);
        const index = enabled.indexOf(tab);
        let nextIndex;
        switch (event.key) {
            case 'ArrowLeft':
                nextIndex = (index - 1 + enabled.length) % enabled.length;
                break;
            case 'ArrowRight':
                nextIndex = (index + 1) % enabled.length;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = enabled.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        const next = enabled[nextIndex];
        selectStatsTab(next);
        next.focus();
    }

    prevMonthButton.addEventListener('click', () => selectReportMonth(currentMonthIndex - 1));
    nextMonthButton.addEventListener('click', () => selectReportMonth(currentMonthIndex + 1));
    reportMonthSelect.addEventListener('change', () => {
        selectReportMonth(monthsData.findIndex(({ month }) => month === reportMonthSelect.value));
    });
    monthlyActivity.addEventListener('toggle', refreshMonthlyActivity);
    exportMonthlyActivityButton.addEventListener('click', downloadMonthlyActivity);
    dailyActivity.addEventListener('toggle', refreshDailyActivity);
    exportDailyActivityButton.addEventListener('click', downloadDailyActivity);
    overviewPatterns.panel.addEventListener('toggle', refreshOverviewPatterns);
    monthlyPatterns.panel.addEventListener('toggle', refreshMonthlyPatterns);
    overviewReactions.panel.addEventListener('toggle', refreshOverviewReactions);
    monthlyReactions.panel.addEventListener('toggle', refreshMonthlyReactions);
    overviewReactions.exportButton.addEventListener('click', () => {
        if (allStatsTab.classList.contains('active')) downloadReactionCounts(overviewData?.reactionCounts);
    });
    monthlyReactions.exportButton.addEventListener('click', () => {
        const selected = monthsData[currentMonthIndex];
        if (selected && monthlyStatsTab.classList.contains('active')) {
            downloadReactionCounts(selected.data.reactionCounts, selected.month);
        }
    });

    function selectReportMonth(index) {
        if (!monthsData[index] || index === currentMonthIndex) return;
        currentMonthIndex = index;
        updateMonthlyStats();
    }

    replyThresholdInputs.forEach(input => input.addEventListener('change', changeReplyThreshold));

    function changeReplyThreshold({ target }) {
        const minutes = target.valueAsNumber;
        if (!Number.isSafeInteger(minutes) || minutes < 1) {
            target.value = ignoredMessageThreshold / 60;
            return;
        }
        ignoredMessageThreshold = minutes * 60;
        for (const input of replyThresholdInputs) input.value = minutes;
        if (overallResponseStats) {
            const responseTimes = selectedResponseTimes(overallResponseStats);
            displayThresholdExceededMessagesStats(calculateThresholdExceededMessages(responseTimes, ignoredMessageThreshold));
            const monthData = monthsData[currentMonthIndex];
            if (monthData) {
                displayMonthlyThresholdStats(monthData);
            }
        }
    }

    replyTimingSelect.addEventListener('change', () => {
        const mode = replyTimingSelect.value;
        if (!overallResponseStats || mode === replyTimingMode) return;
        if (mode !== 'adjacent' && (mode !== 'direct' || directRepliesOption.disabled)) return;
        replyTimingMode = mode;
        updateReplyTimingControls();
        renderOverviewStatistics();
        createResponseTimeChart(selectedResponseTimes(overallResponseStats));
        const month = monthsData[currentMonthIndex];
        if (month) {
            updateMonthlyStats({ rebuildCharts: false });
            createResponseTimeChart(selectedResponseTimes(month.data), 'monthlyResponseTimeChart');
        }
    });

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    demoButton?.addEventListener('click', loadDemoChat);
    demoDownloadButton?.addEventListener('click', () => {
        const file = createDemoFile();
        downloadBlob(file, file.name);
    });
    clearLoadedDataButton.addEventListener('click', clearLoadedData);
    accountChatSearch.addEventListener('input', refreshAccountChooser);
    accountChatSelect.addEventListener('change', () => {
        const chat = selectedAccountChat();
        analyzeAccountChatButton.disabled = !chat;
        setLocalizedText(accountChatStatus, chat
            ? () => translate('chosenChat', accountChatLabel(chat))
            : translated('selectChatStatus'));
    });
    analyzeAccountChatButton.addEventListener('click', analyzeAccountChat);
    exportParticipantsButton.addEventListener('click', () => {
        if (exportParticipantsButton.disabled) return;
        downloadParticipantSummary(overallParticipantTotals, 'telegram-analyzer-participants.csv');
    });
    exportMonthlyParticipantsButton.addEventListener('click', downloadMonthlyParticipantSummary);
    exportReplyTimingButton.addEventListener('click', downloadReplyTiming);
    monthlyChartSeries.addEventListener('focusin', event => {
        event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    trendComparisonSearch.addEventListener('input', refreshTrendComparisonOptions);
    trendComparisonSelect.addEventListener('change', () => {
        trendComparison?.select(trendComparisonSelect.value);
        refreshTrendComparisonOptions();
    });

    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, handleDragOver);
        });

        ['dragleave', 'dragend'].forEach(eventName => {
            dropZone.addEventListener(eventName, handleDragLeave);
        });

        dropZone.addEventListener('drop', handleDrop);

        // Клик по зоне тоже откроет диалог выбора файла
        dropZone.addEventListener('click', (event) => {
            const target = event.target;
            if (target === fileInput || target?.closest('label')) {
                return;
            }
            fileInput?.click();
        });
    }

    const view = new URLSearchParams(location.search).getAll('view');
    if (view.length !== 1 || view[0] !== 'upload') {
        loadDemoChat();
    }

    function translate(key, ...args) {
        const value = copy[key][language === 'ru' ? 1 : 0];
        return typeof value === 'function' ? value(...args) : value;
    }

    function translated(key, ...args) {
        return () => translate(key, ...args);
    }

    function resolveText(value) {
        return typeof value === 'function' ? value() : value;
    }

    function setLocalizedText(element, value) {
        localizedText.set(element, value);
        element.textContent = resolveText(value);
    }

    function initializeLanguage() {
        let saved;
        try {
            saved = localStorage.getItem(LOCALE_STORAGE_KEY);
        } catch {
            // The current language is still available when storage is blocked.
        }
        applyLanguage(saved === 'ru' ? 'ru' : 'en');
        if (languageToggle) {
            languageToggle.hidden = false;
            languageToggle.addEventListener('click', () => {
                applyLanguage(language === 'en' ? 'ru' : 'en');
                try {
                    localStorage.setItem(LOCALE_STORAGE_KEY, language);
                } catch {
                    // Leave the current view in the selected language.
                }
            });
        }
    }

    function applyLanguage(next) {
        language = next;
        if (document.documentElement) document.documentElement.lang = next;
        const locale = next === 'ru' ? 'ru-RU' : 'en';
        countFormat = new Intl.NumberFormat(locale);
        replyMinutesFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        monthFormat = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
        dayFormat = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
        weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });

        for (const { element, english, russian, attributes } of staticTranslations) {
            if (russian != null && !localizedText.has(element)) {
                element.textContent = next === 'ru' ? russian : english;
            }
            for (const entry of attributes) {
                const value = next === 'ru' ? entry.russian : entry.english;
                if (value == null) element.removeAttribute(entry.attribute);
                else element.setAttribute(entry.attribute, value);
            }
        }
        for (const [element, value] of localizedText) {
            element.textContent = resolveText(value);
        }
        if (dropFileNameElement && localizedText.has(dropFileNameElement)) {
            updateSelectedFileName(localizedText.get(dropFileNameElement));
        }
        if (languageToggle) {
            languageToggle.setAttribute('aria-label', translate('switchLanguage'));
            languageToggle.title = translate('switchLanguage');
        }
        if (languageToggleLabel) languageToggleLabel.textContent = next === 'ru' ? 'EN' : 'RU';
        updateThemeToggleState(bodyElement.classList.contains(LIGHT_THEME_CLASS) ? LIGHT_THEME_KEY : DARK_THEME_KEY);
        refreshAccountChooser();
        refreshTrendComparisonOptions();
        refreshReportMonthOptions();
        refreshMonthlyActivity();
        refreshReportLanguage();
    }

    function mediaLabel(type) {
        return messageTypeLabels.get(type)?.[language === 'ru' ? 1 : 0] ?? type;
    }

    function participantLabel(name) {
        return language === 'en' ? syntheticNames.get(name) ?? name : name;
    }

    function handleFileSelect(event) {
        const file = event.target.files?.[0];
        if (!file) {
            console.warn('Файл не выбран.');
            return;
        }

        processSelectedFile(file);
    }

    function loadDemoChat() {
        processSelectedFile(createDemoFile(), { isDemo: true });
    }

    function createDemoFile() {
        const people = ['Ника', 'Лев', 'Мира'];
        const rows = [
            ['2025-01-10T09:30:00', 0, 'Как будет выглядеть маяк на нашей карте?'],
            ['2025-01-10T09:42:00', 1, 'Предлагаю белую башню с красной крышей.'],
            ['2025-01-10T10:05:00', 2, 'Вот черновой эскиз башни.', 'photo'],
            ['2025-01-10T10:09:00', 0, 'Оставим крупные окна. Так свет будет заметнее.'],
            ['2025-01-10T11:30:00', 1, 'Записал звуки волн для берега.', 'voice_message'],
            ['2025-01-10T11:35:00', 0, 'Возьмём этот звук для вечерней сцены.'],
            ['2025-02-14T13:10:00', 0, 'Проверим карту. Откуда лучше начинать прогулку?'],
            ['2025-02-14T13:12:00', 2, ['Я бы начала с ', { type: 'bold', text: 'берега' }, '.']],
            ['2025-02-14T13:25:00', 1, 'Снял короткое видео маршрута.', 'video_file'],
            ['2025-02-14T13:31:00', 2, 'Добавлю указатель возле причала.'],
            ['2025-03-08T16:00:00', 2, 'Готов итоговый экран. Вот снимок.', 'photo'],
            ['2025-03-08T16:18:00', 0, 'Проверю кнопки на маленьком экране.'],
            ['2025-03-08T16:24:00', 1, 'Записал видео с финальной прогулкой.', 'video_file'],
            ['2025-03-08T16:27:00', 0, 'Всё работает. Маяк виден с самого причала!'],
        ];
        const directReplies = { 2: 1, 4: 2, 6: 5, 8: 7, 10: 7, 12: 11, 14: 11 };
        const reactions = {
            3: [{ type: 'emoji', emoji: '👍', count: 2 }],
            10: [{ type: 'emoji', emoji: '👍', count: 1 }],
            14: [{ type: 'emoji', emoji: '🎉', count: 2 }, { type: 'custom_emoji', count: 1 }],
        };
        const messages = rows.map(([date, person, text, mediaType], index) => ({
            id: index + 1, type: 'message', date, from: people[person],
            from_id: `user${person + 1}`, text, media_type: mediaType,
            reply_to_message_id: directReplies[index + 1], reactions: reactions[index + 1],
        }));
        const json = JSON.stringify({ name: 'Демонстрационный чат', messages }, null, 2);
        return new File([json, '\n'], 'demo-chat.json', { type: 'application/json' });
    }

    // Helper function to sanitize HTML and prevent XSS
    function sanitizeHTML(text) {
        const temp = document.createElement('div');
        temp.textContent = text;
        return temp.innerHTML;
    }

    function readMessageTiming(message) {
        const { date, date_unixtime: unix } = message;
        const seconds = typeof unix === 'string' && unix === unix.trim() && /^-?\d+$/.test(unix)
            ? Number(unix)
            : unix;
        let time = Number.isSafeInteger(seconds) && Math.abs(seconds) <= 8.64e12
            ? seconds * 1000
            : NaN;
        let wall = null;

        const text = typeof date === 'string' ? date.trim() : '';
        if (text) {
            const iso = exportDatePattern.exec(text);
            if (iso) {
                const [, day, clock = '00:00:00', zone] = iso;
                const dateTime = `${day}T${clock}`;
                // UTC getters read the written calendar fields without applying the browser's timezone.
                const written = new Date(`${dateTime}Z`);
                const offsetTime = zone ? Date.parse(dateTime + zone) : NaN;
                if (written.getUTCDate() === Number(day.slice(-2)) && (!zone || Number.isFinite(offsetTime))) {
                    wall = written;
                    if (!Number.isFinite(time)) time = offsetTime;
                }
            } else {
                const legacy = new Date(text);
                if (Number.isFinite(legacy.getTime())) {
                    wall = new Date(legacy.getTime() - legacy.getTimezoneOffset() * 60_000);
                }
            }
        } else if (typeof date === 'number' && !Number.isFinite(time)) {
            time = new Date(date).getTime();
        }

        const calendar = wall ?? (Number.isFinite(time) ? new Date(time) : null);
        if (calendar) {
            const year = calendar.getUTCFullYear();
            if (Number.isNaN(year) || year < 0 || year > 9999) {
                return { message, time: Infinity, absoluteTime: Infinity, calendar: null, hasWallClock: false };
            }
        }
        const absoluteTime = Number.isFinite(time) ? time : Infinity;
        return { message, time: absoluteTime, absoluteTime, calendar, hasWallClock: wall !== null };
    }

    function orderMessageTimings(messages) {
        let useCivilTime = false;
        const timings = messages.map(message => {
            const timing = readMessageTiming(message);
            if (!useCivilTime && timing.hasWallClock && !Number.isFinite(timing.time)
                && message.type !== 'service' && (message.from?.trim() || getSenderId(message) !== null)) {
                // Legacy messages share one civil timeline to avoid mixing timezone assumptions.
                useCivilTime = true;
            }
            return timing;
        });

        if (useCivilTime) {
            for (const timing of timings) {
                timing.time = timing.hasWallClock ? timing.calendar.getTime() : Infinity;
            }
        }
        timings.sort((a, b) => {
            const difference = a.time - b.time;
            if (difference) return difference;
            // Undated rows sort last and preserve their input order.
            if (Number.isNaN(difference)) return 0;
            return compareMessageIds(a.message, b.message);
        });
        return timings;
    }

    function compareMessageIds(first, second) {
        const firstId = numericMessageId(first.id) ?? 0;
        const secondId = numericMessageId(second.id) ?? 0;
        return firstId - secondId;
    }

    function numericMessageId(value) {
        if (typeof value === 'string' && /^-?\d+$/.test(value)) value = Number(value);
        // Telegram shifts migrated chat history into negative IDs.
        return Number.isSafeInteger(value) && value !== 0 ? value : null;
    }

    function replyLinkId(message) {
        return message.type === 'service' ? null : numericMessageId(message.reply_to_message_id);
    }

    function findReplyTargets(timings) {
        const targets = new Map();
        for (const { message } of timings) {
            const id = replyLinkId(message);
            // Telegram omits reply_to_peer_id when the original is in this chat.
            if (id !== null && message.reply_to_peer_id == null) targets.set(id, null);
        }
        if (targets.size === 0) return targets;

        for (const timing of timings) {
            const id = numericMessageId(timing.message.id);
            if (!targets.has(id)) continue;
            // A duplicate ID cannot identify the original message reliably.
            targets.set(id, targets.get(id) === null ? timing : undefined);
        }
        return targets;
    }

    function measureDirectReply(reply, targetId, targets) {
        const { message } = reply;
        if (message.reply_to_peer_id != null) return null;
        const original = targets.get(targetId);
        if (!original || !original.message.from || original.message.type === 'service'
            || original.message.from === message.from) return null;

        // A linked pair can use exact times even if adjacency uses a civil timeline.
        const useAbsolute = Number.isFinite(reply.absoluteTime) && Number.isFinite(original.absoluteTime);
        const replyTime = useAbsolute ? reply.absoluteTime : reply.time;
        const originalTime = useAbsolute ? original.absoluteTime : original.time;
        if (!Number.isFinite(replyTime) || !Number.isFinite(originalTime) || originalTime > replyTime) return null;
        if (originalTime === replyTime) {
            const responseId = numericMessageId(message.id);
            if (responseId === null || targetId >= responseId) return null;
        }
        return { sender: original.message.from, seconds: (replyTime - originalTime) / 1000 };
    }

    function getSenderId({ from_id: id }) {
        if (typeof id === 'string' && id.trim()) return id;
        // Older Telegram Desktop exports used numeric user IDs.
        return Number.isSafeInteger(id) && id > 0 ? `user${id}` : null;
    }

    function normalizeSenderNames(timings) {
        syntheticNames.clear();
        const senders = new Map();
        const idsByName = new Map();
        const actualNames = new Set();
        const nameOnly = new Set();

        for (const timing of timings) {
            const { message, time, absoluteTime, calendar } = timing;
            const id = getSenderId(message);
            const name = typeof message.from === 'string' && message.from.trim() ? message.from : null;
            if (name) actualNames.add(name);
            else if (message.from) message.from = null;
            if (!id) {
                if (name) nameOnly.add(name);
                continue;
            }

            let sender = senders.get(id);
            if (!sender) {
                sender = { name: null, nameTime: -Infinity, exactName: null, hasCivilName: false };
                senders.set(id, sender);
            }
            if (!name) continue;

            const knownId = idsByName.get(name);
            if (knownId !== id) idsByName.set(name, knownId === undefined ? id : null);

            // Mixed exports can exclude a dated row from the reply timeline.
            const nameTime = Number.isFinite(time) ? time : (calendar?.getTime() ?? -Infinity);
            if (nameTime >= sender.nameTime) {
                sender.name = name;
                sender.nameTime = nameTime;
            }
            if (Number.isFinite(absoluteTime)) {
                const previous = sender.exactName;
                if (!previous || absoluteTime > previous.absoluteTime
                    || (absoluteTime === previous.absoluteTime && compareMessageIds(message, previous.message) >= 0)) {
                    sender.exactName = timing;
                }
            } else if (calendar) {
                sender.hasCivilName = true;
            }
        }
        if (senders.size === 0) return;

        // Preserve ambiguous name-only records as their own group.
        const usedLabels = new Set([...nameOnly].filter(name => !idsByName.get(name)));
        const nextSuffixByName = new Map();
        const unnamedLabels = [];
        for (const sender of senders.values()) {
            // A legacy date elsewhere in the chat does not make this sender's exact dates ambiguous.
            if (!sender.hasCivilName && sender.exactName) sender.name = sender.exactName.message.from;
            const baseName = sender.name ?? copy.unknownParticipant[1];
            let label = baseName;
            if (usedLabels.has(label) || (!sender.name && actualNames.has(label))) {
                let suffix = nextSuffixByName.get(baseName) ?? 2;
                do {
                    label = `${baseName} (${suffix++})`;
                } while (usedLabels.has(label) || actualNames.has(label));
                nextSuffixByName.set(baseName, suffix);
            }
            sender.label = label;
            if (!sender.name) unnamedLabels.push(label);
            usedLabels.add(label);
        }

        // Localize generated labels without changing participant keys or CSV content.
        const englishBase = copy.unknownParticipant[0];
        let englishSuffix = 1;
        for (const label of unnamedLabels) {
            let englishLabel;
            do {
                englishLabel = englishSuffix === 1 ? englishBase : `${englishBase} (${englishSuffix})`;
                englishSuffix++;
            } while (usedLabels.has(englishLabel));
            syntheticNames.set(label, englishLabel);
        }

        // Existing statistics use from as their participant key and display label.
        for (const { message } of timings) {
            const id = getSenderId(message) ?? idsByName.get(message.from);
            if (id) message.from = senders.get(id).label;
        }
    }

    function getMessageText(text) {
        if (typeof text === 'string') {
            return text;
        }
        if (!Array.isArray(text)) {
            return '';
        }
        return text.map(part => {
            if (typeof part === 'string') {
                return part;
            }
            return typeof part?.text === 'string' ? part.text : '';
        }).join('');
    }

    function getReportMessageText({ text, rich_message: richMessage }) {
        if (typeof text === 'string' || Array.isArray(text)) return getMessageText(text);
        if (!Array.isArray(richMessage?.blocks)) return '';

        const paragraphs = [];
        for (const block of richMessage.blocks) appendRichBlock(block, paragraphs, 0);
        return paragraphs.join('\n');
    }

    function appendRichBlock(block, paragraphs, depth) {
        if (depth >= richTextDepthLimit || !block || typeof block !== 'object' || Array.isArray(block)) return;

        appendRichParagraph(block.text, paragraphs);
        appendRichParagraph(block.title, paragraphs);
        // These are the nested content fields used by Telegram Desktop, not arbitrary metadata.
        for (const children of [block.blocks, block.items]) {
            if (!Array.isArray(children)) continue;
            for (const child of children) appendRichBlock(child, paragraphs, depth + 1);
        }
        if (block.type === 'cover') appendRichBlock(block.block, paragraphs, depth + 1);
        if (block.type === 'table' && Array.isArray(block.rows)) {
            for (const row of block.rows) {
                if (!Array.isArray(row?.cells)) continue;
                for (const cell of row.cells) appendRichParagraph(cell?.text, paragraphs);
            }
        }
        if (block.type === 'quote') {
            appendRichParagraph(block.caption, paragraphs);
        } else {
            appendRichParagraph(block.caption?.text, paragraphs);
            appendRichParagraph(block.caption?.credit, paragraphs);
        }
    }

    function appendRichParagraph(value, paragraphs) {
        if (!value) return;
        const parts = [];
        appendRichInline(value, parts, 0);
        const text = parts.join('');
        if (text) paragraphs.push(text);
    }

    function appendRichInline(value, parts, depth) {
        if (depth >= richTextDepthLimit) return;
        if (typeof value === 'string') {
            parts.push(value);
        } else if (Array.isArray(value)) {
            for (const child of value) appendRichInline(child, parts, depth + 1);
        } else if (value && typeof value === 'object') {
            appendRichInline(value.text, parts, depth + 1);
        }
    }

    function countTextCharacters(text) {
        if (text.length < 2) return text.length;
        let count = 0;
        for (const _ of graphemeSegmenter?.segment(text) ?? text) {
            count++;
        }
        return count;
    }

    function countWords(text) {
        if (!text) return 0;
        // Digits displayed as keycap emoji do not represent a number in the text.
        if (text.includes('\u20E3')) text = text.replace(/[0-9]\uFE0F?\u20E3/g, ' ');
        const useSegmenter = wordSegmenter && dictionaryWordScripts.test(text);
        const tokens = text.match(/\S+/g) ?? [];
        let count = 0;
        for (const token of tokens) {
            if (!wordCharacter.test(token)) continue;
            if (useSegmenter && dictionaryWordScripts.test(token)) {
                for (const { isWordLike } of wordSegmenter.segment(token)) {
                    if (isWordLike) count++;
                }
            } else {
                // Preserve one count for common compounds, URLs, and other spaced terms.
                count++;
            }
        }
        return count;
    }

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim() !== '';
    }

    function hasRichMediaBlocks(blocks, depth = 0) {
        return depth < richTextDepthLimit && Array.isArray(blocks)
            && blocks.some(block => hasRichMediaBlock(block, depth));
    }

    function hasRichMediaBlock(block, depth) {
        if (depth >= richTextDepthLimit || !block || typeof block !== 'object' || Array.isArray(block)) return false;
        const nestedDepth = depth + 1;
        switch (block.type) {
            case 'photo':
            case 'video':
            case 'audio':
            case 'file':
                // The typed block survives when Telegram skips the attachment download.
                return true;
            case 'cover':
                return hasRichMediaBlock(block.block, nestedDepth);
            case 'quote':
            case 'details':
            case 'embed_post':
                return hasRichMediaBlocks(block.blocks, nestedDepth);
            case 'collage':
            case 'slideshow':
                return hasRichMediaBlocks(block.items, nestedDepth);
            case 'list':
                return Array.isArray(block.items) && block.items.some(item =>
                    item?.content === 'blocks' && hasRichMediaBlocks(item.blocks, nestedDepth));
            default:
                return false;
        }
    }

    function isInvoiceInformation(value) {
        if (typeof value === 'string') {
            // Telegram Desktop can export the invoice object inside a JSON string.
            try {
                value = JSON.parse(value);
            } catch {
                return false;
            }
        }
        return isNonEmptyString(value?.title) && isNonEmptyString(value.currency)
            && Number.isInteger(value.amount) && value.amount >= 0;
    }

    function getMessageCategory({
        type: recordType, media_type, photo, file, poll, contact_information, location_information, place_name, rich_message,
        todo_list, game_title, invoice_information, giveaway_information, giveaway_results, paid_stars_amount,
    }) {
        // Service records can carry metadata such as the new group photo.
        if (recordType === 'service' || recordType === 'unsupported') return recordType;
        const type = typeof media_type === 'string' ? media_type.trim() : '';
        if (type) return type;
        // Telegram keeps these fields even when the attachment was not downloaded.
        if (isNonEmptyString(photo)) return 'photo';
        if (isNonEmptyString(file)) return 'file';
        if (poll && getMessageText(poll.question).trim()) return 'poll';
        if (contact_information) {
            const { first_name, last_name, phone_number } = contact_information;
            if ([first_name, last_name, phone_number].some(isNonEmptyString)) return 'contact';
        }
        if (location_information) {
            const { latitude, longitude } = location_information;
            if (Number.isFinite(latitude) && Math.abs(latitude) <= 90
                && Number.isFinite(longitude) && Math.abs(longitude) <= 180) return 'location';
        }
        // Telegram can export a venue name even when its coordinates are unavailable.
        if (isNonEmptyString(place_name)) return 'location';
        if (hasRichMediaBlocks(rich_message?.blocks)) return 'rich_media';
        if (Array.isArray(todo_list?.answers) && getMessageText(todo_list.title).trim()) return 'todo_list';
        if (isNonEmptyString(game_title)) return 'game';
        if (isInvoiceInformation(invoice_information)) return 'invoice';
        const hasGiveaway = Array.isArray(giveaway_information?.channels)
            && Number.isSafeInteger(giveaway_information.quantity) && giveaway_information.quantity > 0;
        const hasGiveawayResults = Array.isArray(giveaway_results?.winners)
            && Number.isSafeInteger(giveaway_results.winners_count) && giveaway_results.winners_count >= 0;
        if (hasGiveaway || hasGiveawayResults) return 'giveaway';
        if (Number.isInteger(paid_stars_amount) && paid_stars_amount > 0) return 'paid_media';
        return 'text';
    }

    function isSharedContentCategory(type) {
        return type !== 'text' && type !== 'service' && type !== 'unsupported';
    }

    function validMessages(messages) {
        return Array.isArray(messages) && messages.every(message =>
            message && typeof message === 'object' && !Array.isArray(message)
            && (message.from === undefined || message.from === null || typeof message.from === 'string'));
    }

    function accountChatName(chat) {
        if (typeof chat.name === 'string' && chat.name.trim()) return chat.name.trim();
        switch (chat.type) {
            case 'saved_messages': return translated('savedMessages');
            case 'replies': return translated('replies');
            case 'verification_codes': return translated('verificationCodes');
            default: return translated('untitledChat');
        }
    }

    function findAccountChats(data) {
        const chats = [];
        const groups = [data?.chats?.list, data?.left_chats?.list];
        groups.forEach((list, groupIndex) => {
            if (!Array.isArray(list)) return;
            for (const chat of list) {
                if (!validMessages(chat?.messages)) continue;
                chats.push({
                    name: accountChatName(chat), number: chats.length + 1,
                    left: groupIndex === 1, messages: chat.messages,
                });
            }
        });
        return chats;
    }

    function accountChatLabel(chat) {
        const suffix = chat.left ? ' · ' + translate('leftChat') : '';
        // The native picker matches typed characters against the start of the option label.
        return translate('accountOption', resolveText(chat.name), suffix, chat.messages.length, chat.number);
    }

    function normalizeSearchText(text) {
        return text.normalize('NFC').toLowerCase().trim();
    }

    function refreshAccountChooser() {
        if (!accountChats.length) return;
        const query = normalizeSearchText(accountChatSearch.value);
        const matches = query
            ? accountChats.filter(chat => normalizeSearchText(resolveText(chat.name)).includes(query))
            : accountChats;
        const selected = accountChatSelect.value;
        const currentOptions = accountChatSelect.options;
        if (currentOptions.length !== matches.length + 1
            || matches.some((chat, index) => currentOptions[index + 1].value !== String(chat.number - 1))) {
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.disabled = true;
            // Replace the matching choices as one group, even for large account exports.
            const group = document.createElement('optgroup');
            for (const chat of matches) {
                const option = document.createElement('option');
                option.value = String(chat.number - 1);
                group.append(option);
            }
            if (matches.length) accountChatSelect.replaceChildren(placeholder, group);
            else accountChatSelect.replaceChildren(placeholder);
        }
        const options = accountChatSelect.options;
        options[0].textContent = translate(matches.length ? 'selectChat' : 'noMatchingChats');
        if (matches.length) accountChatSelect.lastElementChild.label = translate('accountSearchGroup');
        matches.forEach((chat, index) => {
            const option = options[index + 1];
            const label = accountChatLabel(chat);
            if (option.textContent !== label) option.textContent = label;
        });
        const stillSelected = matches.some(chat => String(chat.number - 1) === selected);
        accountChatSelect.value = stillSelected ? selected : '';
        accountChatSelect.disabled = matches.length === 0;
        analyzeAccountChatButton.disabled = !stillSelected;
        if (selected && !stillSelected) setLocalizedText(accountChatStatus, translated('selectChatStatus'));
        const status = translate('accountSearchMatches',
            countFormat.format(matches.length), countFormat.format(accountChats.length));
        if (accountChatSearchStatus.textContent !== status) accountChatSearchStatus.textContent = status;
    }

    function resetAccountChooser() {
        accountChats = [];
        accountChatChooser.hidden = true;
        accountChatSearchField.hidden = true;
        accountChatSearch.value = '';
        accountChatSearchStatus.textContent = '';
        accountChatSelect.replaceChildren();
        analyzeAccountChatButton.disabled = true;
        setLocalizedText(accountChatStatus, '');
    }

    function showAccountChooser(chats) {
        accountChats = chats;
        accountChatSearchField.hidden = chats.length < 2;
        refreshAccountChooser();
        accountChatChooser.hidden = false;
        setLocalizedText(accountChatStatus, translated('selectChatStatus'));
    }

    function selectedAccountChat() {
        const value = accountChatSelect.value;
        return accountChatSelect.disabled || value === '' ? undefined : accountChats[Number(value)];
    }

    function renderMessages(messages, { name, isDemo = false, preserveNames = false }) {
        const timings = orderMessageTimings(messages);
        if (preserveNames) {
            // Keep original names and sender IDs for later selection of this chat.
            for (const timing of timings) timing.message = { ...timing.message };
        }
        normalizeSenderNames(timings);
        statsContainer.style.display = 'block';
        selectStatsTab(allStatsTab);
        analyzeChat(timings);
        const meta = () => {
            const period = reportPeriod();
            const source = translate(isDemo ? 'demoSource' : 'telegramSource');
            return period ? `${source} · ${period}` : source;
        };
        setReportHeader(translated(isDemo ? 'demoReport' : 'report'), name, meta);
        reportPlaceholder.hidden = true;
    }

    function analyzeAccountChat() {
        const chat = selectedAccountChat();
        if (!chat) return;
        try {
            renderMessages(chat.messages, { name: chat.name, preserveNames: true });
            setLocalizedText(accountChatStatus, () => translate('selectedChat', accountChatLabel(chat)));
        } catch (error) {
            console.error('Ошибка анализа выбранного чата:', error);
            clearReport();
            setReportHeader(translated('accountExport'), translated('selectChat'), translated('chooseToReport'));
            setReportPlaceholder(translated('chatFailed'), translated('tryOtherChat'));
            setLocalizedText(accountChatStatus, translated('chatFailedStatus'));
        }
    }

    function reportPeriod() {
        if (!monthsData.length) return '';
        const first = new Date(`${monthsData[0].month}-01T00:00:00Z`);
        if (monthsData.length === 1) return monthFormat.format(first);
        const last = new Date(`${monthsData.at(-1).month}-01T00:00:00Z`);
        return monthFormat.formatRange?.(first, last) ?? `${monthFormat.format(first)} – ${monthFormat.format(last)}`;
    }

    function setReportHeader(kind, title, meta) {
        setLocalizedText(reportKind, kind);
        setLocalizedText(reportTitle, title);
        setLocalizedText(reportMeta, meta);
    }

    function setReportPlaceholder(title, text) {
        setLocalizedText(placeholderTitle, title);
        setLocalizedText(placeholderText, text);
        reportPlaceholder.hidden = false;
    }

    function clearReport() {
        statsContainer.style.display = 'none';
        clearRenderedCharts();
        overallResponseStats = null;
        overallParticipantTotals = new Map();
        overviewData = null;
        syntheticNames.clear();
        monthsData = [];
        currentMonthIndex = -1;
        updateReplyTimingControls();
        refreshReportMonthOptions();
        refreshMonthlyActivity();
        refreshDailyActivity();
        refreshOverviewPatterns();
        refreshMonthlyPatterns();
        refreshOverviewReactions();
        refreshMonthlyReactions();
        allParticipants = new Set();
        exportParticipantsButton.disabled = true;
        exportMonthlyParticipantsButton.disabled = true;
    }

    function clearRenderedCharts() {
        renderedCharts.forEach(chart => chart.destroy());
        renderedCharts.clear();
        renderMonthlyChartLegend();
        resetTrendComparison();
    }

    function abortActiveImport() {
        const pending = activeImport;
        activeImport = null;
        if (pending?.reader.readyState === FileReader.LOADING) pending.reader.abort();
        return pending;
    }

    function clearLoadedData() {
        abortActiveImport();
        resetAccountChooser();
        clearReport();
        selectStatsTab(allStatsTab);
        for (const element of document.querySelectorAll('.detail-grid > .stat-box, .metric-band .metric-value')) {
            element.replaceChildren();
        }
        setLocalizedText(currentMonthDisplay, '');
        setLocalizedText(replyTimingHint, '');
        updateSelectedFileName(translated('noSourceFile'));
        setLocalizedText(sourceFileType, translated('sourceFileFormat'));
        setReportHeader(translated('report'), translated('emptyReportTitle'), translated('emptyReportMeta'));
        setReportPlaceholder(translated('emptyReportHeading'), translated('emptyReportIntro'));
        showFileError('');
        hideLoadingIndicator(translated('reportCleared'));
        clearFileInput();
        clearLoadedDataButton.hidden = true;
        fileInput?.focus();
    }

    function showChartsUnavailable() {
        clearRenderedCharts();
        statsContainer.classList.add('charts-unavailable');
        document.getElementById('chartsUnavailableNotice').hidden = false;
    }

    function savedViewText(element) {
        const current = localizedText.get(element);
        if (current != null) return current;
        const original = staticTranslations.find(entry => entry.element === element);
        return original?.russian == null ? element.textContent
            : () => language === 'ru' ? original.russian : original.english;
    }

    function suspendImportView() {
        const previous = {
            reportVisible: statsContainer.style.display === 'block',
            chooserVisible: !accountChatChooser.hidden,
            overallExportDisabled: exportParticipantsButton.disabled,
            monthlyExportDisabled: exportMonthlyParticipantsButton.disabled,
            reportHeader: [reportKind, reportTitle, reportMeta].map(savedViewText),
            placeholderTitle: savedViewText(placeholderTitle),
            placeholderText: savedViewText(placeholderText),
            language,
        };
        statsContainer.style.display = 'none';
        accountChatChooser.hidden = true;
        exportParticipantsButton.disabled = true;
        exportMonthlyParticipantsButton.disabled = true;
        return previous;
    }

    function restoreImportView(previous) {
        statsContainer.style.display = previous.reportVisible ? 'block' : 'none';
        accountChatChooser.hidden = !previous.chooserVisible;
        exportParticipantsButton.disabled = previous.overallExportDisabled;
        exportMonthlyParticipantsButton.disabled = previous.monthlyExportDisabled;
        if (previous.reportVisible) {
            reportPlaceholder.hidden = true;
            if (previous.language !== language) refreshReportLanguage();
        } else {
            setReportHeader(...previous.reportHeader);
            setReportPlaceholder(previous.placeholderTitle, previous.placeholderText);
        }
    }

    function decodeImportText(buffer, mimeType = '') {
        const bytes = new Uint8Array(buffer);
        let encoding = 'utf-8';
        // The byte order mark takes precedence over the file's declared charset.
        if (bytes[0] === 0xff && bytes[1] === 0xfe) {
            encoding = 'utf-16le';
        } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
            encoding = 'utf-16be';
        } else if (!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) {
            const parameters = /;\s*([^=;\s]+)=(?:"((?:\\.|[^"\\])*)"|([^;]*))/g;
            for (const [, name, quoted, unquoted] of mimeType.matchAll(parameters)) {
                if (name.toLowerCase() !== 'charset') continue;
                encoding = quoted === undefined ? unquoted.trim() : quoted.replace(/\\(.)/g, '$1');
                break;
            }
        }

        let decoder;
        try {
            decoder = new TextDecoder(encoding, { fatal: true });
        } catch (error) {
            if (error.name !== 'RangeError') throw error;
            // FileReader also falls back to UTF-8 for unknown charset labels.
            decoder = new TextDecoder('utf-8', { fatal: true });
        }
        return decoder.decode(bytes);
    }

    function processSelectedFile(file, { isDemo = false } = {}) {
        if (!file) {
            return;
        }
        clearLoadedDataButton.hidden = false;

        if (!isJsonFile(file)) {
            const pending = abortActiveImport();
            if (pending) {
                restoreImportView(pending.previous);
                hideLoadingIndicator();
            }
            showFileError(translated('chooseJson'));
            clearFileInput();
            return;
        }

        const reader = new FileReader();
        const previousRequest = activeImport;
        const previous = previousRequest ? previousRequest.previous : suspendImportView();
        const request = { reader, previous };
        activeImport = request;
        // The old reader can fire its abort callback synchronously.
        if (previousRequest?.reader.readyState === FileReader.LOADING) {
            previousRequest.reader.abort();
        }
        const hasPrevious = previous.reportVisible || previous.chooserVisible;
        const sourceName = isDemo ? translated('demoFile') : file.name;
        const describeFailure = key => () => translate('fileError', resolveText(sourceName), translate(key));

        showFileError('');
        if (!hasPrevious) {
            setReportHeader(translated(isDemo ? 'demoReport' : 'import'), translated(isDemo ? 'demoTitle' : 'openingExport'),
                translated(isDemo ? 'demoSource' : 'processingLocally'));
        }
        setReportPlaceholder(translated(isDemo ? 'preparingDemo' : 'readingFile'), translated('reportAfterRead'));
        showLoadingIndicator();

        const finish = status => {
            activeImport = null;
            hideLoadingIndicator(status);
            clearFileInput();
        };
        const rejectImport = key => {
            if (hasPrevious) {
                restoreImportView(previous);
                showFileError(describeFailure(key));
            } else {
                updateSelectedFileName(sourceName);
                showImportFailure(describeFailure(key));
            }
        };

        reader.onload = (e) => {
            if (activeImport !== request) {
                return;
            }
            let status = '';
            let replacing = false;
            try {
                let text;
                try {
                    text = decodeImportText(e.target.result, file.type);
                } catch {
                    rejectImport('invalidEncoding');
                    return;
                }
                const data = JSON.parse(text);
                const messages = validMessages(data?.messages) ? data.messages : null;
                const chats = messages ? [] : findAccountChats(data);
                if (!messages && !chats.length) {
                    rejectImport('noChatHistory');
                    return;
                }

                replacing = true;
                updateSelectedFileName(sourceName);
                resetAccountChooser();
                clearReport();
                if (messages) {
                    setLocalizedText(sourceFileType, translated(isDemo ? 'demoData' : 'localFile'));
                    const name = typeof data.name === 'string' ? data.name.trim() : '';
                    renderMessages(messages, { name: isDemo ? translated('demoTitle') : name || file.name, isDemo });
                    status = translated('reportReady');
                } else {
                    showAccountChooser(chats);
                    setLocalizedText(sourceFileType, translated('accountExport'));
                    setReportHeader(translated('accountExport'), translated('selectChat'), translated('accountInstructions'));
                    setReportPlaceholder(translated('noChatSelected'), translated('chooseToAnalyze'));
                    status = translated('accountReady');
                }
            } catch (error) {
                if (replacing) {
                    console.error('Ошибка анализа экспорта:', error);
                    clearReport();
                    showImportFailure(describeFailure('reportFailed'));
                } else {
                    rejectImport('invalidJson');
                }
            } finally {
                finish(status);
            }
        };

        const readFailed = () => {
            if (activeImport !== request) return;
            rejectImport('fileUnreadable');
            finish();
        };
        reader.onerror = readFailed;
        reader.onabort = readFailed;

        try {
            reader.readAsArrayBuffer(file);
        } catch {
            readFailed();
        }
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!dropZone) {
            return;
        }

        dropZone.classList.add('dragover');
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    function handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        if (!dropZone) {
            return;
        }

        const relatedTarget = event.relatedTarget;
        if (relatedTarget && dropZone.contains(relatedTarget)) {
            return;
        }

        dropZone.classList.remove('dragover');
    }

    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!dropZone) {
            return;
        }

        dropZone.classList.remove('dragover');
        const files = event.dataTransfer?.files;
        if (!files?.length) {
            return;
        }

        const file = files[0];

        if (fileInput) {
            try {
                fileInput.files = files;
            } catch (assignmentError) {
                // В некоторых браузерах прямое присвоение может быть запрещено — игнорируем
            }
        }

        processSelectedFile(file);
    }

    function showLoadingIndicator() {
        loadingIndicator.style.display = 'flex';
        setLocalizedText(importStatus, translated('processing'));
    }

    function hideLoadingIndicator(status = '') {
        loadingIndicator.style.display = 'none';
        setLocalizedText(importStatus, status);
    }

    function updateSelectedFileName(fileName) {
        if (!dropFileNameElement) {
            return;
        }
        setLocalizedText(dropFileNameElement, fileName || '');
        if (dropFileNameElement.textContent) {
            dropFileNameElement.title = dropFileNameElement.textContent;
        } else {
            dropFileNameElement.removeAttribute('title');
        }
    }

    function showFileError(message) {
        setLocalizedText(fileError, message);
        fileError.hidden = !fileError.textContent;
    }

    function showImportFailure(message) {
        showFileError(message);
        setLocalizedText(sourceFileType, translated('readingError'));
        setReportHeader(translated('import'), translated('fileFailed'), translated('chooseExport'));
        setReportPlaceholder(translated('reportUnavailable'), translated('tryOtherFile'));
    }

    function clearFileInput() {
        if (fileInput) {
            fileInput.value = '';
        }
    }

    function isJsonFile(file) {
        if (!file) {
            return false;
        }

        const fileName = file.name?.toLowerCase() || '';
        if (fileName.endsWith('.json')) {
            return true;
        }

        const mimeType = file.type?.toLowerCase();
        return mimeType === 'application/json' || mimeType === 'text/json';
    }

    function initializeTheme() {
        let savedThemeKey;
        try {
            savedThemeKey = localStorage.getItem(THEME_STORAGE_KEY);
        } catch (storageError) {
            console.warn('Не удалось прочитать сохранённую тему', storageError);
        }

        applyTheme(savedThemeKey === DARK_THEME_KEY ? DARK_THEME_KEY : LIGHT_THEME_KEY, { persist: false });
    }

    function applyTheme(themeKey, { persist = true, refreshCharts = false } = {}) {
        const isLight = themeKey === LIGHT_THEME_KEY;
        bodyElement.classList.toggle(LIGHT_THEME_CLASS, isLight);
        bodyElement.classList.toggle(DARK_THEME_CLASS, !isLight);

        updateThemeToggleState(themeKey);
        updateChartDefaults();

        if (persist) {
            try {
                localStorage.setItem(THEME_STORAGE_KEY, themeKey);
            } catch (storageError) {
                console.warn('Не удалось сохранить выбранную тему', storageError);
            }
        }

        if (refreshCharts) {
            rethemeExistingCharts();
        }
    }

    function updateThemeToggleState(themeKey) {
        if (!themeToggleBtn) {
            return;
        }

        if (themeToggleIcon) {
            themeToggleIcon.classList.remove('fa-sun', 'fa-moon');
        }

        if (themeKey === LIGHT_THEME_KEY) {
            themeToggleBtn.title = translate('darkTheme');
            themeToggleBtn.setAttribute('aria-label', themeToggleBtn.title);
            if (themeToggleIcon) {
                themeToggleIcon.classList.add('fa-moon');
            }
        } else {
            themeToggleBtn.title = translate('lightTheme');
            themeToggleBtn.setAttribute('aria-label', themeToggleBtn.title);
            if (themeToggleIcon) {
                themeToggleIcon.classList.add('fa-sun');
            }
        }
    }

    function updateChartDefaults() {
        if (typeof Chart === 'undefined') {
            return;
        }

        const styles = getComputedStyle(bodyElement);
        const color = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
        const motionPreference = chartTheme.motionPreference
            ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
        if (!chartTheme.motionPreference) {
            motionPreference?.addEventListener?.('change', rethemeExistingCharts);
        }

        chartTheme = {
            textColor: color('--chart-text-color', '#aeb6c7'),
            borderColor: color('--chart-border-color', '#353c4b'),
            gridColor: color('--chart-grid-color', '#2a3040'),
            accent: color('--chart-accent', '#6e91ff'),
            fill: color('--chart-fill', 'rgba(84, 123, 255, 0.16)'),
            surface: color('--surface', '#181c25'),
            tooltipText: color('--text-color', '#eef1fa'),
            motionPreference
        };
        Chart.defaults.color = chartTheme.textColor;
        Chart.defaults.borderColor = chartTheme.borderColor;
    }

    function chartAnimation() {
        return chartTheme.motionPreference?.matches
            ? false
            : { duration: 180, easing: 'easeOutQuart' };
    }

    function rethemeExistingCharts() {
        renderedCharts.forEach(chart => {
            chart.options.animation = chartAnimation();
            chart.update('none');
        });
    }

    function analyzeChat(timings) {
        const messages = timings.map(timing => timing.message);
        allParticipants = new Set(messages.map(m => m.from).filter(name => name));

        // Подготовка данных по месяцам
        const messagesByMonth = {};
        const responseTimes = Object.create(null);
        const directResponses = Object.create(null);
        let linkedReplies = 0;
        let timedReplies = 0;
        const replyTargets = findReplyTargets(timings);
        const participantTotals = new Map();
        const reactionCounts = new Map();
        const wordCounts = Object.create(null);
        let previousMessage = null;
        timings.forEach(timing => {
            const { message: msg, calendar, time } = timing;
            const replyLink = replyLinkId(msg);
            if (replyLink !== null) linkedReplies++;
            const text = msg.from ? getReportMessageText(msg) : '';
            const words = countWords(text);
            const textLength = countTextCharacters(text);
            if (msg.from) {
                wordCounts[msg.from] = (wordCounts[msg.from] ?? 0) + words;
                addParticipantMessage(participantTotals, msg.from, textLength);
            }
            if (!calendar) {
                collectReactionCounts(msg.reactions, reactionCounts);
                return;
            }
            const year = calendar.getUTCFullYear().toString().padStart(4, '0');
            const monthNumber = (calendar.getUTCMonth() + 1).toString().padStart(2, '0');
            const monthKey = `${year}-${monthNumber}`;

            const month = messagesByMonth[monthKey] ??= {
                messageCount: 0,
                unattributedCount: 0,
                participantTotals: new Map(),
                reactionCounts: new Map(),
                messageTypes: Object.create(null),
                timeOfDay: new Array(24).fill(0),
                responseTimes: Object.create(null),
                directResponses: Object.create(null),
                linkedReplies: 0,
                timedReplies: 0,
                wordCounts: Object.create(null),
                mediaTypesStats: Object.create(null),
                dayOfWeekActivity: new Array(7).fill(0),
                dailyActivity: new Array(31).fill(0)
            };

            month.messageCount++;
            collectReactionCounts(msg.reactions, reactionCounts, month.reactionCounts);
            if (replyLink !== null) month.linkedReplies++;
            const type = getMessageCategory(msg);
            month.messageTypes[type] = (month.messageTypes[type] ?? 0) + 1;
            month.timeOfDay[calendar.getUTCHours()]++;
            month.dayOfWeekActivity[calendar.getUTCDay()]++;
            month.dailyActivity[calendar.getUTCDate() - 1]++;

            if (!msg.from) {
                month.unattributedCount++;
                if (msg.type !== 'service' && Number.isFinite(time)) previousMessage = null;
                return;
            }
            addParticipantMessage(month.participantTotals, msg.from, textLength);
            if (isSharedContentCategory(type)) {
                const mediaTypes = month.mediaTypesStats[msg.from] ??= Object.create(null);
                mediaTypes[type] = (mediaTypes[type] ?? 0) + 1;
            }

            month.wordCounts[msg.from] = (month.wordCounts[msg.from] ?? 0) + words;

            if (msg.type !== 'service' && Number.isFinite(time)) {
                if (previousMessage && previousMessage.sender !== msg.from) {
                    const { sender, time: previousTime } = previousMessage;
                    const seconds = (time - previousTime) / 1000;
                    recordResponse(responseTimes, sender, msg.from, seconds);
                    recordResponse(month.responseTimes, sender, msg.from, seconds);
                }
                previousMessage = { sender: msg.from, time };
            }
            const direct = replyLink === null ? null : measureDirectReply(timing, replyLink, replyTargets);
            if (direct) {
                recordResponse(directResponses, direct.sender, msg.from, direct.seconds);
                recordResponse(month.directResponses, direct.sender, msg.from, direct.seconds);
                timedReplies++;
                month.timedReplies++;
            }
        });

        // Сортируем месяцы
        monthsData = Object.entries(messagesByMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({ month, data }));

        // Показываем общую статистику
        overallResponseStats = { responseTimes, directResponses, linkedReplies, timedReplies };
        const hasDirectReplies = timedReplies > 0;
        directRepliesOption.disabled = !hasDirectReplies;
        replyTimingSelect.disabled = !hasDirectReplies;
        if (!hasDirectReplies) replyTimingMode = 'adjacent';
        replyTimingSelect.value = replyTimingMode;
        overallParticipantTotals = participantTotals;
        const allTimeData = calculateAllTimeStats(timings);
        overviewData = {
            messageCount: messages.length,
            words: wordCounts,
            media: calculateMediaTypeUsage(messages),
            activity: allTimeData,
            reactionCounts,
        };
        renderOverviewStatistics();
        refreshOverviewPatterns();
        refreshOverviewReactions();

        // Создаем графики общей статистики
        createMonthlyChart(monthsData);
        createResponseTimeChart(selectedResponseTimes(overallResponseStats));
        createTimeOfDayChart(allTimeData.timeOfDay);
        createMessageTypesChart(allTimeData.messageTypes);
        createDayOfWeekChart(allTimeData.dayOfWeekActivity);

        // Показываем статистику за последний месяц
        currentMonthIndex = monthsData.length - 1;
        refreshReportMonthOptions();
        refreshMonthlyActivity();
        monthlyStatsTab.disabled = monthsData.length === 0;
        if (monthlyStatsTab.disabled && monthlyStatsTab.classList.contains('active')) {
            selectStatsTab(allStatsTab);
        }
        updateMonthlyStats();
        exportParticipantsButton.disabled = overallParticipantTotals.size === 0;
    }

    function renderOverviewStatistics() {
        const responseTimes = selectedResponseTimes(overallResponseStats);
        displayGeneralStats(overviewData.messageCount, overallParticipantTotals, responseTimes);
        displayAverageResponseDelayStats(calculateAverageResponseDelay(responseTimes));
        displayWordCountStats(overviewData.words);
        displayMediaTypeStats(overviewData.media);
        displayThresholdExceededMessagesStats(calculateThresholdExceededMessages(responseTimes, ignoredMessageThreshold));
    }

    function selectedResponseTimes({ responseTimes, directResponses }) {
        return replyTimingMode === 'direct' ? directResponses : responseTimes;
    }

    function selectedReplyMonth() {
        return monthlyStatsTab.classList.contains('active') ? monthsData[currentMonthIndex] : undefined;
    }

    function updateReplyTimingControls() {
        const responseStats = selectedReplyMonth()?.data ?? overallResponseStats;
        exportReplyTimingButton.disabled = !responseStats || Object.keys(selectedResponseTimes(responseStats)).length === 0;
        if (!responseStats) return;
        const { linkedReplies, timedReplies } = responseStats;
        const hint = linkedReplies
            ? () => translate('replyCoverage', countFormat.format(timedReplies), countFormat.format(linkedReplies))
            : translated('noReplyLinks');
        setLocalizedText(replyTimingHint, hint);
    }

    function refreshReportLanguage() {
        if (!overviewData || statsContainer.style.display !== 'block') return;

        renderOverviewStatistics();
        refreshOverviewPatterns();
        refreshOverviewReactions();
        updateMonthlyStats({ rebuildCharts: false });
        for (const chart of renderedCharts.values()) {
            chartTranslations.get(chart)?.(chart.data);
            chart.options.locale = language;
            chart.update('none');
        }

        const trend = renderedCharts.get('monthlyChart');
        if (trend && monthlyChartSeries) {
            trend.data.datasets.forEach((dataset, index) => {
                const label = monthlyChartSeries.children[index]?.children[1];
                if (label) label.textContent = dataset.label;
            });
        }
    }

    function recordResponse(responseTimes, sender, responder, seconds) {
        const responses = responseTimes[sender] ??= Object.create(null);
        (responses[responder] ??= []).push(seconds);
    }

    function collectReactionCounts(reactions, whole, month) {
        if (!Array.isArray(reactions)) return;
        for (const reaction of reactions) {
            const { type, emoji, count } = reaction ?? {};
            if (!Number.isInteger(count) || count <= 0 || count > maximumReactionCount) continue;
            let key = type;
            if (type === 'emoji') {
                if (typeof emoji !== 'string' || emoji.length > 64 || !reactionEmojiPattern.test(emoji)) continue;
                key = emoji;
            } else if (!reactionLabels.has(type)) {
                continue;
            }
            const amount = BigInt(count);
            whole.set(key, (whole.get(key) ?? 0n) + amount);
            if (month) month.set(key, (month.get(key) ?? 0n) + amount);
        }
    }

    function calculateAllTimeStats(timings) {
        const timeOfDay = new Array(24).fill(0);
        const messageTypes = Object.create(null);
        const dayOfWeekActivity = new Array(7).fill(0);

        timings.forEach(({ message: msg, calendar }) => {
            if (calendar) {
                timeOfDay[calendar.getUTCHours()]++;
                dayOfWeekActivity[calendar.getUTCDay()]++;
            }

            const type = getMessageCategory(msg);
            messageTypes[type] = (messageTypes[type] || 0) + 1;
        });

        return { timeOfDay, messageTypes, dayOfWeekActivity };
    }

    function displayGeneralStats(messageCount, participantTotals, responseTimes) {
        const messageCountElement = document.getElementById('messageCount');
        const participantStatsElement = document.getElementById('participantStats');

        const responseTotals = summarizeResponsesByResponder(responseTimes);
        let avgResponseTimeHTML = `<h3><i class="fas fa-calculator" aria-hidden="true"></i> ${translate('participantResponse')}</h3><ul>`;
        for (const participant of participantTotals.keys()) {
            if (participant) {
                const sanitizedParticipant = sanitizeHTML(participantLabel(participant));
                const total = responseTotals.get(participant);
                const avgTime = total?.count ? formatTime(total.seconds / total.count) : translate('noData');
                avgResponseTimeHTML += `<li><strong>${sanitizedParticipant}</strong>: ${avgTime}</li>`;
            }
        }
        avgResponseTimeHTML += '</ul>';


        setMessageMetric(messageCountElement, messageCount);
        document.getElementById('overviewParticipantCount').textContent = countFormat.format(participantTotals.size);
        document.getElementById('overviewMonthCount').textContent = countFormat.format(monthsData.length);
        // Combine participant stats and average response time
        participantStatsElement.innerHTML = generateParticipantStatsHTML(participantTotals) + avgResponseTimeHTML;
    }

    function setMessageMetric(element, count) {
        element.innerHTML = `<span class="metric-label">${translate('messages')}</span><strong class="metric-value">${countFormat.format(count)}</strong>`;
    }

    function summarizeResponsesByResponder(responseTimes) {
        const totals = new Map();
        for (const responders of Object.values(responseTimes)) {
            for (const [participant, times] of Object.entries(responders)) {
                const total = totals.get(participant) ?? { seconds: 0, count: 0 };
                total.seconds += times.reduce((sum, seconds) => sum + seconds, 0);
                total.count += times.length;
                totals.set(participant, total);
            }
        }
        return totals;
    }

    function calculateAverageResponseDelay(responseTimes) {
        const averages = Object.create(null);
        for (const [sender, responders] of Object.entries(responseTimes)) {
            for (const [responder, times] of Object.entries(responders)) {
                const bySender = averages[responder] ??= Object.create(null);
                bySender[sender] = times.reduce((sum, seconds) => sum + seconds, 0) / times.length;
            }
        }
        return averages;
    }

    function displayAverageResponseDelayStats(avgDelayStats) {
        const title = `<i class="fas fa-hourglass-half" aria-hidden="true"></i> ${translate('meanDelay')}`;
        averageResponseDelayStatsElement.innerHTML = generateAverageResponseDelayHTML(avgDelayStats, title);
    }

    function displayWordCountStats(wordCounts) {
        const wordCountStatsElement = document.getElementById('wordCountStats');
        const title = `<i class="fas fa-font" aria-hidden="true"></i> ${translate('totalWords')}`;
        wordCountStatsElement.innerHTML = generateWordCountHTML(wordCounts, title);
    }

    function calculateMediaTypeUsage(messages) {
        const mediaTypeUsage = Object.create(null);
        allParticipants.forEach(p => mediaTypeUsage[p] = Object.create(null));
        messages.forEach(msg => {
            if (!msg.from) return;
            const type = getMessageCategory(msg);
            if (isSharedContentCategory(type)) {
                const counts = mediaTypeUsage[msg.from];
                counts[type] = (counts[type] ?? 0) + 1;
            }
        });
        return mediaTypeUsage;
    }

    function displayMediaTypeStats(mediaTypeUsage) {
        const mediaTypeStatsElement = document.getElementById('mediaTypeStats');
        const title = `<i class="fas fa-camera-retro" aria-hidden="true"></i> ${translate('mediaUsage')}`;
        mediaTypeStatsElement.innerHTML = generateMediaTypeHTML(mediaTypeUsage, title);
    }

    function calculateThresholdExceededMessages(responseTimes, thresholdSeconds) {
        const counts = Object.create(null);
        for (const [sender, responders] of Object.entries(responseTimes)) {
            const byResponder = counts[sender] = Object.create(null);
            for (const [responder, times] of Object.entries(responders)) {
                byResponder[responder] = times.filter(seconds => seconds > thresholdSeconds).length;
            }
        }
        return counts;
    }

    function displayThresholdExceededMessagesStats(thresholdMessages) {
        const title = `<i class="fas fa-eye-slash" aria-hidden="true"></i> ${translate('longResponses', ignoredMessageThreshold / 60)}`;
        thresholdExceededMessagesStatsElement.innerHTML = generateThresholdExceededMessagesHTML(thresholdMessages, title);
    }


    function formatReportMonth(month) {
        return monthFormat.format(new Date(`${month}-01T00:00:00Z`));
    }

    function refreshReportMonthOptions() {
        reportMonthSelect.replaceChildren();
        for (const { month } of monthsData) {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = formatReportMonth(month);
            reportMonthSelect.append(option);
        }
        reportMonthSelect.value = monthsData[currentMonthIndex]?.month ?? '';
        reportMonthSelect.disabled = monthsData.length < 2;
    }

    function countActiveDays({ dailyActivity }) {
        return dailyActivity.filter(Boolean).length;
    }

    function refreshMonthlyActivity() {
        monthlyActivity.hidden = monthsData.length === 0;
        exportMonthlyActivityButton.disabled = monthlyActivity.hidden;
        if (monthlyActivity.hidden) monthlyActivity.open = false;
        monthlyActivityRows.replaceChildren();
        if (!monthlyActivity.open) return;

        for (const [index, { month, data }] of monthsData.entries()) {
            const row = document.createElement('tr');
            const heading = document.createElement('th');
            heading.scope = 'row';
            const openMonth = document.createElement('button');
            openMonth.type = 'button';
            openMonth.className = 'activity-month';
            openMonth.textContent = formatReportMonth(month);
            openMonth.addEventListener('click', () => {
                selectReportMonth(index);
                selectStatsTab(monthlyStatsTab);
                monthlyStatsTab.focus();
            });
            heading.append(openMonth);
            const records = document.createElement('td');
            records.textContent = countFormat.format(data.messageCount);
            const activeDays = document.createElement('td');
            activeDays.textContent = countFormat.format(countActiveDays(data));
            row.append(heading, records, activeDays);
            monthlyActivityRows.append(row);
        }
    }

    function daysInReportMonth(month) {
        const end = new Date(`${month}-01T00:00:00Z`);
        end.setUTCMonth(end.getUTCMonth() + 1, 0);
        return end.getUTCDate();
    }

    function reportDayKey(month, day) {
        return `${month}-${String(day).padStart(2, '0')}`;
    }

    function refreshDailyActivity() {
        const monthData = monthsData[currentMonthIndex];
        dailyActivity.hidden = !monthData;
        exportDailyActivityButton.disabled = !monthData;
        if (dailyActivity.hidden) dailyActivity.open = false;
        dailyActivityRows.replaceChildren();
        if (!dailyActivity.open || !monthData) return;

        const { month, data } = monthData;
        const date = new Date(`${month}-01T00:00:00Z`);
        const days = daysInReportMonth(month);
        for (let day = 1; day <= days; day++) {
            date.setUTCDate(day);
            const row = document.createElement('tr');
            const heading = document.createElement('th');
            heading.scope = 'row';
            const time = document.createElement('time');
            time.dateTime = reportDayKey(month, day);
            time.textContent = dayFormat.format(date);
            heading.append(time);
            const records = document.createElement('td');
            records.textContent = countFormat.format(data.dailyActivity[day - 1]);
            row.append(heading, records);
            dailyActivityRows.append(row);
        }
    }

    function refreshOverviewPatterns() {
        renderActivityPatterns(overviewPatterns, monthsData.length ? overviewData?.activity : undefined);
    }

    function refreshMonthlyPatterns() {
        renderActivityPatterns(monthlyPatterns, monthsData[currentMonthIndex]?.data);
    }

    function renderActivityPatterns({ panel, weekdays, hours }, data) {
        panel.hidden = !data;
        if (!data) panel.open = false;
        weekdays.replaceChildren();
        hours.replaceChildren();
        if (!panel.open || !data) return;
        // The chart and the table both start the week on Sunday.
        renderPatternRows(weekdays, data.dayOfWeekActivity, day => weekdayFormat.format(Date.UTC(2024, 0, 7 + day)));
        renderPatternRows(hours, data.timeOfDay, hour => `${String(hour).padStart(2, '0')}:00`);
    }

    function renderPatternRows(container, counts, label) {
        counts.forEach((count, index) => appendCountRow(container, label(index), count));
    }

    function appendCountRow(container, label, count) {
        const row = document.createElement('tr');
        const heading = document.createElement('th');
        heading.scope = 'row';
        heading.textContent = label;
        const records = document.createElement('td');
        records.textContent = countFormat.format(count);
        row.append(heading, records);
        container.append(row);
    }

    function refreshOverviewReactions() {
        renderReactionCounts(overviewReactions, overviewData?.reactionCounts);
    }

    function refreshMonthlyReactions() {
        renderReactionCounts(monthlyReactions, monthsData[currentMonthIndex]?.data.reactionCounts);
    }

    function renderReactionCounts({ panel, exportButton, rows, total }, counts) {
        panel.hidden = !counts?.size;
        exportButton.disabled = panel.hidden;
        if (panel.hidden) panel.open = false;
        rows.replaceChildren();
        total.textContent = '';
        if (!panel.open || !counts?.size) return;

        let sum = 0n;
        for (const [key, count] of sortedReactionCounts(counts)) {
            const label = reactionLabels.get(key)?.[language === 'ru' ? 1 : 0] ?? key;
            appendCountRow(rows, label, count);
            sum += count;
        }
        total.textContent = countFormat.format(sum);
    }

    function sortedReactionCounts(counts) {
        return [...counts].sort(([leftKey, leftCount], [rightKey, rightCount]) => {
            if (leftCount !== rightCount) return leftCount > rightCount ? -1 : 1;
            return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
        });
    }

    function updateMonthlyStats({ rebuildCharts = true } = {}) {
        if (rebuildCharts) updateReplyTimingControls();
        refreshDailyActivity();
        refreshMonthlyPatterns();
        refreshMonthlyReactions();
        if (!monthsData.length) {
            exportMonthlyParticipantsButton.disabled = true;
            return;
        }

        const monthData = monthsData[currentMonthIndex];
        reportMonthSelect.value = monthData.month;
        setLocalizedText(currentMonthDisplay, () => formatReportMonth(monthData.month));

        displayMonthlyStats(monthData);
        if (rebuildCharts) createMonthlyCharts(monthData);
    }

    function displayMonthlyStats(monthData) {
        const { data } = monthData;
        const monthlyMessageCountElement = document.getElementById('monthlyMessageCount');
        const monthlyParticipantStatsElement = document.getElementById('monthlyParticipantStats');
        const monthlyWordCountStatsElement = document.getElementById('monthlyWordCountStats');
        const monthlyMediaTypeStatsElement = document.getElementById('monthlyMediaTypeStats');
        const { participantTotals } = data;
        exportMonthlyParticipantsButton.disabled = participantTotals.size === 0;
        setMessageMetric(monthlyMessageCountElement, data.messageCount);
        document.getElementById('monthlyParticipantCount').textContent = countFormat.format(participantTotals.size);
        document.getElementById('monthlyActiveDayCount').textContent = countFormat.format(countActiveDays(data));

        // Use helper functions for monthly stats display
        monthlyParticipantStatsElement.innerHTML = generateParticipantStatsHTML(participantTotals);

        monthlyWordCountStatsElement.innerHTML = generateWordCountHTML(data.wordCounts, `<i class="fas fa-font" aria-hidden="true"></i> ${translate('monthWords')}`);

        monthlyMediaTypeStatsElement.innerHTML = generateMediaTypeHTML(data.mediaTypesStats, `<i class="fas fa-camera-retro" aria-hidden="true"></i> ${translate('mediaUsage')}`);

        displayMonthlyThresholdStats(monthData);

        const monthlyAvgDelayStats = calculateAverageResponseDelay(selectedResponseTimes(data));
        const delayTitle = `<i class="fas fa-hourglass-half" aria-hidden="true"></i> ${translate('monthDelay')}`;
        monthlyAverageResponseDelayStatsElement.innerHTML = generateAverageResponseDelayHTML(monthlyAvgDelayStats, delayTitle);


        const focusedControl = document.activeElement;
        prevMonthButton.disabled = currentMonthIndex === 0;
        nextMonthButton.disabled = currentMonthIndex === monthsData.length - 1;
        if (focusedControl === prevMonthButton && prevMonthButton.disabled && !nextMonthButton.disabled) {
            nextMonthButton.focus();
        } else if (focusedControl === nextMonthButton && nextMonthButton.disabled && !prevMonthButton.disabled) {
            prevMonthButton.focus();
        }
    }

    function displayMonthlyThresholdStats(monthData) {
        const responseTimes = selectedResponseTimes(monthData.data);
        const thresholdMessages = calculateThresholdExceededMessages(responseTimes, ignoredMessageThreshold);
        const title = `<i class="fas fa-eye-slash" aria-hidden="true"></i> ${translate('monthLongResponses', ignoredMessageThreshold / 60)}`;
        monthlyThresholdExceededMessagesStatsElement.innerHTML = generateThresholdExceededMessagesHTML(thresholdMessages, title);
    }

    function createChart(canvasId, { type, data, decimalTicks = false, localize }) {
        if (statsContainer.classList.contains('charts-unavailable')) {
            return;
        }
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Элемент canvas с идентификатором ${canvasId} не найден.`);
            return;
        }

        let ctx;
        try {
            ctx = canvas.getContext('2d');
        } catch {
            // Some browsers deny canvas access even when the chart script is available.
        }
        if (!ctx) {
            showChartsUnavailable();
            return;
        }
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            existingChart.destroy();
            renderedCharts.delete(canvasId);
        }

        const doughnut = type === 'doughnut';
        const options = {
            locale: language,
            responsive: true,
            maintainAspectRatio: false,
            animation: chartAnimation(),
            interaction: type === 'line' ? { mode: 'index', intersect: false } : undefined,
            plugins: {
                legend: {
                    display: doughnut,
                    position: 'bottom',
                    labels: {
                        color: () => chartTheme.textColor,
                        boxWidth: 8,
                        boxHeight: 8,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 14
                    }
                },
                tooltip: {
                    backgroundColor: () => chartTheme.surface,
                    borderColor: () => chartTheme.borderColor,
                    titleColor: () => chartTheme.tooltipText,
                    bodyColor: () => chartTheme.tooltipText,
                    borderWidth: 1,
                    padding: 10,
                    boxPadding: 4
                }
            }
        };

        if (doughnut) {
            options.cutout = '64%';
        } else {
            options.scales = {
                x: {
                    grid: { display: false },
                    border: { color: () => chartTheme.borderColor },
                    ticks: {
                        color: () => chartTheme.textColor,
                        maxTicksLimit: 8,
                        maxRotation: 0,
                        callback(value) {
                            const label = this.getLabelForValue(value);
                            return typeof label === 'string' && label.length > 24
                                ? label.slice(0, 23) + '…'
                                : label;
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: () => chartTheme.gridColor, drawTicks: false },
                    border: { display: false },
                    ticks: {
                        color: () => chartTheme.textColor,
                        maxTicksLimit: 6,
                        padding: 8,
                        precision: decimalTicks ? undefined : 0
                    }
                }
            };
        }

        localize(data);
        const chart = new Chart(ctx, { type, data, options });
        chartTranslations.set(chart, localize);
        renderedCharts.set(canvasId, chart);
        return chart;
    }

    function createMonthlyCharts(monthData) {
        const { data } = monthData;
        const dayCount = daysInReportMonth(monthData.month);
        const days = Array.from({ length: dayCount }, (_, index) => index + 1);
        createBarChart('dailyActivityChart', () => days, data.dailyActivity.slice(0, dayCount), 'chartMessages');
        createTimeOfDayChart(data.timeOfDay, 'monthlyTimeOfDayChart');
        createMessageTypesChart(data.messageTypes, 'monthlyMessageTypesChart');
        createResponseTimeChart(selectedResponseTimes(data), 'monthlyResponseTimeChart');
        createDayOfWeekChart(data.dayOfWeekActivity, 'monthlyDayOfWeekChart');
    }

    function createMonthlyChart(monthsData) {
        const labels = monthsData.map(m => m.month);
        const participants = Array.from(allParticipants);
        const leadingParticipants = participants.length > fullTrendParticipantLimit
            ? selectLeadingTrendParticipants(participants, monthsData) : participants;

        const makeDataset = (participant, index) => ({
            ...lineAppearance(index),
            participant,
            data: monthsData.map(m => m.data.participantTotals.get(participant)?.messageCount ?? 0)
        });
        const datasets = leadingParticipants.map(makeDataset);

        const unattributed = monthsData.map(m => m.data.unattributedCount);
        if (unattributed.some(Boolean)) {
            datasets.push({
                ...lineAppearance(datasets.length),
                data: unattributed,
                borderDash: [4, 4]
            });
        }
        const chart = createChart('monthlyChart', {
            type: 'line',
            data: { labels, datasets },
            localize(chartData) {
                for (const dataset of chartData.datasets) {
                    dataset.label = dataset.participant === undefined
                        ? translate('unattributed') : participantLabel(dataset.participant);
                }
            }
        });
        renderMonthlyChartLegend(chart);
        resetTrendComparison();
        if (chart && monthsData.length && leadingParticipants !== participants) {
            const leading = new Set(leadingParticipants);
            configureTrendComparison(chart, participants.filter(participant => !leading.has(participant)), makeDataset);
        }
    }

    function selectLeadingTrendParticipants(participants, months) {
        const counts = new Map();
        for (const { data } of months) {
            for (const [name, { messageCount }] of data.participantTotals) {
                counts.set(name, (counts.get(name) ?? 0) + messageCount);
            }
        }
        return participants.slice().sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
            .slice(0, leadingTrendParticipantCount);
    }

    function resetTrendComparison() {
        trendComparison = null;
        trendComparisonPanel.hidden = true;
        trendComparisonSearch.value = '';
        trendComparisonSearchStatus.textContent = '';
        trendComparisonSelect.replaceChildren();
    }

    function configureTrendComparison(chart, choices, makeDataset) {
        const index = chart.data.datasets.length;
        trendComparison = {
            choices,
            select(value) {
                const participant = value === '' ? undefined : choices[Number(value)];
                chart.data.datasets.splice(index, 1);
                if (participant !== undefined) {
                    chart.data.datasets.push(makeDataset(participant, index));
                    chart.setDatasetVisibility(index, true);
                }
                chartTranslations.get(chart)(chart.data);
                chart.update('none');
                renderMonthlyChartLegend(chart);
            },
        };

        refreshTrendComparisonOptions();
        trendComparisonPanel.hidden = false;
    }

    function refreshTrendComparisonOptions() {
        if (!trendComparison) return;
        const { choices } = trendComparison;
        const query = normalizeSearchText(trendComparisonSearch.value);
        const selected = trendComparisonSelect.value;
        const rows = [{ value: '', label: translate('noTrendComparison') }];
        let selectedMatches = false;
        choices.forEach((participant, index) => {
            const label = participantLabel(participant);
            if (query && !normalizeSearchText(label).includes(query)) return;
            const value = String(index);
            rows.push({ value, label });
            if (value === selected) selectedMatches = true;
        });
        const matchCount = rows.length - 1;
        const selectedParticipant = selected === '' ? undefined : choices[Number(selected)];
        if (selectedParticipant !== undefined && !selectedMatches) {
            const label = participantLabel(selectedParticipant);
            rows.splice(1, 0, { value: selected, label: translate('currentTrendComparison', label) });
        }

        const options = trendComparisonSelect.options;
        const lastChild = trendComparisonSelect.lastElementChild;
        const displayedMatches = lastChild?.tagName === 'OPTGROUP' ? lastChild.children.length : 0;
        if (displayedMatches !== matchCount || options.length !== rows.length
            || rows.some(({ value }, index) => options[index].value !== value)) {
            // Swap the matched choices as a group so filtering does not remove thousands of sibling options.
            const group = document.createElement('optgroup');
            const standalone = [];
            const matchingStart = rows.length - matchCount;
            rows.forEach(({ value, label }, index) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                if (index < matchingStart) standalone.push(option);
                else group.append(option);
            });
            if (matchCount) standalone.push(group);
            trendComparisonSelect.replaceChildren(...standalone);
            trendComparisonSelect.value = selected;
        } else {
            rows.forEach(({ label }, index) => {
                if (options[index].textContent !== label) options[index].textContent = label;
            });
        }
        if (matchCount) trendComparisonSelect.lastElementChild.label = translate('trendSearchGroup');

        const count = translate('trendSearchMatches', countFormat.format(matchCount), countFormat.format(choices.length));
        const status = matchCount ? count : `${translate('noMatchingTrendParticipants')} · ${count}`;
        if (trendComparisonSearchStatus.textContent !== status) trendComparisonSearchStatus.textContent = status;
    }

    function renderMonthlyChartLegend(chart) {
        const datasets = chart?.data.datasets ?? [];
        monthlyChartSeries.replaceChildren();
        monthlyChartLegend.hidden = datasets.length === 0;
        for (const [index, dataset] of datasets.entries()) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chart-series-toggle';
            button.setAttribute('aria-pressed', String(chart.isDatasetVisible(index)));

            const swatch = document.createElement('span');
            swatch.className = 'chart-series-swatch';
            swatch.setAttribute('aria-hidden', 'true');
            swatch.dataset.point = dataset.pointStyle;
            swatch.dataset.dashed = String(Boolean(dataset.borderDash?.length));
            // The primary series uses the theme accent, which the CSS also supplies.
            if (typeof dataset.borderColor === 'string') {
                swatch.style.setProperty('--series-color', dataset.borderColor);
            }
            const label = document.createElement('span');
            label.textContent = dataset.label;
            button.append(swatch, label);
            button.addEventListener('click', () => {
                const visible = !chart.isDatasetVisible(index);
                chart.setDatasetVisibility(index, visible);
                chart.update('none');
                button.setAttribute('aria-pressed', String(visible));
            });
            monthlyChartSeries.append(button);
        }
    }

    function createResponseTimeChart(responseTimes, canvasId = 'responseTimeChart') {
        const pairs = [];
        const minutes = [];
        for (const [sender, recipients] of Object.entries(responseTimes)) {
            for (const [recipient, times] of Object.entries(recipients)) {
                if (!times.length) continue;
                pairs.push([sender, recipient]);
                minutes.push(times.reduce((sum, seconds) => sum + seconds, 0) / times.length / 60);
            }
        }

        const labels = () => pairs.map(([sender, recipient]) => `${participantLabel(sender)} -> ${participantLabel(recipient)}`);
        createBarChart(canvasId, labels, minutes, 'chartResponse', true);
    }

    function createDayOfWeekChart(activity, canvasId = 'dayOfWeekChart') {
        createBarChart(canvasId, () => translate('weekdays').slice(), activity, 'chartMessages');
    }

    function createBarChart(canvasId, getLabels, data, labelKey, decimalTicks = false) {
        createChart(canvasId, {
            type: 'bar',
            decimalTicks,
            data: {
                datasets: [{
                    data,
                    backgroundColor: () => chartTheme.accent,
                    borderRadius: 4,
                    maxBarThickness: 28
                }]
            },
            localize(chartData) {
                chartData.labels = getLabels();
                chartData.datasets[0].label = translate(labelKey);
            }
        });
    }

    function createTimeOfDayChart(timeOfDay, canvasId = 'timeOfDayChart') {
        createChart(canvasId, {
            type: 'line',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                datasets: [{
                    ...lineAppearance(0),
                    data: timeOfDay
                }]
            },
            localize(chartData) {
                chartData.datasets[0].label = translate('activity');
            }
        });
    }

    function lineAppearance(index) {
        const primary = index === 0;
        const stroke = primary ? () => chartTheme.accent : chartSeriesColor(1 + (index - 1) % 7);
        return {
            borderColor: stroke,
            borderWidth: primary ? 2.5 : 1.75,
            backgroundColor: primary ? () => chartTheme.fill : stroke,
            fill: primary ? 'origin' : false,
            cubicInterpolationMode: 'monotone',
            borderDash: index % 3 === 1 ? [5, 4] : [],
            pointStyle: ['circle', 'rectRounded', 'triangle'][index % 3],
            pointBackgroundColor: stroke,
            pointBorderWidth: 0,
            pointRadius: primary ? 3 : 2,
            pointHoverRadius: 5
        };
    }

    function createMessageTypesChart(messageTypes, canvasId = 'messageTypesChart') {
        const types = Object.keys(messageTypes);
        createChart(canvasId, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: Object.values(messageTypes),
                    backgroundColor: ({ dataIndex }) => chartSeriesColor(messageTypeColorIndex(types[dataIndex])),
                    borderColor: () => chartTheme.surface,
                    hoverBorderColor: () => chartTheme.surface,
                    borderWidth: 2,
                    hoverOffset: 3
                }]
            },
            localize(chartData) {
                chartData.labels = types.map(mediaLabel);
            }
        });
    }

    function formatShortReplyTime(seconds) {
        // Round before picking a unit so the seconds readout never displays 60.
        const milliseconds = Math.round(seconds * 1000);
        if (milliseconds >= 60_000) return null;
        const unit = translate('seconds');
        if (seconds > 0 && milliseconds === 0) return translate('lessThan', countFormat.format(0.001) + ' ' + unit);
        return countFormat.format(milliseconds / 1000) + ' ' + unit;
    }

    function formatTime(seconds) {
        const shortTime = formatShortReplyTime(seconds);
        if (shortTime !== null) return shortTime;
        if (seconds < 3600) return `${Math.round(seconds / 60)} ${translate('minutes')}`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)} ${translate('hours')}`;
        return `${Math.round(seconds / 86400)} ${translate('days')}`;
    }


    function chartSeriesColor(index) {
        const colors = [chartTheme.accent, '#a76d3a', '#6379a6', '#a2678f',
            '#74854b', '#5a8890', '#bd775d', '#817a9f', '#977637', '#6d54a2', '#ae6b79', '#348076',
            '#796958', '#567388', '#87575e', '#7f5f92', '#4b7098', '#9b6e45', '#507e60', '#b05a79'];
        return colors[index % colors.length];
    }

    function messageTypeColorIndex(label = '') {
        const knownTypes = ['text', 'photo', 'video_file', 'voice_message',
            'sticker', 'animation', 'audio_file', 'video_message', 'file', 'poll', 'contact', 'location',
            'service', 'unsupported', 'rich_media', 'todo_list', 'game', 'invoice', 'giveaway', 'paid_media'];
        const index = knownTypes.indexOf(label);
        if (index >= 0) return index;

        let hash = 0;
        for (const character of label) {
            hash = (Math.imul(hash, 31) + character.codePointAt(0)) >>> 0;
        }
        return hash;
    }

    // --- Helper Functions for HTML Generation ---

    function addParticipantMessage(totalsByParticipant, name, textLength) {
        const totals = totalsByParticipant.get(name);
        if (totals) {
            totals.messageCount++;
            totals.textLength += textLength;
        } else {
            totalsByParticipant.set(name, { messageCount: 1, textLength });
        }
    }

    function generateParticipantStatsHTML(totalsByParticipant) {
        let statsHTML = `<h3><i class="fas fa-users" aria-hidden="true"></i> ${translate('participantStats')}</h3><ul>`;
        for (const [participant, { messageCount, textLength }] of totalsByParticipant) {
            const sanitizedParticipant = sanitizeHTML(participantLabel(participant));
            const avgLength = textLength / messageCount;

            statsHTML += `
                <li>
                    <strong>${sanitizedParticipant}</strong>:
                    <ul>
                        <li><i class="fas fa-comment" aria-hidden="true"></i> ${translate('messageTotal', messageCount)}</li>
                        <li><i class="fas fa-text-width" aria-hidden="true"></i> ${translate('averageLength', avgLength.toFixed(1))}</li>
                    </ul>
                </li>
            `;
        }
        statsHTML += '</ul>';
        return statsHTML;
    }

    function downloadMonthlyParticipantSummary() {
        const monthData = monthsData[currentMonthIndex];
        if (exportMonthlyParticipantsButton.disabled || !monthData) return;
        downloadParticipantSummary(
            monthData.data.participantTotals,
            `telegram-analyzer-${monthData.month}-participants.csv`
        );
    }

    function downloadMonthlyActivity() {
        if (exportMonthlyActivityButton.disabled || statsContainer.style.display !== 'block') return;
        const rows = ['month,records,active_days'];
        for (const { month, data } of monthsData) {
            rows.push(`${month},${data.messageCount},${countActiveDays(data)}`);
        }
        downloadCsv(rows, 'telegram-analyzer-monthly-activity.csv');
    }

    function downloadDailyActivity() {
        const selected = monthsData[currentMonthIndex];
        if (exportDailyActivityButton.disabled || !selected || !monthlyStatsTab.classList.contains('active')
            || statsContainer.style.display !== 'block') return;
        const { month, data } = selected;
        const rows = ['date,records'];
        const days = daysInReportMonth(month);
        for (let day = 1; day <= days; day++) {
            rows.push(`${reportDayKey(month, day)},${data.dailyActivity[day - 1]}`);
        }
        downloadCsv(rows, `telegram-analyzer-${month}-daily-activity.csv`);
    }

    function downloadReactionCounts(counts, month) {
        if (!counts?.size || statsContainer.style.display !== 'block') return;
        const rows = ['reaction_type,emoji,count'];
        for (const [key, count] of sortedReactionCounts(counts)) {
            // Only known types and validated emoji sequences can reach this export.
            rows.push(reactionLabels.has(key) ? `${key},,${count}` : `emoji,${key},${count}`);
        }
        const period = month ? `${month}-` : '';
        downloadCsv(rows, `telegram-analyzer-${period}reactions.csv`);
    }

    function downloadReplyTiming() {
        if (exportReplyTimingButton.disabled || statsContainer.style.display !== 'block') return;
        const month = selectedReplyMonth();
        const responseTimes = selectedResponseTimes(month?.data ?? overallResponseStats);
        const rows = ['sender,responder,timed_replies,average_seconds,long_replies,threshold_seconds'];
        for (const [sender, responders] of Object.entries(responseTimes)) {
            const senderField = csvParticipantName(sender);
            for (const [responder, times] of Object.entries(responders)) {
                const total = times.reduce((sum, seconds) => sum + seconds, 0);
                const longReplies = times.filter(seconds => seconds > ignoredMessageThreshold).length;
                rows.push([senderField, csvParticipantName(responder), times.length,
                    (total / times.length).toFixed(3), longReplies, ignoredMessageThreshold].join(','));
            }
        }
        const period = month ? `${month.month}-` : '';
        downloadCsv(rows, `telegram-analyzer-${period}${replyTimingMode}-replies.csv`);
    }

    function downloadParticipantSummary(participantTotals, filename) {
        if (participantTotals.size === 0) return;
        const rows = ['Участник,Сообщения,Средняя длина сообщения'];
        for (const [participant, { messageCount, textLength }] of participantTotals) {
            rows.push(`${csvParticipantName(participant)},${messageCount},${(textLength / messageCount).toFixed(1)}`);
        }
        downloadCsv(rows, filename);
    }

    function csvParticipantName(participant) {
        const name = String(participant);
        // Prevent spreadsheet programs from treating an imported name as a formula.
        const safeName = /^\s*[=+@＝＋＠－-]|^[\t\r\n]/u.test(name) ? "'" + name : name;
        return `"${safeName.replaceAll('"', '""')}"`;
    }

    function downloadCsv(rows, filename) {
        const blob = new Blob(['\uFEFF', rows.join('\r\n'), '\r\n'], { type: 'text/csv;charset=utf-8' });
        downloadBlob(blob, filename);
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function generateAverageResponseDelayHTML(avgDelayStats, title) {
        let html = `<h3>${title}</h3><ul>`;
        const validResponders = Object.keys(avgDelayStats).filter(r => r);
        if (validResponders.length === 0) {
            return `<p>${translate('noDelayData')}</p>`;
        }

        validResponders.forEach(responder => {
            const sanitizedResponder = sanitizeHTML(participantLabel(responder));
            const initiatorDelays = avgDelayStats[responder];
            const validInitiators = Object.keys(initiatorDelays).filter(i => i && initiatorDelays[i] !== undefined);

            if (validInitiators.length > 0) {
                html += `<li><strong>${translate('delayFor', sanitizedResponder)}</strong><ul>`;
                validInitiators.forEach(initiator => {
                    const sanitizedInitiator = sanitizeHTML(participantLabel(initiator));
                    const seconds = initiatorDelays[initiator];
                    const avgTime = formatShortReplyTime(seconds)
                        ?? (replyMinutesFormat.format(seconds / 60) + ' ' + translate('minutes'));
                    html += `<li>${translate('toParticipant')} <strong>${sanitizedInitiator}</strong>: ${avgTime}</li>`;
                });
                html += `</ul></li>`;
            }
        });

        html += '</ul>';
        return html;
    }

    function generateThresholdExceededMessagesHTML(thresholdMessages, title) {
        const validSenders = Object.keys(thresholdMessages || {}).filter(Boolean);
        const sections = [];

        validSenders.forEach(sender => {
            const recipientCounts = thresholdMessages[sender] || {};
            const recipientsWithCounts = Object.entries(recipientCounts)
                .filter(([recipient, count]) => Boolean(recipient) && Number(count) > 0);

            if (!recipientsWithCounts.length) {
                return;
            }

            const sanitizedSender = sanitizeHTML(participantLabel(sender));
            const recipientItems = recipientsWithCounts.map(([recipient, count]) => {
                return `<li>${translate('toParticipant')} <strong>${sanitizeHTML(participantLabel(recipient))}</strong>: ${count}</li>`;
            }).join('');

            const senderSection = `
                <li>
                    <strong>${translate('fromParticipant')} ${sanitizedSender}:</strong>
                    <ul>
                        ${recipientItems}
                    </ul>
                </li>
            `;

            sections.push(senderSection);
        });

        if (!sections.length) {
            return `<p>${translate('noLongResponses')}</p>`;
        }

        return `<h3>${title}</h3><ul>${sections.join('')}</ul>`;
    }

    function generateWordCountHTML(wordCounts, title) {
        let wordCountHTML = `<h3>${title}</h3><ul>`;
        for (const participant in wordCounts) {
            if (Object.hasOwnProperty.call(wordCounts, participant) && participant) {
                const sanitizedParticipant = sanitizeHTML(participantLabel(participant));
                wordCountHTML += `<li><strong>${sanitizedParticipant}</strong>: ${translate('wordTotal', wordCounts[participant])}</li>`;
            }
        }
        wordCountHTML += '</ul>';
        return wordCountHTML;
    }

    function generateMediaTypeHTML(mediaTypeUsage, title) {
        let mediaTypeHTML = `<h3>${title}</h3><ul>`;
        for (const participant in mediaTypeUsage) {
             if (Object.hasOwnProperty.call(mediaTypeUsage, participant) && participant && Object.keys(mediaTypeUsage[participant]).length > 0) {
                const sanitizedParticipant = sanitizeHTML(participantLabel(participant));
                mediaTypeHTML += `<li><strong>${sanitizedParticipant}</strong>:<ul>`;
                for (const mediaType in mediaTypeUsage[participant]) {
                    if (Object.hasOwnProperty.call(mediaTypeUsage[participant], mediaType)) {
                        const sanitizedMediaType = sanitizeHTML(mediaLabel(mediaType));
                        mediaTypeHTML += `<li><i class="fas fa-arrow-right" aria-hidden="true"></i> ${sanitizedMediaType}: ${mediaTypeUsage[participant][mediaType]}</li>`;
                    }
                }
                mediaTypeHTML += '</ul></li>';
            }
        }
        mediaTypeHTML += '</ul>';
        return mediaTypeHTML;
    }
});
