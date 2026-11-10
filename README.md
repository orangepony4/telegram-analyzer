# Telegram Analyzer

**[English](#english) · [Русский](#русский)**

## English

Analyze Telegram Desktop chat exports in your browser. See who participates, when the conversation is most active, and how long responses take.

**[Try in browser →](https://orangepony4.github.io/telegram-analyzer/)**

[Analyze my export](https://orangepony4.github.io/telegram-analyzer/?view=upload) · [Download the offline ZIP](https://github.com/orangepony4/telegram-analyzer/releases/latest) · [View source code](https://github.com/orangepony4/telegram-analyzer/tree/main)

The app opens with a fictional three-month conversation. Explore the charts and download a sample CSV right away. **Analyze my export** opens the upload view. Choose **Sample chat** to open the example or **Download sample JSON** to save the same conversation and try importing it yourself with **Open JSON**. The interface starts in English. Use **RU** in the header to switch to Russian without reopening the report.

![Telegram Analyzer showing monthly activity and message types for a fictional chat](docs/preview.webp)

### Analyze your own chat

1. In Telegram Desktop, open a private chat, group, or channel. Choose **Export chat history** from the chat menu, select **JSON**, and export. You can leave the media download options unchecked.
2. Select **Open JSON** or drop the exported file, usually `result.json`, into the import area. While the file is being read, **Cancel import** lets you stop the read and return to your previous report or chat selection.
3. If you open an account export containing chat history, enter any part of a name in **Find a chat by name** to narrow the list. If the export contains several chat types, combine the search with **Chat type**. The selected chat's full name, message count, and list number appear below the controls. Choose **Analyze chat** to open its report and CSV exports.
4. Open **Overview** for the full chat or **By month** to jump to any month with records. Use the arrows to move between months with records. Select a name in the monthly activity chart legend to show or hide its line. The theme control in the header switches between light and dark.

### What the report measures

- Activity charts show messages by month, time of day, and day of the week. In chats with more than 20 participants, the trend chart shows the 12 with the most dated records. Search for another participant by any part of their name to add them for comparison. Participant details include message counts, word counts, average message length, and shared content types. The JSON records are enough to count photos and files skipped during export, as well as polls, shared contacts, and locations.
- Open **Monthly activity table** in **Overview** to read dated record totals and active days for every month, including when charts are unavailable. Select a month to open its report or choose **Activity CSV** to export all of the table's totals. The file uses `YYYY-MM` months and has the same columns in both languages.
- Open **Daily activity table** in **By month** to read the count for every calendar day, including days with no records. Use **Daily CSV** to download those same counts for the selected month with `YYYY-MM-DD` dates.
- Open **Activity by weekday and hour** in either report to read the same counts as the charts, including zero values. The counts follow the calendar time written in the export.
- **Message reactions** shows exported emoji counts and separate totals for custom emoji and paid reactions. The monthly table groups counts by the date the messages were sent, since reactions may have been added later. Choose **Reactions CSV** to download the rows in the current table, with the same `reaction_type,emoji,count` columns in either language. The emoji column is empty for the grouped categories. The table and CSV include counts without reactor names or custom emoji IDs. [Telegram Desktop export fields](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L2393-L2450)
- Open **Message types table** in either report to read the record counts by category. The overview includes undated records. The monthly table covers the selected month. Telegram service events and unsupported records have separate rows.
- Message-type charts and shared-content summaries count each Telegram checklist as one record.
- Games, invoices, giveaway announcements and results, and paid media also count by type. The report shows the counts without the payment amounts or winner lists.
- Word counts skip standalone emoji and punctuation. Where supported by the browser, word segmentation also handles scripts such as Chinese and Japanese that are often written without spaces.
- For rich Telegram posts, word counts and message lengths include text from headings, paragraphs, lists, tables, and captions. Text blocks are separated by line breaks.
- A formatted post with an embedded photo, video, audio track, or file counts once as rich media, even if the export skipped the attachment.
- **Reply timing** defaults to **Adjacent messages**, which estimates delays between consecutive messages from different participants. A message with a comparable timestamp and no identified sender interrupts the sequence. Choose **Direct replies** to measure the elapsed time from each explicitly replied-to message to its reply. Direct mode uses pairs with known times and distinct senders in the same export. Both modes skip service events and assign an interval to the month of the reply. The setting applies to the reply charts, participant details, and adjustable long-response threshold.
- Telegram Desktop can export unsupported records with an ID and no timestamp. Such a record interrupts an estimated reply when the three IDs establish an unambiguous order within the current or migrated history. [Telegram Desktop export format](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L1524-L1530)
- Below **Reply timing**, the report shows how many direct reply links could be timed in the current view. The total includes links to missing messages or other chats, so an incomplete export can show fewer measured replies than links.
- The text report shows short average reply times in seconds, with up to three decimal places.
- Activity charts keep the dates and times written in the export. Direct replies use Unix timestamps or explicit offsets whenever both messages have them. When legacy dates without offsets are mixed in, adjacent-message timing and direct pairs without two exact timestamps use the written times where both messages have one. Records with the same timestamp are ordered by message ID, including numeric IDs written as strings.
- Sender IDs group the same person across name changes. The app numbers identical names to distinguish participants. Reports and CSVs show names without IDs. Dated records without an identified sender count toward monthly activity and have their own trend line. Participant statistics and CSVs cover records linked to a sender.
- **Chat CSV** exports the whole chat. **Month CSV** exports the selected month. Both files contain participant names, message counts, and average message length in comma-separated UTF-8. The column headers stay the same when you change the interface language.
- **Replies CSV** exports the current report period and timing method. Each sender–responder pair has a count, an average in seconds, and the number of replies longer than the current threshold. The filename includes the method and, in the monthly view, the month.
- Set **Long reply threshold** from **Overview** or **By month**. Both reports and their reply CSVs use the same setting.
- Choose **Clear report** under **Chat data** to remove the report, chat list and filename from the page or stop a pending import. Your original JSON file stays on disk.
- Average message length counts grapheme clusters, so a compound emoji can count as one character. Browsers without `Intl.Segmenter` count Unicode code points.

### Offline use and privacy

Use a modern browser and a Telegram Desktop JSON export to analyze your own data. HTML exports use a different structure. If your import fails, check that you chose the Telegram JSON file.

Choosing or dropping a new file stops the previous pending import. If the new file cannot be opened, the last completed report or account chat list remains available.

If the app reports an invalid text encoding, export your data again as JSON from Telegram Desktop.

To work offline, extract the [latest release ZIP](https://github.com/orangepony4/telegram-analyzer/releases/latest) and open `index.html`. Keep the `vendor` folder next to it. Charts, icons, and CSV export work offline. Chat data stays in the browser. The app serves its scripts, styles, and chart library locally, and its content security policy blocks connections made by `fetch` and `XMLHttpRequest`.

### Development

Install the dependencies and start the server from a source checkout with Node.js and npm.

```sh
npm ci
npm start
```

Open [localhost:3000](http://localhost:3000). Run `npm test` to check import, month navigation, and response time calculations. The tests use Node's built-in test runner. [Test workflow](https://github.com/orangepony4/telegram-analyzer/actions/workflows/test.yml)

Run `npm run package:offline` from a Git checkout to build `telegram-analyzer-offline.zip` from the tracked app files, documentation, and licenses in the current commit. To choose a destination, run `npm run package:offline -- ./offline-build.zip`.

[Report an issue or suggest an improvement](https://github.com/orangepony4/telegram-analyzer/issues) · [MIT license](LICENSE)

---

## Русский

**[Попробовать в браузере →](https://orangepony4.github.io/telegram-analyzer/)**

[Проанализировать свой экспорт](https://orangepony4.github.io/telegram-analyzer/?view=upload) · [Скачать ZIP для работы без интернета](https://github.com/orangepony4/telegram-analyzer/releases/latest) · [Исходный код](https://github.com/orangepony4/telegram-analyzer/tree/main) · [English](#english)

Telegram Analyzer показывает активность, участников и время ответа по экспорту из Telegram Desktop. Ссылка «Попробовать в браузере» открывает вымышленную переписку за три месяца. Можно сразу посмотреть графики и скачать пробный CSV. Ссылка «Проанализировать свой экспорт» ведёт на экран загрузки. Нажмите **«Демо-чат»**, чтобы открыть пример, или **«Скачать пример JSON»**, чтобы сохранить ту же переписку и загрузить её через **«Открыть JSON»**.

Интерфейс открывается на английском. Нажмите **RU** в шапке, чтобы перейти на русский. Текущий отчёт останется открытым.

### Как открыть свою переписку

1. В Telegram Desktop откройте личный чат, группу или канал. В меню чата выберите **«Экспорт истории чата»** и формат **JSON**. Параметры скачивания медиа можно оставить выключенными.
2. Нажмите **«Открыть JSON»** или перетащите экспортированный файл, обычно `result.json`, в область импорта. Пока файл читается, кнопка **«Отменить импорт»** остановит чтение и вернёт предыдущий отчёт или выбор чата.
3. Если вы открыли экспорт аккаунта с историей чатов, введите любую часть названия в поле **«Найти чат по названию»**. Если в экспорте несколько типов чатов, можно также выбрать **«Тип чата»**. Под списком появятся полное название выбранного чата, число сообщений и номер в списке. Нажмите **«Показать статистику»**, чтобы открыть его отчёт и выгрузки CSV.
4. Во вкладке **«Обзор»** видна статистика за всё время. Во вкладке **«По месяцам»** можно сразу выбрать любой месяц с записями или перейти к соседнему месяцу с записями стрелками. Нажмите имя в легенде графика динамики, чтобы скрыть или показать его линию. Кнопка в шапке переключает светлую и тёмную темы.

### Что считает анализатор

- Графики показывают активность по месяцам, времени суток и дням недели. Если в чате больше 20 участников, график динамики показывает 12 участников с наибольшим числом записей с датой. Для сравнения можно добавить ещё одного участника, найдя его по любой части имени. По участникам можно посмотреть количество сообщений и слов, среднюю длину и типы отправленных материалов. JSON содержит достаточно данных для подсчёта опросов, контактов, геопозиций, фотографий и файлов, даже если вложения не были скачаны.
- В разделе **«Обзор»** откройте **«Активность по месяцам в таблице»**. Там видны число записей с датой и количество активных дней за каждый месяц, даже если графики недоступны. Нажмите на месяц, чтобы открыть его отчёт, или нажмите **«CSV активности»**, чтобы выгрузить всю таблицу. Месяцы записаны в формате `YYYY-MM`, названия столбцов одинаковы в обоих языках.
- В разделе **«По месяцам»** откройте **«Активность по дням в таблице»**, чтобы увидеть число записей за каждый календарный день, включая дни без записей. Кнопка **«CSV по дням»** сохраняет те же значения за выбранный месяц с датами в формате `YYYY-MM-DD`.
- Раздел **«Активность по дням недели и часам»** есть в обоих отчётах. Таблицы показывают те же значения, что и графики, включая нулевые, по календарному времени из экспорта.
- В разделе **«Реакции на сообщения»** видны количества обычных эмодзи и отдельные итоги по пользовательским эмодзи и платным реакциям. Месяц определяется по дате сообщения, поскольку реакции могли появиться позже. Кнопка **«CSV реакций»** выгружает строки текущей таблицы с одинаковыми столбцами `reaction_type,emoji,count` в обеих версиях интерфейса. У сгруппированных категорий столбец эмодзи пустой. Таблица и CSV содержат числа без имён поставивших реакции и идентификаторов пользовательских эмодзи. [Поля экспорта Telegram Desktop](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L2393-L2450)
- В обеих сводках раздел **«Типы сообщений в таблице»** показывает количество записей каждого типа. В обзор входят записи без даты, а помесячная таблица охватывает выбранный месяц. Служебные события и неподдерживаемые записи Telegram показаны отдельными строками.
- В графиках типов сообщений и сводках по вложениям каждый список задач Telegram учитывается как одна запись.
- Игры, счета, объявления и итоги розыгрышей, а также платные медиа учитываются по типам. В отчёте видны числа записей без сумм платежей и списков победителей.
- При подсчёте слов отдельные эмодзи и знаки препинания пропускаются. Если браузер умеет разбивать текст на слова, это работает и для китайского, японского и других языков, где слова часто пишутся без пробелов.
- В форматированных постах Telegram слова и длина сообщения рассчитываются по тексту заголовков, абзацев, списков, таблиц и подписей. Текстовые блоки разделяются переносами строк.
- Форматированный пост с фотографией, видео, аудио или файлом учитывается как одна запись с медиа, даже если само вложение не скачали.
- В меню **«Замер ответов»** по умолчанию выбраны **«Соседние сообщения»**. Этот режим оценивает паузы между соседними сообщениями разных участников. Сообщение без известного отправителя прерывает последовательность, если его место в хронологии можно определить. Выберите **«Прямые ответы»**, чтобы измерять время от исходного сообщения до ответа, связанного с ним в Telegram. Подходят пары из одной переписки с известным временем и разными отправителями. Служебные события пропускаются. В обоих режимах интервал относится к месяцу ответа, а настройка применяется к графикам, деталям по участникам и порогу долгого ответа.
- В экспорте Telegram Desktop у неподдерживаемой записи может быть идентификатор без времени. Такая запись прерывает оценку по соседним сообщениям, если три идентификатора однозначно задают порядок внутри текущей или перенесённой истории. [Формат экспорта Telegram Desktop](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L1524-L1530)
- Под меню видно, сколько прямых ответов удалось замерить в открытой сводке. В общее число входят ссылки на отсутствующие сообщения и другие чаты. В неполном экспорте замеров может быть меньше, чем ссылок.
- Короткие интервалы в сводке среднего времени ответа показаны в секундах с точностью до тысячных.
- Графики сохраняют даты и время из экспорта. Для прямых ответов используется Unix-время или явное смещение часового пояса, если точное время есть у обоих сообщений. Если в экспорте есть старые даты без смещения, интервалы между соседними сообщениями и прямые ответы без пары точных меток считаются по времени из экспорта, когда оно есть у обоих сообщений. Записи с одинаковым временем упорядочиваются по идентификатору сообщения, даже если числовой идентификатор записан строкой.
- Идентификаторы отправителей позволяют объединить сообщения человека после смены имени. Участники с одинаковыми именами получают порядковые номера. В отчёте и CSV видны только имена. Записи с датой без определённого отправителя входят в месячную активность и показаны отдельной линией. В статистику участников и CSV входят записи с определённым отправителем.
- Кнопка **«CSV чата»** сохраняет данные по всему чату. Кнопка **«CSV месяца»** сохраняет данные за выбранный месяц. В обоих файлах содержатся имена участников, количество сообщений и средняя длина сообщения. Формат — UTF-8 с запятой в качестве разделителя. Названия столбцов сохраняются при переключении языка.
- Кнопка **«CSV ответов»** выгружает данные за открытый период с выбранным методом замера. Для каждой пары участников файл содержит число ответов, среднее время в секундах и число ответов дольше текущего порога. В имени файла указан метод замера, а в помесячном отчёте также указан месяц.
- Порог **«Долгий ответ»** можно менять в разделах **«Обзор»** и **«По месяцам»**. Оба отчёта и их выгрузки CSV используют одно значение.
- Кнопка **«Очистить отчёт»** в блоке **«Данные чата»** убирает со страницы отчёт, список чатов и имя файла или прерывает чтение экспорта. Исходный JSON остаётся на диске.
- Средняя длина считается по графемам. Например, составной эмодзи может считаться одним символом. В браузерах без `Intl.Segmenter` используются кодовые точки Unicode.

### Работа без интернета и приватность

Для своего чата нужен современный браузер и JSON-экспорт Telegram Desktop. У HTML-экспорта другая структура. Если файл не открывается, проверьте формат экспорта.

Выбор или перетаскивание нового файла останавливает незавершённый импорт. Если новый файл не открывается, последний готовый отчёт или список чатов аккаунта остаётся доступен.

Если приложение сообщает об ошибке кодировки, экспортируйте данные заново в формате JSON из Telegram Desktop.

Распакуйте [ZIP из последнего релиза](https://github.com/orangepony4/telegram-analyzer/releases/latest) и откройте `index.html`. Оставьте папку `vendor` рядом с ним. Графики, значки и выгрузки CSV работают без интернета. Данные переписки обрабатываются в браузере. Скрипты, стили и библиотека графиков входят в приложение, а политика безопасности блокирует подключения через `fetch` и `XMLHttpRequest`.

### Разработка

Для локального запуска нужны Node.js и npm. Выполните команды в папке с исходным кодом.

```sh
npm ci
npm start
```

Откройте [localhost:3000](http://localhost:3000). Команда `npm test` проверяет импорт, переходы между месяцами и расчёт времени ответа с помощью встроенного тестового раннера Node.js. [Проверки на GitHub](https://github.com/orangepony4/telegram-analyzer/actions/workflows/test.yml)

Команда `npm run package:offline` собирает `telegram-analyzer-offline.zip` из файлов приложения, документации и лицензий, зафиксированных в текущем коммите Git. Чтобы указать другой путь, запустите `npm run package:offline -- ./offline-build.zip`.

[Сообщить об ошибке или предложить улучшение](https://github.com/orangepony4/telegram-analyzer/issues) · [Лицензия MIT](LICENSE)
