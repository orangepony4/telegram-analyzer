document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('jsonFile');
    const statsContainer = document.querySelector('.stats-container');
    const currentMonthDisplay = document.getElementById('currentMonth');
    const prevMonthButton = document.getElementById('prevMonth');
    const nextMonthButton = document.getElementById('nextMonth');
    const ignoredThresholdInput = document.getElementById('ignoredThreshold');

    // --- HTML Element IDs (Updated)
    const averageResponseDelayStatsElement = document.getElementById('averageResponseDelayStats'); // Renamed from averageResponseTimes
    const thresholdExceededMessagesStatsElement = document.getElementById('thresholdExceededMessagesStats'); // Renamed from ignoredMessagesStats
    const monthlyAverageResponseDelayStatsElement = document.getElementById('monthlyAverageResponseDelayStats'); // Renamed from monthlyIgnoringStats
    const monthlyThresholdExceededMessagesStatsElement = document.getElementById('monthlyThresholdExceededMessagesStats'); // Renamed from monthlyIgnoredMessagesStats

    let currentData = null;
    let currentMonthIndex = 0;
    let monthsData = [];
    let allParticipants = new Set();
    let ignoredMessageThreshold = 3600; // Порог игнорирования по умолчанию: 1 час (в секундах)

    // Установка темной темы для Chart.js
    Chart.defaults.color = '#e4e6ea';
    Chart.defaults.borderColor = '#2a2d31';

    // Обработчики вкладок
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

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
        ignoredMessageThreshold = parseInt(e.target.value) * 60; // Переводим минуты в секунды
        if (currentData) {
            analyzeChat(currentData); // Переанализируем данные с новым порогом
        }
    });

    fileInput.addEventListener('change', handleFileSelect);

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) {
            console.warn('Файл не выбран.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                currentData = JSON.parse(e.target.result);
                analyzeChat(currentData);
                statsContainer.style.display = 'block';
                animateCards();
            } catch (error) {
                console.error('Ошибка разбора JSON файла:', error);
                alert('Ошибка обработки файла. Пожалуйста, убедитесь, что файл JSON корректен.');
                statsContainer.style.display = 'none';
            }
        };
        reader.onerror = () => {
            console.error('Ошибка чтения файла');
            alert('Не удалось прочитать файл.');
            statsContainer.style.display = 'none';
        };
        reader.readAsText(file);
    }

    // Helper function to sanitize HTML and prevent XSS
    function sanitizeHTML(text) {
        const temp = document.createElement('div');
        temp.textContent = text;
        return temp.innerHTML;
    }

    function animateCards() {
        document.querySelectorAll('.card').forEach((card, index) => {
            card.style.animation = `slideUp 0.8s ease-out ${index * 0.1}s both`;
        });
    }

    function analyzeChat(data) {
        if (!data || !data.messages || !Array.isArray(data.messages)) {
            console.error('Некорректные данные чата:', data);
            alert('Файл JSON не содержит корректных данных чата.');
            return;
        }

        const messages = data.messages;
        allParticipants = new Set(messages.map(m => m.from).filter(name => name));

        // Подготовка данных по месяцам
        const messagesByMonth = {};
        messages.forEach((msg, index) => {
            const date = new Date(msg.date);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!msg.from) return;

            if (!messagesByMonth[monthKey]) {
                messagesByMonth[monthKey] = {
                    messages: [],
                    participants: {},
                    messageTypes: {},
                    timeOfDay: new Array(24).fill(0),
                    responseTimes: {},
                    wordCounts: {},
                    mediaTypesStats: {},
                    dayOfWeekActivity: new Array(7).fill(0)
                };
                allParticipants.forEach(p => {
                    messagesByMonth[monthKey].participants[p] = [];
                    messagesByMonth[monthKey].responseTimes[p] = {};
                    messagesByMonth[monthKey].wordCounts[p] = 0;
                    messagesByMonth[monthKey].mediaTypesStats[p] = {};
                    allParticipants.forEach(recipient => {
                        if (recipient !== p) {
                            messagesByMonth[monthKey].responseTimes[p][recipient] = [];
                        }
                    });
                });
            }

            messagesByMonth[monthKey].messages.push(msg);
            messagesByMonth[monthKey].participants[msg.from].push(msg);

            const type = msg.media_type || 'text';
            messagesByMonth[monthKey].messageTypes[type] = (messagesByMonth[monthKey].messageTypes[type] || 0) + 1;
            if (type !== 'text') {
                messagesByMonth[monthKey].mediaTypesStats[msg.from][type] = (messagesByMonth[monthKey].mediaTypesStats[msg.from][type] || 0) + 1;
            }

            messagesByMonth[monthKey].timeOfDay[date.getHours()]++;
            messagesByMonth[monthKey].dayOfWeekActivity[date.getDay()]++;

            if (msg.text && typeof msg.text === 'string') {
                const words = msg.text.split(/\s+/).filter(word => word.length > 0);
                messagesByMonth[monthKey].wordCounts[msg.from] += words.length;
            }

            // Расчет времени ответа
            if (index > 0) {
                const prevMsg = messages[index - 1];
                if (prevMsg.from !== msg.from && prevMsg.from && msg.from) {
                    const responseTime = (new Date(msg.date) - new Date(prevMsg.date)) / 1000;
                    if (!messagesByMonth[monthKey].responseTimes[prevMsg.from][msg.from]) {
                        messagesByMonth[monthKey].responseTimes[prevMsg.from][msg.from] = [];
                    }
                    messagesByMonth[monthKey].responseTimes[prevMsg.from][msg.from].push(responseTime);
                }
            }
        });

        // Сортируем месяцы
        monthsData = Object.entries(messagesByMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({ month, data }));

        // Показываем общую статистику
        displayGeneralStats(data.messages, allParticipants);
        displayAverageResponseDelayStats(calculateAverageResponseDelay(messagesByMonth)); // Renamed function call
        displayWordCountStats(calculateTotalWordCounts(messages));
        displayMediaTypeStats(calculateMediaTypeUsage(messages));
        displayThresholdExceededMessagesStats(calculateThresholdExceededMessages(messages, ignoredMessageThreshold)); // Renamed function call

        // Создаем графики общей статистики
        const allTimeData = calculateAllTimeStats(messages);
        createMonthlyChart(monthsData);
        createResponseTimeChart(allTimeData.responseTimes);
        createTimeOfDayChart(allTimeData.timeOfDay);
        createMessageTypesChart(allTimeData.messageTypes);
        createDayOfWeekChart(allTimeData.dayOfWeekActivity);

        // Показываем статистику за последний месяц
        currentMonthIndex = monthsData.length - 1;
        updateMonthlyStats();
    }

    function calculateAllTimeStats(messages) {
        const timeOfDay = new Array(24).fill(0);
        const messageTypes = {};
        const responseTimes = {};
        const dayOfWeekActivity = new Array(7).fill(0);

        allParticipants.forEach(p => {
            responseTimes[p] = {};
            allParticipants.forEach(recipient => {
                if (recipient !== p) {
                    responseTimes[p][recipient] = [];
                }
            });
        });

        messages.forEach((msg, index) => {
            const date = new Date(msg.date);
            timeOfDay[date.getHours()]++;
            dayOfWeekActivity[date.getDay()]++;

            const type = msg.media_type || 'text';
            messageTypes[type] = (messageTypes[type] || 0) + 1;

            if (index > 0) {
                const prevMsg = messages[index - 1];
                if (prevMsg.from !== msg.from && prevMsg.from && msg.from) {
                    const responseTime = (new Date(msg.date) - new Date(prevMsg.date)) / 1000;
                    if (!responseTimes[prevMsg.from][msg.from]) {
                        responseTimes[prevMsg.from][msg.from] = [];
                    }
                    responseTimes[prevMsg.from][msg.from].push(responseTime);
                }
            }
        });

        return { timeOfDay, messageTypes, responseTimes, dayOfWeekActivity };
    }

    function displayGeneralStats(messages, participants) {
        const messageCountElement = document.getElementById('messageCount');
        const participantStatsElement = document.getElementById('participantStats');

        // Calculate average response time separately as it wasn't refactored into generateParticipantStatsHTML
        let avgResponseTimeHTML = '<h3><i class="fas fa-calculator"></i> Среднее время ответа по участникам:</h3><ul>';
        participants.forEach(participant => {
             if (participant) {
                 const sanitizedParticipant = sanitizeHTML(participant);
                 const avgTime = calculateAverageResponseTimeForParticipant(messages, participant);
                 avgResponseTimeHTML += `<li><strong>${sanitizedParticipant}</strong>: ${avgTime}</li>`;
             }
        });
        avgResponseTimeHTML += '</ul>';


        messageCountElement.innerHTML = `<h3><i class="fas fa-comments"></i> Всего сообщений: ${messages.length}</h3>`;
        // Combine participant stats and average response time
        participantStatsElement.innerHTML = generateParticipantStatsHTML(messages, participants) + avgResponseTimeHTML;
    }

    function calculateAverageResponseTimeForParticipant(messages, participant) {
        let totalResponseTime = 0;
        let responseCount = 0;
        let lastMessageFromOther = null;

        for (const msg of messages) {
            if (msg.from === participant) {
                if (lastMessageFromOther) {
                    const responseTime = (new Date(msg.date) - new Date(lastMessageFromOther.date)) / 1000;
                    totalResponseTime += responseTime;
                    responseCount++;
                }
            } else {
                lastMessageFromOther = msg;
            }
        }

        if (responseCount === 0) {
            return 'Нет данных';
        }

        const averageResponseTime = totalResponseTime / responseCount;
        return formatTime(averageResponseTime);
    }


    function calculateAverageResponseDelay(messagesByMonth) {
        const avgDelayStats = {};
        allParticipants.forEach(responder => {
            avgDelayStats[responder] = {};
            allParticipants.forEach(initiator => {
                if (responder !== initiator) {
                    avgDelayStats[responder][initiator] = { totalTime: 0, count: 0 };
                }
            });
        });

        for (const monthKey in messagesByMonth) {
            const monthMessages = messagesByMonth[monthKey].messages;
            for (let i = 1; i < monthMessages.length; i++) {
                const currentMsg = monthMessages[i];
                const prevMsg = monthMessages[i - 1];

                // Check if current message is a response from a different person
                if (prevMsg.from && currentMsg.from && prevMsg.from !== currentMsg.from) {
                    const responder = currentMsg.from;
                    const initiator = prevMsg.from;
                    const responseTime = (new Date(currentMsg.date) - new Date(prevMsg.date)) / 1000; // in seconds

                    if (avgDelayStats[responder] && avgDelayStats[responder][initiator]) {
                        avgDelayStats[responder][initiator].totalTime += responseTime;
                        avgDelayStats[responder][initiator].count++;
                    }
                }
            }
        }

        // Calculate averages in minutes
        const finalAvgDelays = {};
        for (const responder in avgDelayStats) {
            if (!finalAvgDelays[responder]) finalAvgDelays[responder] = {};
            for (const initiator in avgDelayStats[responder]) {
                const stats = avgDelayStats[responder][initiator];
                if (stats.count > 0) {
                    finalAvgDelays[responder][initiator] = (stats.totalTime / stats.count) / 60; // Average delay in minutes
                }
            }
            // Clean up if no responses were recorded for this responder
            if (Object.keys(finalAvgDelays[responder]).length === 0) {
                delete finalAvgDelays[responder];
            }
        }

        return finalAvgDelays;
    }

    function displayAverageResponseDelayStats(avgDelayStats) { // Renamed from displayIgnoringStats
        const title = '<i class="fas fa-hourglass-half"></i> Средняя задержка ответа (в минутах):'; // Updated title
        averageResponseDelayStatsElement.innerHTML = generateAverageResponseDelayHTML(avgDelayStats, title);
    }

    function calculateTotalWordCounts(messages) {
        const wordCounts = {};
        allParticipants.forEach(p => wordCounts[p] = 0);
        messages.forEach(msg => {
            if (msg.from && msg.text && typeof msg.text === 'string') {
                const words = msg.text.split(/\s+/).filter(word => word.length > 0);
                wordCounts[msg.from] += words.length;
            }
        });
        return wordCounts;
    }

    function displayWordCountStats(wordCounts) {
        const wordCountStatsElement = document.getElementById('wordCountStats');
        const title = '<i class="fas fa-font"></i> Общее количество слов:';
        wordCountStatsElement.innerHTML = generateWordCountHTML(wordCounts, title);
    }

    function calculateMediaTypeUsage(messages) {
        const mediaTypeUsage = {};
        allParticipants.forEach(p => mediaTypeUsage[p] = {});
        messages.forEach(msg => {
            if (msg.from && msg.media_type && msg.media_type !== 'text') {
                mediaTypeUsage[msg.from][msg.media_type] = (mediaTypeUsage[msg.from][msg.media_type] || 0) + 1;
            }
        });
        return mediaTypeUsage;
    }

    function displayMediaTypeStats(mediaTypeUsage) {
        const mediaTypeStatsElement = document.getElementById('mediaTypeStats');
        const title = '<i class="fas fa-camera-retro"></i> Использование медиафайлов:';
        mediaTypeStatsElement.innerHTML = generateMediaTypeHTML(mediaTypeUsage, title);
    }

    function calculateDayOfWeekActivity(messages) {
        const dayOfWeekActivity = new Array(7).fill(0); // 0: Вс, 1: Пн, ..., 6: Сб
        messages.forEach(msg => {
            const date = new Date(msg.date);
            const dayOfWeek = date.getDay();
            dayOfWeekActivity[dayOfWeek]++;
        });
        return dayOfWeekActivity;
    }

    function createDayOfWeekChart(dayOfDayActivity) {
        const daysLabels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        createChart('dayOfWeekChart', {
            type: 'bar',
            data: {
                labels: daysLabels,
                datasets: [{
                    label: 'Сообщений',
                    data: dayOfDayActivity,
                    backgroundColor: getRandomColor(0.7),
                    borderColor: getRandomColor(),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    function calculateThresholdExceededMessages(messages, thresholdSeconds) { // Renamed from calculateIgnoredMessages
        const thresholdMessages = {}; // Renamed variable
        allParticipants.forEach(sender => {
            thresholdMessages[sender] = {};
            allParticipants.forEach(recipient => {
                if (sender !== recipient) {
                    thresholdMessages[sender][recipient] = 0;
                }
            });
        });

        for (let i = 1; i < messages.length; i++) {
            const currentMsg = messages[i];
            const prevMsg = messages[i - 1];

            if (prevMsg.from && currentMsg.from && prevMsg.from !== currentMsg.from) {
                const responseTime = (new Date(currentMsg.date) - new Date(prevMsg.date)) / 1000;
                if (responseTime > thresholdSeconds) {
                    // Message from prevMsg.from to currentMsg.from exceeded threshold
                    if (thresholdMessages[prevMsg.from]) { // Check if sender exists
                        thresholdMessages[prevMsg.from][currentMsg.from]++;
                    } else {
                        // Handle cases where sender might not be in allParticipants (e.g., left chat)
                         // console.warn(`Sender ${prevMsg.from} not found in initial participant list.`);
                         // Optionally initialize here if needed, but it might distort stats if they weren't active otherwise
                    }
                }
            }
        }
        return thresholdMessages; // Renamed variable
    }

    function displayThresholdExceededMessagesStats(thresholdMessages) { // Renamed from displayIgnoredMessagesStats
        const title = `<i class="fas fa-eye-slash"></i> Количество сообщений с ответом > ${ignoredMessageThreshold / 60} мин:`; // Updated title
        thresholdExceededMessagesStatsElement.innerHTML = generateThresholdExceededMessagesHTML(thresholdMessages, title);
    }


    function updateMonthlyStats() {
        if (!monthsData.length) return;

        const monthData = monthsData[currentMonthIndex];
        const monthDate = new Date(monthData.month + '-01');
        const monthName = monthDate.toLocaleString('ru', { month: 'long', year: 'numeric' });
        currentMonthDisplay.textContent = monthName;

        displayMonthlyStats(monthData);
        createMonthlyCharts(monthData);
    }

    function displayMonthlyStats(monthData) {
        const { data, month } = monthData;
        const monthlyMessageCountElement = document.getElementById('monthlyMessageCount');
        const monthlyParticipantStatsElement = document.getElementById('monthlyParticipantStats');
        const monthlyWordCountStatsElement = document.getElementById('monthlyWordCountStats');
        const monthlyMediaTypeStatsElement = document.getElementById('monthlyMediaTypeStats');
        const monthlyThresholdExceededMessagesStatsElement = document.getElementById('monthlyThresholdExceededMessagesStats'); // Renamed from monthlyIgnoredMessagesStats
        const monthDate = new Date(month + '-01');
        const monthName = monthDate.toLocaleString('ru', { month: 'long', year: 'numeric' });


        monthlyMessageCountElement.innerHTML = `<h3><i class="fas fa-comments"></i> Всего сообщений за ${sanitizeHTML(monthName)}: ${data.messages.length}</h3>`; // Sanitize month name just in case

        // Use helper functions for monthly stats display
        monthlyParticipantStatsElement.innerHTML = generateParticipantStatsHTML(data.messages, Object.keys(data.participants).filter(p => p));

        monthlyWordCountStatsElement.innerHTML = generateWordCountHTML(data.wordCounts, '<i class="fas fa-font"></i> Количество слов:');

        monthlyMediaTypeStatsElement.innerHTML = generateMediaTypeHTML(data.mediaTypesStats, '<i class="fas fa-camera-retro"></i> Использование медиафайлов:');

        const monthlyThresholdMessages = calculateMonthlyThresholdExceededMessages(monthData, ignoredMessageThreshold); // Renamed call
        const ignoredTitle = `<i class="fas fa-eye-slash"></i> Сообщений с ответом > ${ignoredMessageThreshold / 60} мин (за месяц):`; // Updated title
        monthlyThresholdExceededMessagesStatsElement.innerHTML = generateThresholdExceededMessagesHTML(monthlyThresholdMessages, ignoredTitle); // Renamed Element ID & helper

        const monthlyAvgDelayStats = calculateMonthlyAverageResponseDelay(monthData); // Renamed call
        const ignoringTitle = `<i class="fas fa-hourglass-half"></i> Средняя задержка ответа (за месяц, в минутах):`; // Updated title
        monthlyAverageResponseDelayStatsElement.innerHTML = generateAverageResponseDelayHTML(monthlyAvgDelayStats, ignoringTitle); // Renamed Element ID & helper


        createMonthlyDayOfWeekChart(data.dayOfWeekActivity);

        prevMonthButton.disabled = currentMonthIndex === 0;
        nextMonthButton.disabled = currentMonthIndex === monthsData.length - 1;
    }

    function calculateMonthlyAverageResponseDelay(monthData) { // Renamed from calculateMonthlyIgnoringStats
        // Make sure monthData.data.messages exists
        if (!monthData?.data?.messages) {
            return {};
        }
        // Reuse the main calculation logic but only for this month's messages
        const monthAvgDelayStats = {};
        const participants = new Set(monthData.data.messages.map(m => m.from).filter(Boolean));
        participants.forEach(responder => {
             monthAvgDelayStats[responder] = {};
             participants.forEach(initiator => {
                 if (responder !== initiator) {
                     monthAvgDelayStats[responder][initiator] = { totalTime: 0, count: 0 };
                 }
             });
         });

        const monthMessages = monthData.data.messages;
         for (let i = 1; i < monthMessages.length; i++) {
            const currentMsg = monthMessages[i];
            const prevMsg = monthMessages[i - 1];
            if (prevMsg.from && currentMsg.from && prevMsg.from !== currentMsg.from) {
                const responder = currentMsg.from;
                const initiator = prevMsg.from;
                const responseTime = (new Date(currentMsg.date) - new Date(prevMsg.date)) / 1000;
                 if (monthAvgDelayStats[responder] && monthAvgDelayStats[responder][initiator]) {
                     monthAvgDelayStats[responder][initiator].totalTime += responseTime;
                     monthAvgDelayStats[responder][initiator].count++;
                 }
             }
         }

         // Calculate averages in minutes
         const finalAvgDelays = {};
         for (const responder in monthAvgDelayStats) {
             if (!finalAvgDelays[responder]) finalAvgDelays[responder] = {};
             for (const initiator in monthAvgDelayStats[responder]) {
                 const stats = monthAvgDelayStats[responder][initiator];
                 if (stats.count > 0) {
                     finalAvgDelays[responder][initiator] = (stats.totalTime / stats.count) / 60;
                 }
             }
             if (Object.keys(finalAvgDelays[responder]).length === 0) {
                 delete finalAvgDelays[responder];
             }
         }
          return finalAvgDelays;
    }

    function calculateMonthlyThresholdExceededMessages(monthData, thresholdSeconds) { // Renamed from calculateMonthlyIgnoredMessages
        // Ensure monthData.data.messages exists
        if (!monthData?.data?.messages) {
            return {};
        }
        return calculateThresholdExceededMessages(monthData.data.messages, thresholdSeconds); // Renamed call
    }

    function createMonthlyDayOfWeekChart(dayOfWeekActivity) {
        const daysLabels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        createChart('monthlyDayOfWeekChart', {
            type: 'bar',
            data: {
                labels: daysLabels,
                datasets: [{
                    label: 'Сообщений',
                    data: dayOfWeekActivity,
                    backgroundColor: getRandomColor(0.7),
                    borderColor: getRandomColor(),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });
    }


    function createChart(canvasId, config) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            existingChart.destroy();
        }
        new Chart(ctx, {
            ...config,
            options: {
                ...config.options,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#e4e6ea'
                        }
                    }
                },
                scales: {
                    ...(config.options?.scales || {}),
                    x: {
                        ...(config.options?.scales?.x || {}),
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ...(config.options?.scales?.y || {}),
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function createMonthlyCharts(monthData) {
        const { data } = monthData;

        // График активности по дням
        const dailyActivity = {};
        data.messages.forEach(msg => {
            const date = new Date(msg.date);
            const day = date.getDate();
            dailyActivity[day] = (dailyActivity[day] || 0) + 1;
        });

        const days = Array.from({ length: 31 }, (_, i) => i + 1);
        const dailyData = days.map(day => dailyActivity[day] || 0);

        createChart('dailyActivityChart', {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'Сообщений',
                    data: dailyData,
                    backgroundColor: getRandomColor(0.7),
                    borderColor: getRandomColor(),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
            }
        });

        // График активности по времени суток (месяц)
        createChart('monthlyTimeOfDayChart', {
            type: 'line',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Активность',
                    data: data.timeOfDay,
                    borderColor: getRandomColor(),
                    backgroundColor: getRandomColor(0.2),
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
            }
        });

        // График типов сообщений (месяц)
        createChart('monthlyMessageTypesChart', {
            type: 'doughnut',
            data: {
                labels: Object.keys(data.messageTypes),
                datasets: [{
                    data: Object.values(data.messageTypes),
                    backgroundColor: Object.keys(data.messageTypes).map(() => getRandomColor(0.7))
                }]
            },
            options: { responsive: true }
        });

        // График времени ответа за месяц
        const avgMonthlyResponseTimes = {};
        for (const sender in data.responseTimes) {
            for (const recipient in data.responseTimes[sender]) {
                const times = data.responseTimes[sender][recipient];
                if (times.length > 0) {
                    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length / 60;
                    if (!avgMonthlyResponseTimes[sender]) {
                        avgMonthlyResponseTimes[sender] = {};
                    }
                    avgMonthlyResponseTimes[sender][recipient] = avgTime;
                }
            }
        }

        createChart('monthlyResponseTimeChart', {
            type: 'bar',
            data: {
                labels: Object.keys(avgMonthlyResponseTimes).flatMap(sender => Object.keys(avgMonthlyResponseTimes[sender]).map(recipient => `${sender} -> ${recipient}`)),
                datasets: [{
                    label: 'Среднее время ответа (мин)',
                    data: Object.keys(avgMonthlyResponseTimes).flatMap(sender => Object.keys(avgMonthlyResponseTimes[sender]).map(recipient => avgMonthlyResponseTimes[sender][recipient])),
                    backgroundColor: Object.keys(avgMonthlyResponseTimes).flatMap(sender => Object.keys(avgMonthlyResponseTimes[sender])).map(() => getRandomColor(0.7))
                }]
            },
            options: {
                responsive: true,
            }
        });
         // График активности по дням недели (месяц)
         createMonthlyDayOfWeekChart(data.dayOfWeekActivity);
    }

    function createMonthlyChart(monthsData) {
        const labels = monthsData.map(m => m.month);
        const participants = Array.from(allParticipants);

        const datasets = participants.map(participant => ({
            label: participant,
            data: monthsData.map(m => m.data.participants[participant]?.length || 0),
            borderColor: getRandomColor(),
            backgroundColor: getRandomColor(0.2),
            fill: false,
            tension: 0.4
        }));

        createChart('monthlyChart', {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
            }
        });
    }

    function createResponseTimeChart(responseTimes) {
        const avgTimes = {};
        // This chart might need adjustment based on the new avgDelayStats structure
        // For now, let's keep the old logic for the *overall* response time chart,
        // as it used a different structure (responseTimes[sender][recipient] = [times])
        // TODO: Consider unifying the data structure for all response time calculations.
        for (const sender in responseTimes) {
            for (const recipient in responseTimes[sender]) {
                const times = responseTimes[sender][recipient];
                if (times.length > 0) {
                    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length / 60;
                    if (!avgTimes[sender]) {
                        avgTimes[sender] = {};
                    }
                    avgTimes[sender][recipient] = avgTime;
                }
            }
        }

        createChart('responseTimeChart', {
            type: 'bar',
            data: {
                labels: Object.keys(avgTimes).flatMap(sender => Object.keys(avgTimes[sender]).map(recipient => `${sender} -> ${recipient}`)),
                datasets: [{
                    label: 'Среднее время ответа (мин)',
                    data: Object.keys(avgTimes).flatMap(sender => Object.keys(avgTimes[sender]).map(recipient => avgTimes[sender][recipient])),
                    backgroundColor: Object.keys(avgTimes).flatMap(sender => Object.keys(avgTimes[sender])).map(() => getRandomColor(0.7))
                }]
            },
            options: {
                responsive: true,
            }
        });
    }

    function createTimeOfDayChart(timeOfDay) {
        createChart('timeOfDayChart', {
            type: 'line',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Активность',
                    data: timeOfDay,
                    borderColor: getRandomColor(),
                    backgroundColor: getRandomColor(0.2),
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
            }
        });
    }

    function createMessageTypesChart(messageTypes) {
        createChart('messageTypesChart', {
            type: 'doughnut',
            data: {
                labels: Object.keys(messageTypes),
                datasets: [{
                    data: Object.values(messageTypes),
                    backgroundColor: Object.keys(messageTypes).map(() => getRandomColor(0.7))
                }]
            },
            options: { responsive: true }
        });
    }

    function formatTime(seconds) {
        if (seconds < 60) return `${Math.round(seconds)} сек`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)} ч`;
        return `${Math.round(seconds / 86400)} дн`;
    }


    function getRandomColor(alpha = 1) {
        const colors = [
            '#8774e1', '#6c5ce7', '#a8a4ce', '#9b8cee',
            '#7d71d3', '#5f58a3', '#b4aff0', '#7265e3'
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];
        if (alpha !== 1) {
            return color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        }
        return color;
    }

    // --- Helper Functions for HTML Generation ---

    function generateParticipantStatsHTML(messages, participants) {
        let statsHTML = '<h3><i class="fas fa-users"></i> Статистика по участникам:</h3><ul>';
        participants.forEach(participant => {
            const sanitizedParticipant = sanitizeHTML(participant || 'Неизвестно'); // Sanitize
            const participantMessages = messages.filter(m => m.from === participant);
            const messageCount = participantMessages.length;
            const avgLength = participantMessages.filter(m => m.text && typeof m.text === 'string')
                .reduce((sum, m) => sum + m.text.length, 0) / (messageCount || 1);

            statsHTML += `
                <li>
                    <strong>${sanitizedParticipant}</strong>:
                    <ul>
                        <li><i class="fas fa-comment"></i> Сообщений: ${messageCount}</li>
                        <li><i class="fas fa-text-width"></i> Средняя длина: ${avgLength.toFixed(1)} символов</li>
                    </ul>
                </li>
            `;
        });
        statsHTML += '</ul>';
        return statsHTML;
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
        let html = `<h3>${title}</h3><ul>`;
        const validSenders = Object.keys(thresholdMessages).filter(sender => sender);
        if (validSenders.length === 0) {
            return '<p>Нет данных для этой статистики.</p>';
        }

        validSenders.forEach(sender => {
            const sanitizedSender = sanitizeHTML(sender);
            const recipientCounts = thresholdMessages[sender];
            const validRecipients = Object.keys(recipientCounts).filter(r => r);

             if (validRecipients.length > 0) {
                html += `<li><strong>От ${sanitizedSender}:</strong><ul>`; // Minor text adjustment
                validRecipients.forEach(recipient => {
                    const sanitizedRecipient = sanitizeHTML(recipient);
                    const count = recipientCounts[recipient] || 0;
                    if (count > 0) { // Only show if count > 0
                      html += `<li>К <strong>${sanitizedRecipient}</strong>: ${count}</li>`;
                    }
                });
                 // Only add sender if they have recipients with count > 0
                 if (html.endsWith('<ul>')) { // Check if no recipients were added
                     html = html.slice(0, -4); // Remove empty <ul>
                 } else {
                    html += '</ul></li>';
                 }
            }
        });

        // Final check if any list item was actually added
        if (html.endsWith('<ul>')) {
            html = '<p>Нет данных для этой статистики (с учетом порога).</p>';
        } else {
            html += '</ul>';
        }

        return html;
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
                        const sanitizedMediaType = sanitizeHTML(mediaType);
                        mediaTypeHTML += `<li><i class="fas fa-arrow-right"></i> ${sanitizedMediaType}: ${mediaTypeUsage[participant][mediaType]}</li>`;
                    }
                }
                mediaTypeHTML += '</ul></li>';
            }
        }
        mediaTypeHTML += '</ul>';
        return mediaTypeHTML;
    }
});