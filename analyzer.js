document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('jsonFile');
    const demoButton = document.getElementById('loadDemoChat');
    const accountChatChooser = document.getElementById('accountChatChooser');
    const accountChatSelect = document.getElementById('accountChatSelect');
    const analyzeAccountChatButton = document.getElementById('analyzeAccountChat');
    const accountChatStatus = document.getElementById('accountChatStatus');
    const statsContainer = document.querySelector('.stats-container');
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
    const countFormat = new Intl.NumberFormat('ru-RU');
    const THEME_STORAGE_KEY = 'telegramAnalyzerTheme';
    const DARK_THEME_KEY = 'default';
    const LIGHT_THEME_KEY = 'muted-light';
    const DARK_THEME_CLASS = 'theme-default';
    const LIGHT_THEME_CLASS = 'theme-muted-light';
    const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const messageTypeLabels = new Map([
        ['text', 'Текст'], ['photo', 'Фото'], ['video_file', 'Видео'],
        ['voice_message', 'Голосовые'], ['sticker', 'Стикеры'], ['animation', 'Анимации'],
        ['audio_file', 'Аудио'], ['video_message', 'Видеосообщения'], ['file', 'Файлы'],
    ]);
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

    loadDemoChat();

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
        const senders = new Map();
        const idsByName = new Map();
        const actualNames = new Set();
        const nameOnly = new Set();

        for (const { message, time } of timings) {
            const id = getSenderId(message);
            const name = typeof message.from === 'string' && message.from.trim() ? message.from : null;
            if (name) actualNames.add(name);
            if (!id) {
                if (name) nameOnly.add(name);
                continue;
            }

            let sender = senders.get(id);
            if (!sender) {
                sender = { name: null, dated: false };
                senders.set(id, sender);
            }
            if (!name) continue;

            const knownId = idsByName.get(name);
            if (knownId !== id) idsByName.set(name, knownId === undefined ? id : null);

            if (sender.name !== name) {
                const dated = Number.isFinite(time);
                if (dated || !sender.dated) {
                    sender.name = name;
                    sender.dated = dated;
                }
            }
        }
        if (senders.size === 0) return;

        // Preserve ambiguous name-only records as their own group.
        const usedLabels = new Set([...nameOnly].filter(name => !idsByName.get(name)));
        const nextSuffixByName = new Map();
        for (const sender of senders.values()) {
            const baseName = sender.name ?? 'Неизвестный участник';
            let label = baseName;
            if (usedLabels.has(label) || (!sender.name && actualNames.has(label))) {
                let suffix = nextSuffixByName.get(baseName) ?? 2;
                do {
                    label = `${baseName} (${suffix++})`;
                } while (usedLabels.has(label) || actualNames.has(label));
                nextSuffixByName.set(baseName, suffix);
            }
            sender.label = label;
            usedLabels.add(label);
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

    function getMessageCategory({ media_type, photo, file }) {
        const type = typeof media_type === 'string' ? media_type.trim() : '';
        if (type) return type;
        // Telegram keeps these fields even when the attachment was not downloaded.
        if (typeof photo === 'string' && photo.trim()) return 'photo';
        if (typeof file === 'string' && file.trim()) return 'file';
        return 'text';
    }

    function validMessages(messages) {
        return Array.isArray(messages) && messages.every(message =>
            message && typeof message === 'object' && !Array.isArray(message));
    }

    function accountChatName(chat) {
        if (typeof chat.name === 'string' && chat.name.trim()) return chat.name.trim();
        switch (chat.type) {
            case 'saved_messages': return 'Избранное';
            case 'replies': return 'Ответы';
            case 'verification_codes': return 'Коды подтверждения';
            default: return 'Чат без названия';
        }
    }

    function findAccountChats(data) {
        const chats = [];
        const groups = [data?.chats?.list, data?.left_chats?.list];
        groups.forEach((list, groupIndex) => {
            if (!Array.isArray(list)) return;
            for (const chat of list) {
                if (!validMessages(chat?.messages)) continue;
                const name = accountChatName(chat);
                const prefix = groupIndex === 1 ? ' · Покинутый чат' : '';
                const label = `${chats.length + 1}. ${name}${prefix} · ${chat.messages.length} сообщ.`;
                chats.push({ name, label, messages: chat.messages });
            }
        });
        return chats;
    }

    function resetAccountChooser() {
        accountChats = [];
        accountChatChooser.hidden = true;
        accountChatSelect.replaceChildren();
        analyzeAccountChatButton.disabled = true;
        accountChatStatus.textContent = '';
    }

    function showAccountChooser(chats) {
        accountChats = chats;
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Выберите чат';
        accountChatSelect.append(placeholder);
        accountChats.forEach((chat, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = chat.label;
            accountChatSelect.append(option);
        });
        accountChatSelect.value = '';
        accountChatChooser.hidden = false;
        accountChatStatus.textContent = 'Выберите чат, чтобы увидеть его статистику.';
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
        const period = reportPeriod();
        const source = isDemo ? 'Вымышленная переписка' : 'Экспорт Telegram';
        setReportHeader(isDemo ? 'Демо-отчёт' : 'Отчёт по чату', name, period ? `${source} · ${period}` : source);
        reportPlaceholder.hidden = true;
    }

    function analyzeAccountChat() {
        const chat = selectedAccountChat();
        if (!chat) return;
        try {
            renderMessages(chat.messages, { name: chat.name, preserveNames: true });
            accountChatStatus.textContent = `Статистика открыта для чата ${chat.label}`;
        } catch (error) {
            console.error('Ошибка анализа выбранного чата:', error);
            clearReport();
            setReportHeader('Экспорт аккаунта', 'Выберите чат', 'Отчёт появится после анализа выбранной переписки.');
            setReportPlaceholder('Чат не открылся', 'Попробуйте выбрать другую переписку из списка.');
            accountChatStatus.textContent = 'Не удалось проанализировать этот чат. Выберите другой.';
        }
    }

    function reportPeriod() {
        if (!monthsData.length) return '';
        const first = new Date(`${monthsData[0].month}-01T00:00:00Z`);
        if (monthsData.length === 1) return monthFormat.format(first);
        const last = new Date(`${monthsData.at(-1).month}-01T00:00:00Z`);
        return monthFormat.formatRange(first, last);
    }

    function setReportHeader(kind, title, meta) {
        reportKind.textContent = kind;
        reportTitle.textContent = title;
        reportMeta.textContent = meta;
    }

    function setReportPlaceholder(title, text) {
        placeholderTitle.textContent = title;
        placeholderText.textContent = text;
        reportPlaceholder.hidden = false;
    }

    function clearReport() {
        statsContainer.style.display = 'none';
        renderedCharts.forEach(chart => chart.destroy());
        renderedCharts.clear();
        overallResponseTimes = null;
        overallParticipantTotals = new Map();
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
            placeholderTitle: placeholderTitle.textContent,
            placeholderText: placeholderText.textContent,
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
        } else {
            setReportPlaceholder(previous.placeholderTitle, previous.placeholderText);
        }
    }

    function processSelectedFile(file, { isDemo = false } = {}) {
        if (!file) {
            return;
        }

        if (!isJsonFile(file)) {
            showFileError('Выберите JSON из Telegram Desktop.');
            clearFileInput();
            return;
        }

        const reader = new FileReader();
        const previous = activeImport ? activeImport.previous : suspendImportView();
        const request = { previous };
        activeImport = request;
        const hasPrevious = previous.reportVisible || previous.chooserVisible;
        const sourceName = isDemo ? 'Встроенный пример' : file.name;
        const describeFailure = message => `«${sourceName}»: ${message}`;

        showFileError('');
        if (!hasPrevious) {
            setReportHeader(isDemo ? 'Демо-отчёт' : 'Импорт', isDemo ? 'Демонстрационный чат' : 'Открываем экспорт',
                isDemo ? 'Вымышленная переписка' : 'Данные читаются в браузере');
        }
        setReportPlaceholder(isDemo ? 'Подготовка примера' : 'Чтение файла', 'Отчёт появится после обработки данных.');
        showLoadingIndicator();

        const finish = status => {
            activeImport = null;
            hideLoadingIndicator(status);
            clearFileInput();
        };
        const rejectImport = message => {
            if (hasPrevious) {
                restoreImportView(previous);
                showFileError(describeFailure(message));
            } else {
                updateSelectedFileName(sourceName);
                showImportFailure(describeFailure(message));
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
                    rejectImport('В файле нет истории чата. Выберите экспорт чата или аккаунта из Telegram Desktop.');
                    return;
                }

                replacing = true;
                updateSelectedFileName(sourceName);
                resetAccountChooser();
                clearReport();
                if (messages) {
                    sourceFileType.textContent = isDemo ? 'Демо-данные' : 'Файл на устройстве';
                    const name = typeof data.name === 'string' ? data.name.trim() : '';
                    renderMessages(messages, { name: name || file.name, isDemo });
                    status = 'Анализ завершён. Статистика доступна ниже.';
                } else {
                    showAccountChooser(chats);
                    sourceFileType.textContent = 'Экспорт аккаунта';
                    setReportHeader('Экспорт аккаунта', 'Выберите чат', 'В файле несколько переписок. Анализ строится по одной.');
                    setReportPlaceholder('Чат ещё не выбран', 'Выберите переписку в блоке «Данные чата» и нажмите «Показать статистику».');
                    status = 'Экспорт аккаунта загружен. Выберите чат для анализа.';
                }
            } catch (error) {
                if (replacing) {
                    console.error('Ошибка анализа экспорта:', error);
                    clearReport();
                    showImportFailure(describeFailure('Не удалось построить отчёт по этому экспорту.'));
                } else {
                    rejectImport('Проверьте, что файл содержит корректный экспорт в формате JSON.');
                }
            } finally {
                finish(status);
            }
        };

        const readFailed = () => {
            if (activeImport !== request) return;
            rejectImport('Файл не прочитан. Попробуйте открыть его ещё раз.');
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
        importStatus.textContent = 'Загрузка и анализ данных...';
    }

    function hideLoadingIndicator(status = '') {
        loadingIndicator.style.display = 'none';
        importStatus.textContent = status;
    }

    function updateSelectedFileName(fileName) {
        if (!dropFileNameElement) {
            return;
        }
        dropFileNameElement.textContent = fileName || '';
        if (fileName) {
            dropFileNameElement.title = fileName;
        } else {
            dropFileNameElement.removeAttribute('title');
        }
    }

    function showFileError(message) {
        fileError.textContent = message;
        fileError.hidden = !message;
    }

    function showImportFailure(message) {
        showFileError(message);
        sourceFileType.textContent = 'Ошибка чтения';
        setReportHeader('Импорт', 'Файл не открылся', 'Выберите экспорт Telegram Desktop.');
        setReportPlaceholder('Отчёт недоступен', 'Можно открыть другой JSON или вернуться к демо-чату.');
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
            themeToggleBtn.title = 'Переключить на тёмную тему';
            themeToggleBtn.setAttribute('aria-label', 'Переключить на тёмную тему');
            if (themeToggleIcon) {
                themeToggleIcon.classList.add('fa-moon');
            }
        } else {
            themeToggleBtn.title = 'Переключить на светлую тему';
            themeToggleBtn.setAttribute('aria-label', 'Переключить на светлую тему');
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
        const participantTotals = getParticipantTotals(messages);
        displayGeneralStats(messages, participantTotals, responseTimes);
        displayAverageResponseDelayStats(calculateAverageResponseDelay(responseTimes));
        displayWordCountStats(calculateTotalWordCounts(messages));
        displayMediaTypeStats(calculateMediaTypeUsage(messages));
        displayThresholdExceededMessagesStats(calculateThresholdExceededMessages(responseTimes, ignoredMessageThreshold));

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
        overallResponseTimes = responseTimes;
        overallParticipantTotals = participantTotals;
        exportParticipantsButton.disabled = participantTotals.size === 0;
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

    function displayGeneralStats(messages, participantTotals, responseTimes) {
        const messageCountElement = document.getElementById('messageCount');
        const participantStatsElement = document.getElementById('participantStats');

        // Calculate average response time separately as it wasn't refactored into generateParticipantStatsHTML
        let avgResponseTimeHTML = '<h3><i class="fas fa-calculator" aria-hidden="true"></i> Среднее время ответа по участникам:</h3><ul>';
        for (const participant of participantTotals.keys()) {
             if (participant) {
                 const sanitizedParticipant = sanitizeHTML(participant);
                 const avgTime = calculateAverageResponseTimeForParticipant(responseTimes, participant);
                 avgResponseTimeHTML += `<li><strong>${sanitizedParticipant}</strong>: ${avgTime}</li>`;
             }
        }
        avgResponseTimeHTML += '</ul>';


        setMessageMetric(messageCountElement, messages.length);
        document.getElementById('overviewParticipantCount').textContent = countFormat.format(participantTotals.size);
        document.getElementById('overviewMonthCount').textContent = countFormat.format(monthsData.length);
        // Combine participant stats and average response time
        participantStatsElement.innerHTML = generateParticipantStatsHTML(participantTotals) + avgResponseTimeHTML;
    }

    function setMessageMetric(element, count) {
        element.innerHTML = `<span class="metric-label">Сообщения</span><strong class="metric-value">${countFormat.format(count)}</strong>`;
    }

    function calculateAverageResponseTimeForParticipant(responseTimes, participant) {
        let totalSeconds = 0;
        let responseCount = 0;
        for (const responders of Object.values(responseTimes)) {
            const times = responders[participant] ?? [];
            totalSeconds += times.reduce((sum, seconds) => sum + seconds, 0);
            responseCount += times.length;
        }
        return responseCount ? formatTime(totalSeconds / responseCount) : 'Нет данных';
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

    function displayAverageResponseDelayStats(avgDelayStats) { // Renamed from displayIgnoringStats
        const title = '<i class="fas fa-hourglass-half" aria-hidden="true"></i> Средняя задержка ответа (в минутах):'; // Updated title
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
        const title = '<i class="fas fa-font" aria-hidden="true"></i> Общее количество слов:';
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
        const title = '<i class="fas fa-camera-retro" aria-hidden="true"></i> Использование медиафайлов:';
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

    function displayThresholdExceededMessagesStats(thresholdMessages) { // Renamed from displayIgnoredMessagesStats
        const title = `<i class="fas fa-eye-slash" aria-hidden="true"></i> Количество сообщений с ответом > ${ignoredMessageThreshold / 60} мин:`; // Updated title
        thresholdExceededMessagesStatsElement.innerHTML = generateThresholdExceededMessagesHTML(thresholdMessages, title);
    }


    function updateMonthlyStats() {
        if (!monthsData.length) {
            exportMonthlyParticipantsButton.disabled = true;
            return;
        }

        const monthData = monthsData[currentMonthIndex];
        const monthName = new Date(monthData.month + '-01').toLocaleString('ru', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC'
        });
        currentMonthDisplay.textContent = monthName;

        displayMonthlyStats(monthData);
        createMonthlyCharts(monthData);
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

        monthlyWordCountStatsElement.innerHTML = generateWordCountHTML(data.wordCounts, '<i class="fas fa-font" aria-hidden="true"></i> Количество слов:');

        monthlyMediaTypeStatsElement.innerHTML = generateMediaTypeHTML(data.mediaTypesStats, '<i class="fas fa-camera-retro" aria-hidden="true"></i> Использование медиафайлов:');

        displayMonthlyThresholdStats(monthData);

        const monthlyAvgDelayStats = calculateAverageResponseDelay(data.responseTimes);
        const ignoringTitle = `<i class="fas fa-hourglass-half" aria-hidden="true"></i> Средняя задержка ответа (за месяц, в минутах):`; // Updated title
        monthlyAverageResponseDelayStatsElement.innerHTML = generateAverageResponseDelayHTML(monthlyAvgDelayStats, ignoringTitle); // Renamed Element ID & helper


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
        const title = `<i class="fas fa-eye-slash" aria-hidden="true"></i> Сообщений с ответом > ${ignoredMessageThreshold / 60} мин (за месяц):`;
        monthlyThresholdExceededMessagesStatsElement.innerHTML = generateThresholdExceededMessagesHTML(thresholdMessages, title);
    }

    function createChart(canvasId, { type, data, decimalTicks = false }) {
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
            responsive: true,
            maintainAspectRatio: false,
            animation: chartAnimation(),
            interaction: type === 'line' ? { mode: 'index', intersect: false } : undefined,
            plugins: {
                legend: {
                    display: doughnut || canvasId === 'monthlyChart',
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

        renderedCharts.set(canvasId, new Chart(ctx, { type, data, options }));
    }

    function createMonthlyCharts(monthData) {
        const { data } = monthData;
        const endOfMonth = new Date(`${monthData.month}-01T00:00:00Z`);
        endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1, 0);
        const dayCount = endOfMonth.getUTCDate();
        const days = Array.from({ length: dayCount }, (_, index) => index + 1);
        createBarChart('dailyActivityChart', days, data.dailyActivity.slice(0, dayCount), 'Сообщений');
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
            label: participant,
            data: monthsData.map(m => m.data.participants[participant]?.length || 0)
        }));

        const unattributed = monthsData.map(m => m.data.unattributedCount);
        if (unattributed.some(Boolean)) {
            datasets.push({
                ...lineAppearance(datasets.length),
                label: 'Записи без отправителя',
                data: unattributed,
                borderDash: [4, 4]
            });
        }
        createChart('monthlyChart', { type: 'line', data: { labels, datasets } });
    }

    function createResponseTimeChart(responseTimes, canvasId = 'responseTimeChart') {
        const labels = [];
        const minutes = [];
        for (const [sender, recipients] of Object.entries(responseTimes)) {
            for (const [recipient, times] of Object.entries(recipients)) {
                if (!times.length) continue;
                labels.push(`${sender} -> ${recipient}`);
                minutes.push(times.reduce((sum, seconds) => sum + seconds, 0) / times.length / 60);
            }
        }

        createBarChart(canvasId, labels, minutes, 'Среднее время ответа (мин)', true);
    }

    function createDayOfWeekChart(activity, canvasId = 'dayOfWeekChart') {
        createBarChart(canvasId, ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'], activity, 'Сообщений');
    }

    function createBarChart(canvasId, labels, data, label, decimalTicks = false) {
        createChart(canvasId, {
            type: 'bar',
            decimalTicks,
            data: {
                labels,
                datasets: [{
                    label,
                    data,
                    backgroundColor: () => chartTheme.accent,
                    borderRadius: 4,
                    maxBarThickness: 28
                }]
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
                    label: 'Активность',
                    data: timeOfDay
                }]
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
                labels: types.map(type => messageTypeLabels.get(type) ?? type),
                datasets: [{
                    data: Object.values(messageTypes),
                    backgroundColor: ({ dataIndex }) => chartSeriesColor(messageTypeColorIndex(types[dataIndex])),
                    borderColor: () => chartTheme.surface,
                    hoverBorderColor: () => chartTheme.surface,
                    borderWidth: 2,
                    hoverOffset: 3
                }]
            }
        });
    }

    function formatTime(seconds) {
        if (seconds < 60) return `${Math.round(seconds)} сек`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)} ч`;
        return `${Math.round(seconds / 86400)} дн`;
    }


    function chartSeriesColor(index) {
        const colors = [chartTheme.accent, '#a76d3a', '#6379a6', '#a2678f',
            '#74854b', '#5a8890', '#bd775d', '#817a9f'];
        return colors[index % colors.length];
    }

    function messageTypeColorIndex(label = '') {
        const knownTypes = ['text', 'photo', 'video_file', 'voice_message',
            'sticker', 'animation', 'audio_file', 'video_message'];
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
            totals.textLength += getMessageText(message.text).length;
        }
        return totalsByParticipant;
    }

    function generateParticipantStatsHTML(totalsByParticipant) {
        let statsHTML = '<h3><i class="fas fa-users" aria-hidden="true"></i> Статистика по участникам:</h3><ul>';
        for (const [participant, { messageCount, textLength }] of totalsByParticipant) {
            const sanitizedParticipant = sanitizeHTML(participant);
            const avgLength = textLength / messageCount;

            statsHTML += `
                <li>
                    <strong>${sanitizedParticipant}</strong>:
                    <ul>
                        <li><i class="fas fa-comment" aria-hidden="true"></i> Сообщений: ${messageCount}</li>
                        <li><i class="fas fa-text-width" aria-hidden="true"></i> Средняя длина: ${avgLength.toFixed(1)} символов</li>
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

    function generateAverageResponseDelayHTML(avgDelayStats, title) { // Renamed from generateIgnoringStatsHTML
        let html = `<h3>${title}</h3><ul>`;
        const validResponders = Object.keys(avgDelayStats).filter(r => r);
        if (validResponders.length === 0) {
            return '<p>Нет данных для этой статистики.</p>';
        }

        validResponders.forEach(responder => {
            const sanitizedResponder = sanitizeHTML(responder);
            const initiatorDelays = avgDelayStats[responder];
            const validInitiators = Object.keys(initiatorDelays).filter(i => i && initiatorDelays[i] !== undefined);

            if (validInitiators.length > 0) {
                html += `<li><strong>Средняя задержка ответа ${sanitizedResponder}:</strong><ul>`; // Updated text
                validInitiators.forEach(initiator => {
                    const sanitizedInitiator = sanitizeHTML(initiator);
                    const avgTime = initiatorDelays[initiator]?.toFixed(1) || 'N/A';
                    html += `<li>К <strong>${sanitizedInitiator}</strong>: ${avgTime} мин</li>`; // Updated text
                });
                html += `</ul></li>`;
            }
        });

        html += '</ul>';
        return html;
    }

    function generateThresholdExceededMessagesHTML(thresholdMessages, title) { // Renamed from generateIgnoredMessagesHTML
        const validSenders = Object.keys(thresholdMessages || {}).filter(Boolean);
        const sections = [];

        validSenders.forEach(sender => {
            const recipientCounts = thresholdMessages[sender] || {};
            const recipientsWithCounts = Object.entries(recipientCounts)
                .filter(([recipient, count]) => Boolean(recipient) && Number(count) > 0);

            if (!recipientsWithCounts.length) {
                return;
            }

            const sanitizedSender = sanitizeHTML(sender);
            const recipientItems = recipientsWithCounts.map(([recipient, count]) => {
                return `<li>К <strong>${sanitizeHTML(recipient)}</strong>: ${count}</li>`;
            }).join('');

            const senderSection = `
                <li>
                    <strong>От ${sanitizedSender}:</strong>
                    <ul>
                        ${recipientItems}
                    </ul>
                </li>
            `;

            sections.push(senderSection);
        });

        if (!sections.length) {
            return '<p>Нет данных для этой статистики (с учетом порога).</p>';
        }

        return `<h3>${title}</h3><ul>${sections.join('')}</ul>`;
    }

    function generateWordCountHTML(wordCounts, title) {
        let wordCountHTML = `<h3>${title}</h3><ul>`;
        for (const participant in wordCounts) {
            if (Object.hasOwnProperty.call(wordCounts, participant) && participant) {
                const sanitizedParticipant = sanitizeHTML(participant);
                wordCountHTML += `<li><strong>${sanitizedParticipant}</strong>: ${wordCounts[participant]} слов</li>`;
            }
        }
        wordCountHTML += '</ul>';
        return wordCountHTML;
    }

    function generateMediaTypeHTML(mediaTypeUsage, title) {
        let mediaTypeHTML = `<h3>${title}</h3><ul>`;
        for (const participant in mediaTypeUsage) {
             if (Object.hasOwnProperty.call(mediaTypeUsage, participant) && participant && Object.keys(mediaTypeUsage[participant]).length > 0) {
                const sanitizedParticipant = sanitizeHTML(participant);
                mediaTypeHTML += `<li><strong>${sanitizedParticipant}</strong>:<ul>`;
                for (const mediaType in mediaTypeUsage[participant]) {
                    if (Object.hasOwnProperty.call(mediaTypeUsage[participant], mediaType)) {
                        const sanitizedMediaType = sanitizeHTML(messageTypeLabels.get(mediaType) ?? mediaType);
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
