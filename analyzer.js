document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('jsonFile');
    const demoButton = document.getElementById('loadDemoChat');
    const accountChatChooser = document.getElementById('accountChatChooser');
    const accountChatSelect = document.getElementById('accountChatSelect');
    const analyzeAccountChatButton = document.getElementById('analyzeAccountChat');
    const accountChatStatus = document.getElementById('accountChatStatus');
    const statsContainer = document.querySelector('.stats-container');
    const monthlyChartLegend = document.getElementById('monthlyChartLegend');
    const monthlyChartSeries = document.getElementById('monthlyChartSeries');
    const currentMonthDisplay = document.getElementById('currentMonth');
    const allStatsTab = document.querySelector('.tab-btn[data-tab="all"]');
    const monthlyStatsTab = document.querySelector('.tab-btn[data-tab="monthly"]');
    const statsTabs = [...document.querySelectorAll('.tab-btn')];
    const exportParticipantsButton = document.getElementById('exportParticipants');
    const exportMonthlyParticipantsButton = document.getElementById('exportMonthlyParticipants');
    const prevMonthButton = document.getElementById('prevMonth');
    const nextMonthButton = document.getElementById('nextMonth');
    const ignoredThresholdInput = document.getElementById('ignoredThreshold');
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
    const languageToggle = document.getElementById('languageToggle');
    const languageToggleLabel = document.getElementById('languageToggleLabel');
    const LOCALE_STORAGE_KEY = 'telegramAnalyzerLocale';
    const copy = {
        switchLanguage: ['Switch language to Russian', 'Переключить язык на английский'],
        darkTheme: ['Switch to dark theme', 'Переключить на тёмную тему'],
        lightTheme: ['Switch to light theme', 'Переключить на светлую тему'],
        demoReport: ['Demo report', 'Демо-отчёт'],
        demoTitle: ['Sample chat', 'Демонстрационный чат'],
        demoSource: ['Fictional conversation', 'Вымышленная переписка'],
        demoFile: ['Built-in example', 'Встроенный пример'],
        demoData: ['Demo data', 'Демо-данные'],
        report: ['Chat report', 'Отчёт по чату'],
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
        accountOption: [
            (number, name, suffix, count) => `${number}. ${name}${suffix} · ${count} ${count === 1 ? 'message' : 'messages'}`,
            (number, name, suffix, count) => `${number}. ${name}${suffix} · ${count} сообщ.`,
        ],
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
        weekdays: [['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']],
        chartResponse: ['Average response time (min)', 'Среднее время ответа (мин)'],
        participantStats: ['Participant statistics', 'Статистика по участникам:'],
        participantResponse: ['Average response time by participant', 'Среднее время ответа по участникам:'],
        meanDelay: ['Average response delay (minutes)', 'Средняя задержка ответа (в минутах):'],
        monthDelay: ['Average response delay this month (minutes)', 'Средняя задержка ответа (за месяц, в минутах):'],
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
    let monthFormat;
    const graphemeSegmenter = typeof Intl.Segmenter === 'function'
        ? new Intl.Segmenter('ru-RU', { granularity: 'grapheme' })
        : null;
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

    let overallResponseTimes = null;
    let overallParticipantTotals = new Map();
    let overviewData = null;
    let activeImport = null;
    let accountChats = [];
    let currentMonthIndex = 0;
    let monthsData = [];
    let allParticipants = new Set();
    let ignoredMessageThreshold = 3600; // Порог игнорирования по умолчанию: 1 час (в секундах)
    let chartTheme = {
        textColor: '#e4e6ea',
        borderColor: '#2a2d31',
        gridColor: 'rgba(255, 255, 255, 0.1)'
    };
    const renderedCharts = new Map();

    initializeLanguage();
    initializeTheme();
    if (typeof Chart === 'undefined') {
        statsContainer.classList.add('charts-unavailable');
        document.getElementById('chartsUnavailableNotice').hidden = false;
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

    // Обработчики навигации по месяцам
    prevMonthButton.addEventListener('click', () => {
        if (currentMonthIndex > 0) {
            currentMonthIndex--;
            updateMonthlyStats();
        }
    });

    nextMonthButton.addEventListener('click', () => {
        if (currentMonthIndex < monthsData.length - 1) {
            currentMonthIndex++;
            updateMonthlyStats();
        }
    });

    // Обработчик изменения порога игнорирования
    ignoredThresholdInput.addEventListener('change', (e) => {
        const minutes = e.target.valueAsNumber;
        if (!Number.isSafeInteger(minutes) || minutes < 1) {
            e.target.value = ignoredMessageThreshold / 60;
            return;
        }
        ignoredMessageThreshold = minutes * 60;
        if (overallResponseTimes) {
            displayThresholdExceededMessagesStats(calculateThresholdExceededMessages(overallResponseTimes, ignoredMessageThreshold));
            const monthData = monthsData[currentMonthIndex];
            if (monthData) {
                displayMonthlyThresholdStats(monthData);
            }
        }
    });

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    demoButton?.addEventListener('click', loadDemoChat);
    accountChatSelect.addEventListener('change', () => {
        analyzeAccountChatButton.disabled = selectedAccountChat() === undefined;
    });
    analyzeAccountChatButton.addEventListener('click', analyzeAccountChat);
    exportParticipantsButton.addEventListener('click', () => {
        if (exportParticipantsButton.disabled) return;
        downloadParticipantSummary(overallParticipantTotals, 'telegram-analyzer-participants.csv');
    });
    exportMonthlyParticipantsButton.addEventListener('click', downloadMonthlyParticipantSummary);
    monthlyChartSeries.addEventListener('focusin', event => {
        event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
        monthFormat = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });

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
        refreshAccountChooserLabels();
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
        const messages = rows.map(([date, person, text, mediaType], index) => ({
            id: index + 1, type: 'message', date, from: people[person],
            from_id: `user${person + 1}`, text, media_type: mediaType,
        }));
        const json = JSON.stringify({ name: 'Демонстрационный чат', messages });
        processSelectedFile(new File([json], 'demo-chat.json', { type: 'application/json' }), { isDemo: true });
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
                return { message, time: Infinity, calendar: null, hasWallClock: false };
            }
        }
        return { message, time: Number.isFinite(time) ? time : Infinity, calendar, hasWallClock: wall !== null };
    }

    function orderMessageTimings(messages) {
        let useCivilTime = false;
        const timings = messages.map(message => {
            const timing = readMessageTiming(message);
            if (!useCivilTime && timing.hasWallClock && !Number.isFinite(timing.time)
                && message.type !== 'service' && (message.from || getSenderId(message) !== null)) {
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
            const firstId = typeof a.message.id === 'number' ? a.message.id : 0;
            const secondId = typeof b.message.id === 'number' ? b.message.id : 0;
            return firstId - secondId;
        });
        return timings;
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

        for (const { message, time, calendar } of timings) {
            const id = getSenderId(message);
            const name = typeof message.from === 'string' && message.from.trim() ? message.from : null;
            if (name) actualNames.add(name);
            if (!id) {
                if (name) nameOnly.add(name);
                continue;
            }

            let sender = senders.get(id);
            if (!sender) {
                sender = { name: null, nameTime: -Infinity };
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
        }
        if (senders.size === 0) return;

        // Preserve ambiguous name-only records as their own group.
        const usedLabels = new Set([...nameOnly].filter(name => !idsByName.get(name)));
        const nextSuffixByName = new Map();
        const unnamedLabels = [];
        for (const sender of senders.values()) {
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

    function countTextCharacters(text) {
        if (text.length < 2) return text.length;
        let count = 0;
        for (const _ of graphemeSegmenter?.segment(text) ?? text) {
            count++;
        }
        return count;
    }

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim() !== '';
    }

    function getMessageCategory({ media_type, photo, file, poll, contact_information, location_information, place_name }) {
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
        return 'text';
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
        return translate('accountOption', chat.number, resolveText(chat.name), suffix, chat.messages.length);
    }

    function refreshAccountChooserLabels() {
        if (!accountChats.length) return;
        const options = accountChatSelect.children;
        options[0].textContent = translate('selectChat');
        accountChats.forEach((chat, index) => {
            options[index + 1].textContent = accountChatLabel(chat);
        });
    }

    function resetAccountChooser() {
        accountChats = [];
        accountChatChooser.hidden = true;
        accountChatSelect.replaceChildren();
        analyzeAccountChatButton.disabled = true;
        setLocalizedText(accountChatStatus, '');
    }

    function showAccountChooser(chats) {
        accountChats = chats;
        const placeholder = document.createElement('option');
        placeholder.value = '';
        accountChatSelect.append(placeholder);
        accountChats.forEach((chat, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            accountChatSelect.append(option);
        });
        refreshAccountChooserLabels();
        accountChatSelect.value = '';
        accountChatChooser.hidden = false;
        setLocalizedText(accountChatStatus, translated('selectChatStatus'));
    }

    function selectedAccountChat() {
        const value = accountChatSelect.value;
        return value === '' ? undefined : accountChats[Number(value)];
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
        renderedCharts.forEach(chart => chart.destroy());
        renderedCharts.clear();
        renderMonthlyChartLegend();
        overallResponseTimes = null;
        overallParticipantTotals = new Map();
        overviewData = null;
        syntheticNames.clear();
        monthsData = [];
        currentMonthIndex = -1;
        allParticipants = new Set();
        exportParticipantsButton.disabled = true;
        exportMonthlyParticipantsButton.disabled = true;
    }

    function suspendImportView() {
        const previous = {
            reportVisible: statsContainer.style.display === 'block',
            chooserVisible: !accountChatChooser.hidden,
            overallExportDisabled: exportParticipantsButton.disabled,
            monthlyExportDisabled: exportMonthlyParticipantsButton.disabled,
            placeholderTitle: localizedText.get(placeholderTitle) ?? placeholderTitle.textContent,
            placeholderText: localizedText.get(placeholderText) ?? placeholderText.textContent,
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
            setReportPlaceholder(previous.placeholderTitle, previous.placeholderText);
        }
    }

    function processSelectedFile(file, { isDemo = false } = {}) {
        if (!file) {
            return;
        }

        if (!isJsonFile(file)) {
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
                const data = JSON.parse(e.target?.result);
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
            reader.readAsText(file);
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
        let previousMessage = null;
        timings.forEach(({ message: msg, calendar, time }) => {
            if (!calendar) return;
            const year = calendar.getUTCFullYear().toString().padStart(4, '0');
            const monthNumber = (calendar.getUTCMonth() + 1).toString().padStart(2, '0');
            const monthKey = `${year}-${monthNumber}`;

            const month = messagesByMonth[monthKey] ??= {
                messages: [],
                unattributedCount: 0,
                participants: Object.create(null),
                messageTypes: Object.create(null),
                timeOfDay: new Array(24).fill(0),
                responseTimes: Object.create(null),
                wordCounts: Object.create(null),
                mediaTypesStats: Object.create(null),
                dayOfWeekActivity: new Array(7).fill(0),
                dailyActivity: new Array(31).fill(0)
            };

            month.messages.push(msg);
            const type = getMessageCategory(msg);
            month.messageTypes[type] = (month.messageTypes[type] ?? 0) + 1;
            month.timeOfDay[calendar.getUTCHours()]++;
            month.dayOfWeekActivity[calendar.getUTCDay()]++;
            month.dailyActivity[calendar.getUTCDate() - 1]++;

            if (!msg.from) {
                month.unattributedCount++;
                return;
            }
            (month.participants[msg.from] ??= []).push(msg);
            if (type !== 'text') {
                const mediaTypes = month.mediaTypesStats[msg.from] ??= Object.create(null);
                mediaTypes[type] = (mediaTypes[type] ?? 0) + 1;
            }

            const words = getMessageText(msg.text).split(/\s+/).filter(Boolean);
            month.wordCounts[msg.from] = (month.wordCounts[msg.from] ?? 0) + words.length;

            if (msg.type !== 'service' && Number.isFinite(time)) {
                if (previousMessage && previousMessage.sender !== msg.from) {
                    const { sender, time: previousTime } = previousMessage;
                    const seconds = (time - previousTime) / 1000;
                    recordResponse(responseTimes, sender, msg.from, seconds);
                    recordResponse(month.responseTimes, sender, msg.from, seconds);
                }
                previousMessage = { sender: msg.from, time };
            }
        });

        // Сортируем месяцы
        monthsData = Object.entries(messagesByMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({ month, data }));

        // Показываем общую статистику
        overallResponseTimes = responseTimes;
        overallParticipantTotals = getParticipantTotals(messages);
        overviewData = {
            messageCount: messages.length,
            words: calculateTotalWordCounts(messages),
            media: calculateMediaTypeUsage(messages),
        };
        renderOverviewStatistics();

        // Создаем графики общей статистики
        const allTimeData = calculateAllTimeStats(timings);
        createMonthlyChart(monthsData);
        createResponseTimeChart(responseTimes);
        createTimeOfDayChart(allTimeData.timeOfDay);
        createMessageTypesChart(allTimeData.messageTypes);
        createDayOfWeekChart(allTimeData.dayOfWeekActivity);

        // Показываем статистику за последний месяц
        currentMonthIndex = monthsData.length - 1;
        monthlyStatsTab.disabled = monthsData.length === 0;
        if (monthlyStatsTab.disabled && monthlyStatsTab.classList.contains('active')) {
            selectStatsTab(allStatsTab);
        }
        updateMonthlyStats();
        exportParticipantsButton.disabled = overallParticipantTotals.size === 0;
    }

    function renderOverviewStatistics() {
        displayGeneralStats(overviewData.messageCount, overallParticipantTotals, overallResponseTimes);
        displayAverageResponseDelayStats(calculateAverageResponseDelay(overallResponseTimes));
        displayWordCountStats(overviewData.words);
        displayMediaTypeStats(overviewData.media);
        displayThresholdExceededMessagesStats(calculateThresholdExceededMessages(overallResponseTimes, ignoredMessageThreshold));
    }

    function refreshReportLanguage() {
        if (!overviewData || statsContainer.style.display !== 'block') return;

        renderOverviewStatistics();
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

        // Calculate average response time separately as it wasn't refactored into generateParticipantStatsHTML
        let avgResponseTimeHTML = `<h3><i class="fas fa-calculator" aria-hidden="true"></i> ${translate('participantResponse')}</h3><ul>`;
        for (const participant of participantTotals.keys()) {
             if (participant) {
                 const sanitizedParticipant = sanitizeHTML(participantLabel(participant));
                 const avgTime = calculateAverageResponseTimeForParticipant(responseTimes, participant);
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

    function calculateAverageResponseTimeForParticipant(responseTimes, participant) {
        let totalSeconds = 0;
        let responseCount = 0;
        for (const responders of Object.values(responseTimes)) {
            const times = responders[participant] ?? [];
            totalSeconds += times.reduce((sum, seconds) => sum + seconds, 0);
            responseCount += times.length;
        }
        return responseCount ? formatTime(totalSeconds / responseCount) : translate('noData');
    }

    function calculateAverageResponseDelay(responseTimes) {
        const averages = Object.create(null);
        for (const [sender, responders] of Object.entries(responseTimes)) {
            for (const [responder, times] of Object.entries(responders)) {
                const bySender = averages[responder] ??= Object.create(null);
                bySender[sender] = times.reduce((sum, seconds) => sum + seconds, 0) / times.length / 60;
            }
        }
        return averages;
    }

    function displayAverageResponseDelayStats(avgDelayStats) {
        const title = `<i class="fas fa-hourglass-half" aria-hidden="true"></i> ${translate('meanDelay')}`;
        averageResponseDelayStatsElement.innerHTML = generateAverageResponseDelayHTML(avgDelayStats, title);
    }

    function calculateTotalWordCounts(messages) {
        const wordCounts = Object.create(null);
        allParticipants.forEach(p => wordCounts[p] = 0);
        messages.forEach(msg => {
            if (msg.from) {
                const words = getMessageText(msg.text).split(/\s+/).filter(Boolean);
                wordCounts[msg.from] += words.length;
            }
        });
        return wordCounts;
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
            if (type !== 'text') {
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


    function updateMonthlyStats({ rebuildCharts = true } = {}) {
        if (!monthsData.length) {
            exportMonthlyParticipantsButton.disabled = true;
            return;
        }

        const monthData = monthsData[currentMonthIndex];
        const monthDate = new Date(monthData.month + '-01');
        setLocalizedText(currentMonthDisplay, () => monthFormat.format(monthDate));

        displayMonthlyStats(monthData);
        if (rebuildCharts) createMonthlyCharts(monthData);
    }

    function displayMonthlyStats(monthData) {
        const { data } = monthData;
        const monthlyMessageCountElement = document.getElementById('monthlyMessageCount');
        const monthlyParticipantStatsElement = document.getElementById('monthlyParticipantStats');
        const monthlyWordCountStatsElement = document.getElementById('monthlyWordCountStats');
        const monthlyMediaTypeStatsElement = document.getElementById('monthlyMediaTypeStats');
        const participantTotals = getParticipantTotals(data.messages);
        exportMonthlyParticipantsButton.disabled = participantTotals.size === 0;
        setMessageMetric(monthlyMessageCountElement, data.messages.length);
        document.getElementById('monthlyParticipantCount').textContent = countFormat.format(participantTotals.size);
        document.getElementById('monthlyActiveDayCount').textContent = countFormat.format(data.dailyActivity.filter(Boolean).length);

        // Use helper functions for monthly stats display
        monthlyParticipantStatsElement.innerHTML = generateParticipantStatsHTML(participantTotals);

        monthlyWordCountStatsElement.innerHTML = generateWordCountHTML(data.wordCounts, `<i class="fas fa-font" aria-hidden="true"></i> ${translate('monthWords')}`);

        monthlyMediaTypeStatsElement.innerHTML = generateMediaTypeHTML(data.mediaTypesStats, `<i class="fas fa-camera-retro" aria-hidden="true"></i> ${translate('mediaUsage')}`);

        displayMonthlyThresholdStats(monthData);

        const monthlyAvgDelayStats = calculateAverageResponseDelay(data.responseTimes);
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
        const thresholdMessages = calculateThresholdExceededMessages(monthData.data.responseTimes, ignoredMessageThreshold);
        const title = `<i class="fas fa-eye-slash" aria-hidden="true"></i> ${translate('monthLongResponses', ignoredMessageThreshold / 60)}`;
        monthlyThresholdExceededMessagesStatsElement.innerHTML = generateThresholdExceededMessagesHTML(thresholdMessages, title);
    }

    function createChart(canvasId, { type, data, decimalTicks = false, localize }) {
        if (typeof Chart === 'undefined') {
            return;
        }
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Элемент canvas с идентификатором ${canvasId} не найден.`);
            return;
        }

        const ctx = canvas.getContext('2d');
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
        const endOfMonth = new Date(`${monthData.month}-01T00:00:00Z`);
        endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1, 0);
        const dayCount = endOfMonth.getUTCDate();
        const days = Array.from({ length: dayCount }, (_, index) => index + 1);
        createBarChart('dailyActivityChart', () => days, data.dailyActivity.slice(0, dayCount), 'chartMessages');
        createTimeOfDayChart(data.timeOfDay, 'monthlyTimeOfDayChart');
        createMessageTypesChart(data.messageTypes, 'monthlyMessageTypesChart');
        createResponseTimeChart(data.responseTimes, 'monthlyResponseTimeChart');
        createDayOfWeekChart(data.dayOfWeekActivity, 'monthlyDayOfWeekChart');
    }

    function createMonthlyChart(monthsData) {
        const labels = monthsData.map(m => m.month);
        const participants = Array.from(allParticipants);

        const datasets = participants.map((participant, index) => ({
            ...lineAppearance(index),
            data: monthsData.map(m => m.data.participants[participant]?.length || 0)
        }));

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
                participants.forEach((participant, index) => {
                    chartData.datasets[index].label = participantLabel(participant);
                });
                if (chartData.datasets.length > participants.length) {
                    chartData.datasets[participants.length].label = translate('unattributed');
                }
            }
        });
        renderMonthlyChartLegend(chart);
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

    function formatTime(seconds) {
        if (seconds < 60) return `${Math.round(seconds)} ${translate('seconds')}`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} ${translate('minutes')}`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)} ${translate('hours')}`;
        return `${Math.round(seconds / 86400)} ${translate('days')}`;
    }


    function chartSeriesColor(index) {
        const colors = [chartTheme.accent, '#a76d3a', '#6379a6', '#a2678f',
            '#74854b', '#5a8890', '#bd775d', '#817a9f', '#977637', '#6d54a2', '#ae6b79', '#348076'];
        return colors[index % colors.length];
    }

    function messageTypeColorIndex(label = '') {
        const knownTypes = ['text', 'photo', 'video_file', 'voice_message',
            'sticker', 'animation', 'audio_file', 'video_message', 'file', 'poll', 'contact', 'location'];
        const index = knownTypes.indexOf(label);
        if (index >= 0) return index;

        let hash = 0;
        for (const character of label) {
            hash = (Math.imul(hash, 31) + character.codePointAt(0)) >>> 0;
        }
        return hash;
    }

    // --- Helper Functions for HTML Generation ---

    function getParticipantTotals(messages) {
        const totalsByParticipant = new Map();
        for (const message of messages) {
            if (!message.from) continue;
            let totals = totalsByParticipant.get(message.from);
            if (!totals) {
                totals = { messageCount: 0, textLength: 0 };
                totalsByParticipant.set(message.from, totals);
            }
            totals.messageCount++;
            totals.textLength += countTextCharacters(getMessageText(message.text));
        }
        return totalsByParticipant;
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
            getParticipantTotals(monthData.data.messages),
            `telegram-analyzer-${monthData.month}-participants.csv`
        );
    }

    function downloadParticipantSummary(participantTotals, filename) {
        if (participantTotals.size === 0) return;
        const rows = ['Участник,Сообщения,Средняя длина сообщения'];
        for (const [participant, { messageCount, textLength }] of participantTotals) {
            const name = String(participant);
            // Prevent spreadsheet programs from treating an imported name as a formula.
            const safeName = /^\s*[=+@＝＋＠－-]|^[\t\r\n]/u.test(name) ? "'" + name : name;
            rows.push(`"${safeName.replaceAll('"', '""')}",${messageCount},${(textLength / messageCount).toFixed(1)}`);
        }
        const blob = new Blob(['\uFEFF', rows.join('\r\n'), '\r\n'], { type: 'text/csv;charset=utf-8' });
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
                    const avgTime = initiatorDelays[initiator]?.toFixed(1) || 'N/A';
                    html += `<li>${translate('toParticipant')} <strong>${sanitizedInitiator}</strong>: ${avgTime} ${translate('minutes')}</li>`;
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
