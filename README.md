# Telegram Analyzer

**[English](#english) · [Русский](#русский)**

## English

Analyze Telegram Desktop chat exports in your browser. See who participates, when the conversation is most active, and how long responses take.

**[Try it here →](https://orangepony4.github.io/telegram-analyzer/)**

[Analyze my export](https://orangepony4.github.io/telegram-analyzer/?view=upload) · [Download the offline ZIP](https://github.com/orangepony4/telegram-analyzer/releases/latest) · [View source code](https://github.com/orangepony4/telegram-analyzer/tree/main)

The browser app opens with a fictional three-month conversation. Use **RU** in the header to switch from English to Russian without reopening the report.

![A fictional chat report with activity and message-type charts and category buttons](docs/preview.webp)

### Try the sample chat

1. Select **Table view**, open **Participants table**, and enter `Ника` in **Find by name**. Choose **Table CSV** to save that participant's row.
2. Select **Table view** again to show the charts. Under **Message types**, focus **Videos** with Tab and press Enter to hide the video slice. Choose **Save PNG** above the chart to download the visible slices.

Use **Download sample JSON** to save the same conversation and practice importing it with **Open JSON**. The **Analyze my export** link opens the upload view directly.

### Analyze your own chat

1. In Telegram Desktop, open a private chat, group, or channel. Choose **Export chat history** from the chat menu, select **JSON**, and export. You can leave the media download options unchecked.
2. Select **Open JSON** or drop the exported file, usually `result.json`, into the import area. While the file is being read, the progress bar shows the percentage when the browser can measure it. Use **Cancel import** to stop the read and return to your previous report or chat selection.
3. If you open an account export containing chat history, enter any part of a name in **Find a chat by name** to narrow the list. If the export contains several chat types, combine the search with **Chat type**. The selected chat's full name, message count, and list number appear below the controls. Choose **Analyze chat** to open its report and CSV exports.
4. Open **Overview** for the full chat or **By month** to jump to any month with records. Use the arrows to move between months with records. Select a name in the monthly activity chart legend to show or hide its line. The theme control in the header switches between light and dark.

The analyzer also opens exports in which Telegram Desktop writes control characters as `\xNN` escapes. [Telegram Desktop JSON writer](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L29-L57)

Choose **Table view** to hide the charts and bring the expandable tables and text summaries closer. Choose it again to restore the charts. The current month, reply settings, and open tables stay selected.

Choose **Print report** to print the selected scope or save it as PDF from the browser dialog. The printout includes the text summary and any tables you expanded. Open **Participants table** first to include the participant counts and lengths. Use **Save PNG** separately for charts.

### What the report measures

- Activity charts show messages by month, time of day, and day of the week. The monthly trend includes participants with dated records. If more than 20 participants have dated records, the chart shows the 12 with the most records. Search for another participant with dated records by any part of their name to add them for comparison. Participant details include message counts, word counts, average message length, and shared content types. The JSON records are enough to count photos and files skipped during export, as well as polls, shared contacts, and locations.
- Open **Participants table** in **Overview** or **By month** to compare message counts, word counts and average message length. Enter any part of a display name and choose **Sort by** to order the matches. **Table CSV** saves the displayed rows in the same order, with four columns and the same headers in either language. The **Chat CSV** and **Month CSV** buttons export the full scope with their existing three columns.
- Open **Monthly activity table** in **Overview** to read dated record totals and active days for every month, including when charts are unavailable. Select a month to open its report or choose **Activity CSV** to export all of the table's totals. The file uses `YYYY-MM` months and has the same columns in both languages.
- Open **Daily activity table** in **By month** to read the count for every calendar day, including days with no records. Use **Daily CSV** to download those same counts for the selected month with `YYYY-MM-DD` dates.
- Open **Activity by weekday and hour** in either report to see the same calendar buckets as the charts, including zero values. Extra rows count records whose date or hour is unavailable. **Weekday and hour CSV** saves those rows with `dimension,bucket,records` columns, English weekday keys, `HH:00` hours, and `unknown` for unavailable values.
- **Message reactions** shows exported emoji counts and separate totals for custom emoji and paid reactions. The monthly table groups counts by the date the messages were sent, since reactions may have been added later. Choose **Reactions CSV** to download the rows in the current table, with the same `reaction_type,emoji,count` columns in either language. The emoji column is empty for the grouped categories. The table and CSV include counts without reactor names or custom emoji IDs. [Telegram Desktop export fields](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L2393-L2450)
- Open **Message types table** in either report to read the record counts by category. The overview includes undated records. The monthly table covers the selected month. Telegram service events and unsupported records have separate rows. **Types CSV** exports the current table with the same `message_type,count` columns and category keys in either language.
- Under **Message types**, select a category with the pointer or focus its button and press Enter or Space to show or hide its slice. **Save PNG** includes the visible categories.
- Message-type charts and shared-content summaries count each Telegram checklist as one record.
- Games, invoices, giveaway announcements and results, and paid media also count by type. The report shows the counts without the payment amounts or winner lists.
- Emoji separate neighboring words. Word counts skip standalone emoji and punctuation. Where supported by the browser, word segmentation also handles scripts such as Chinese and Japanese that are often written without spaces.
- For rich Telegram posts, word counts and message lengths include text from headings, paragraphs, lists, tables, and captions. Text blocks are separated by line breaks. Inline images separate neighboring words and leave the text length unchanged.
- A formatted post with an embedded image, video, audio track, or file counts once as rich media, even if the export skipped the attachment. This includes images inside formatted text. [Telegram Desktop inline image export](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L693-L707)
- **Reply timing** defaults to **Adjacent messages**, which estimates delays between consecutive messages from different participants. A message with a comparable timestamp and no identified sender interrupts the sequence. Choose **Direct replies** to measure the elapsed time from each explicitly replied-to message to its reply. Direct mode uses pairs with known times and distinct senders in the same export. Both modes skip service events and assign an interval to the month of the reply. The setting applies to the reply charts, participant details, and adjustable long-response threshold.
- Telegram Desktop can export unsupported records with an ID and no timestamp. Such a record interrupts an estimated reply when the three IDs establish an unambiguous order within the current or migrated history. [Telegram Desktop export format](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L1524-L1530)
- Below **Reply timing**, the report shows how many direct reply links could be timed in the current view. The total includes links to missing messages or other chats, so an incomplete export can show fewer measured replies than links.
- Direct reply timing includes explicit links to the current chat when the export identifies that chat unambiguously. [Telegram Desktop chat metadata](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L2956-L2988)
- The text report shows short average reply times in seconds, with up to three decimal places.
- Activity charts keep the dates and times written in the export. Direct replies use Unix timestamps or explicit offsets whenever both messages have them. When legacy dates without offsets are mixed in, adjacent-message timing and direct pairs without two exact timestamps use the written times where both messages have one. Records with the same timestamp are ordered by message ID, including numeric IDs written as strings.
- A date-only record still counts in activity, including when the date uses an accepted legacy format. A comparable Unix timestamp can contribute to reply timing. Without a comparable time, the record's ID can interrupt an inferred pair within the same chat history.
- Hourly activity uses the hour written in the export, or UTC if only a timestamp supplies the time. Records with a date and no known time still count by day, weekday, and month.
- Accepted legacy dates with a numeric offset or UTC/GMT preserve the written day and hour. When both messages have exact times, those times can be used to measure a direct reply.
- Use **Save PNG** on the activity and message-type charts to save a 2,000 × 1,040 image. The PNG uses the current language and theme, includes visible series or slices, and uses the selected month in the monthly view. Long legend labels are shortened to fit.
- Sender IDs group the same person across name changes. The app numbers identical names to distinguish participants. Reports and CSVs show names without IDs. Dated records without an identified sender count toward monthly activity and have their own trend line. Participant statistics and CSVs cover records linked to a sender.
- **Chat CSV** exports the whole chat. **Month CSV** exports the selected month. Both files contain participant names, message counts, and average message length in comma-separated UTF-8. The column headers stay the same when you change the interface language.
- **Replies CSV** exports the current report period and timing method. Each sender–responder pair has a count, an average in seconds, and the number of replies longer than the current threshold. The filename includes the method and, in the monthly view, the month.
- Set **Long reply threshold** from **Overview** or **By month**. Both reports and their reply CSVs use the same setting.
- Choose **Clear report** under **Chat data** to remove the report, chat list and filename from the page or stop a pending import. Your original JSON file stays on disk.
- Average message length counts grapheme clusters, so a compound emoji can count as one character. Browsers without `Intl.Segmenter` count Unicode code points.

### Offline use and privacy

Use a modern browser and a Telegram Desktop JSON export to analyze your own data. For several chats, open **Settings → Advanced → Export Telegram data**, select the chat types, and choose **Machine-readable JSON**. If you open an HTML export, the analyzer shows the steps for exporting JSON.

Choosing or dropping a new file stops the previous pending import. If the new file cannot be opened, the last completed report or account chat list remains available.

If the app reports an invalid text encoding, export your data again as JSON from Telegram Desktop.

To work offline, extract the [latest release ZIP](https://github.com/orangepony4/telegram-analyzer/releases/latest) and open `index.html`. Keep the `vendor` folder next to it. Charts, icons, and CSV and PNG exports work offline. Chat data stays in the browser. The app serves its scripts, styles, and chart library locally, and its content security policy blocks connections made by `fetch` and `XMLHttpRequest`.

### Development

Install the dependencies and start the server from a source checkout with Node.js and npm.

```sh
npm ci
npm start
```

Open [localhost:3000](http://localhost:3000). Run `npm test` to check import, month navigation, and response time calculations. The tests use Node's built-in test runner. [Test workflow](https://github.com/orangepony4/telegram-analyzer/actions/workflows/test.yml)

If port 3000 is busy, set `PORT` to another port or use `0` to let the system choose a free one. In PowerShell, set `$env:PORT = '0'` before running `npm start`. Open the URL printed in the terminal.

Run `npm run package:offline` from a Git checkout to build `telegram-analyzer-offline.zip` from the tracked app files, documentation, and licenses in the current commit. To choose a destination, run `npm run package:offline -- ./offline-build.zip`.

[Report an issue or suggest an improvement](https://github.com/orangepony4/telegram-analyzer/issues) · [MIT license](LICENSE)

---

## Русский

**[Попробовать здесь →](https://orangepony4.github.io/telegram-analyzer/)**

[Проанализировать свой экспорт](https://orangepony4.github.io/telegram-analyzer/?view=upload) · [Скачать ZIP для работы без интернета](https://github.com/orangepony4/telegram-analyzer/releases/latest) · [Исходный код](https://github.com/orangepony4/telegram-analyzer/tree/main) · [English](#english)

Ссылка **«Попробовать здесь»** открывает вымышленную переписку за три месяца. Нажмите **RU** в шапке, чтобы перейти на русский. Текущий отчёт останется открытым.

### Как попробовать на демо-чате

1. Нажмите **«Режим таблиц»**, раскройте **«Таблица участников»** и введите `Ника` в поле **«Поиск по имени»**. Нажмите **«CSV таблицы»**, чтобы сохранить строку этого участника.
2. Нажмите **«Режим таблиц»** ещё раз, чтобы вернуть графики. Под графиком **«Типы сообщений»** перейдите клавишей Tab к кнопке **«Видео»** и нажмите Enter, чтобы скрыть сектор. Нажмите **«Скачать PNG»** над графиком, чтобы сохранить видимые секторы.

Кнопка **«Скачать пример JSON»** сохраняет ту же переписку для пробной загрузки через **«Открыть JSON»**. Ссылка **«Проанализировать свой экспорт»** ведёт сразу на экран загрузки.

### Как открыть свою переписку

1. В Telegram Desktop откройте личный чат, группу или канал. В меню чата выберите **«Экспорт истории чата»** и формат **JSON**. Параметры скачивания медиа можно оставить выключенными.
2. Нажмите **«Открыть JSON»** или перетащите экспортированный файл, обычно `result.json`, в область импорта. Во время чтения индикатор показывает процент, если браузер может его вычислить. Кнопка **«Отменить импорт»** остановит чтение и вернёт предыдущий отчёт или выбор чата.
3. Если вы открыли экспорт аккаунта с историей чатов, введите любую часть названия в поле **«Найти чат по названию»**. Если в экспорте несколько типов чатов, можно также выбрать **«Тип чата»**. Под списком появятся полное название выбранного чата, число сообщений и номер в списке. Нажмите **«Показать статистику»**, чтобы открыть его отчёт и выгрузки CSV.
4. Во вкладке **«Обзор»** видна статистика за всё время. Во вкладке **«По месяцам»** можно сразу выбрать любой месяц с записями или перейти к соседнему месяцу с записями стрелками. Нажмите имя в легенде графика динамики, чтобы скрыть или показать его линию. Кнопка в шапке переключает светлую и тёмную темы.

Анализатор также открывает файлы, в которых Telegram Desktop записал управляющие символы в виде последовательностей `\xNN`. [Код экспорта JSON в Telegram Desktop](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L29-L57)

Нажмите **«Режим таблиц»**, чтобы скрыть графики и быстрее перейти к раскрывающимся таблицам и текстовым сводкам. Повторное нажатие возвращает графики. Выбранный месяц, настройки замера ответов и раскрытые таблицы сохраняются.

Кнопка **«Печать отчёта»** открывает диалог браузера для печати или сохранения в PDF. В документ попадут текстовая сводка выбранного периода и раскрытые таблицы. Чтобы добавить число сообщений, слов и среднюю длину по участникам, раскройте **«Таблицу участников»**. Графики можно отдельно скачать кнопкой **«Скачать PNG»**.

### Что считает анализатор

Откройте **«Таблица участников»** в разделах **«Обзор»** или **«По месяцам»**. Введите часть имени и выберите порядок в меню **«Сортировка»**. Кнопка **«CSV таблицы»** сохраняет видимые строки в том же порядке, с четырьмя столбцами и одинаковыми заголовками на обоих языках. Кнопки **«CSV чата»** и **«CSV месяца»** выгружают все строки выбранного периода в прежнем формате из трёх столбцов.

- Графики показывают активность по месяцам, времени суток и дням недели. На график динамики попадают участники с датированными записями. Если таких участников больше 20, график показывает 12 участников с наибольшим числом записей с датой. Для сравнения можно добавить ещё одного участника с датированными записями, найдя его по любой части имени. По участникам можно посмотреть количество сообщений и слов, среднюю длину и типы отправленных материалов. JSON содержит достаточно данных для подсчёта опросов, контактов, геопозиций, фотографий и файлов, даже если вложения не были скачаны.
- В разделе **«Обзор»** откройте **«Активность по месяцам в таблице»**. Там видны число записей с датой и количество активных дней за каждый месяц, даже если графики недоступны. Нажмите на месяц, чтобы открыть его отчёт, или нажмите **«CSV активности»**, чтобы выгрузить всю таблицу. Месяцы записаны в формате `YYYY-MM`, названия столбцов одинаковы в обоих языках.
- В разделе **«По месяцам»** откройте **«Активность по дням в таблице»**, чтобы увидеть число записей за каждый календарный день, включая дни без записей. Кнопка **«CSV по дням»** сохраняет те же значения за выбранный месяц с датами в формате `YYYY-MM-DD`.
- Раздел **«Активность по дням недели и часам»** есть в обоих отчётах. Таблицы показывают те же интервалы, что и графики, включая нулевые, и отдельно считают записи без известной даты или часа. Кнопка **«CSV по дням и часам»** выгружает строки со столбцами `dimension,bucket,records`, английскими названиями дней, часами в формате `HH:00` и значением `unknown` для неизвестных даты или часа.
- В разделе **«Реакции на сообщения»** видны количества обычных эмодзи и отдельные итоги по пользовательским эмодзи и платным реакциям. Месяц определяется по дате сообщения, поскольку реакции могли появиться позже. Кнопка **«CSV реакций»** выгружает строки текущей таблицы с одинаковыми столбцами `reaction_type,emoji,count` в обеих версиях интерфейса. У сгруппированных категорий столбец эмодзи пустой. Таблица и CSV содержат числа без имён поставивших реакции и идентификаторов пользовательских эмодзи. [Поля экспорта Telegram Desktop](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L2393-L2450)
- В обеих сводках раздел **«Типы сообщений в таблице»** показывает количество записей каждого типа. В обзор входят записи без даты, а помесячная таблица охватывает выбранный месяц. Служебные события и неподдерживаемые записи Telegram показаны отдельными строками. Кнопка **«CSV типов»** выгружает текущую таблицу с одинаковыми столбцами `message_type,count` и обозначениями типов в обеих версиях интерфейса.
- Под графиком **«Типы сообщений»** выберите категорию мышью или перейдите к её кнопке и нажмите Enter или пробел, чтобы показать или скрыть сектор. **«Скачать PNG»** включает видимые категории.
- В графиках типов сообщений и сводках по вложениям каждый список задач Telegram учитывается как одна запись.
- Игры, счета, объявления и итоги розыгрышей, а также платные медиа учитываются по типам. В отчёте видны числа записей без сумм платежей и списков победителей.
- Эмодзи между словами разделяют их. При подсчёте слов отдельные эмодзи и знаки препинания пропускаются. Если браузер умеет разбивать текст на слова, это работает и для китайского, японского и других языков, где слова часто пишутся без пробелов.
- В форматированных постах Telegram слова и длина сообщения рассчитываются по тексту заголовков, абзацев, списков, таблиц и подписей. Текстовые блоки разделяются переносами строк. Изображения внутри текста разделяют соседние слова и не добавляют символов к длине сообщения.
- Форматированный пост с изображением, видео, аудио или файлом учитывается как одна запись с медиа, даже если само вложение не скачали. Это относится и к изображениям внутри форматированного текста. [Экспорт изображений внутри текста в Telegram Desktop](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L693-L707)
- В меню **«Замер ответов»** по умолчанию выбраны **«Соседние сообщения»**. Этот режим оценивает паузы между соседними сообщениями разных участников. Сообщение без известного отправителя прерывает последовательность, если его место в хронологии можно определить. Выберите **«Прямые ответы»**, чтобы измерять время от исходного сообщения до ответа, связанного с ним в Telegram. Подходят пары из одной переписки с известным временем и разными отправителями. Служебные события пропускаются. В обоих режимах интервал относится к месяцу ответа, а настройка применяется к графикам, деталям по участникам и порогу долгого ответа.
- В экспорте Telegram Desktop у неподдерживаемой записи может быть идентификатор без времени. Такая запись прерывает оценку по соседним сообщениям, если три идентификатора однозначно задают порядок внутри текущей или перенесённой истории. [Формат экспорта Telegram Desktop](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L1524-L1530)
- Под меню видно, сколько прямых ответов удалось замерить в открытой сводке. В общее число входят ссылки на отсутствующие сообщения и другие чаты. В неполном экспорте замеров может быть меньше, чем ссылок.
- Замер прямых ответов учитывает явные ссылки на текущий чат, если экспорт позволяет однозначно его определить. [Поля чата в экспорте Telegram Desktop](https://github.com/telegramdesktop/tdesktop/blob/v7.3.2/Telegram/SourceFiles/export/output/export_output_json.cpp#L2956-L2988)
- Короткие интервалы в сводке среднего времени ответа показаны в секундах с точностью до тысячных.
- Графики сохраняют даты и время из экспорта. Для прямых ответов используется Unix-время или явное смещение часового пояса, если точное время есть у обоих сообщений. Если в экспорте есть старые даты без смещения, интервалы между соседними сообщениями и прямые ответы без пары точных меток считаются по времени из экспорта, когда оно есть у обоих сообщений. Записи с одинаковым временем упорядочиваются по идентификатору сообщения, даже если числовой идентификатор записан строкой.
- Записи, в которых указана только дата, входят в статистику активности, в том числе при чтении старых форматов даты. Для замера ответов можно использовать их Unix-время, если оно сопоставимо с временем второго сообщения. Если сопоставимого времени нет, идентификатор записи может прервать оценку по соседним сообщениям внутри одной истории.
- Почасовая активность использует час из экспорта. Если время известно только по метке, используется UTC. Записи с датой без времени остаются в итогах по дням, дням недели и месяцам.
- В поддерживаемых старых форматах с числовым смещением или UTC/GMT сохраняются записанные день и час. Для замера прямого ответа можно использовать точное время, если оно есть у обоих сообщений.
- Кнопка **«Скачать PNG»** у графиков активности и типов сообщений сохраняет изображение 2 000 × 1 040. Сохраняются текущие язык и тема, видимые линии или сектора и выбранный месяц в помесячном отчёте. Длинные подписи в легенде сокращаются.
- Идентификаторы отправителей позволяют объединить сообщения человека после смены имени. Участники с одинаковыми именами получают порядковые номера. В отчёте и CSV видны только имена. Записи с датой без определённого отправителя входят в месячную активность и показаны отдельной линией. В статистику участников и CSV входят записи с определённым отправителем.
- Кнопка **«CSV чата»** сохраняет данные по всему чату. Кнопка **«CSV месяца»** сохраняет данные за выбранный месяц. В обоих файлах содержатся имена участников, количество сообщений и средняя длина сообщения. Формат — UTF-8 с запятой в качестве разделителя. Названия столбцов сохраняются при переключении языка.
- Кнопка **«CSV ответов»** выгружает данные за открытый период с выбранным методом замера. Для каждой пары участников файл содержит число ответов, среднее время в секундах и число ответов дольше текущего порога. В имени файла указан метод замера, а в помесячном отчёте также указан месяц.
- Порог **«Долгий ответ»** можно менять в разделах **«Обзор»** и **«По месяцам»**. Оба отчёта и их выгрузки CSV используют одно значение.
- Кнопка **«Очистить отчёт»** в блоке **«Данные чата»** убирает со страницы отчёт, список чатов и имя файла или прерывает чтение экспорта. Исходный JSON остаётся на диске.
- Средняя длина считается по графемам. Например, составной эмодзи может считаться одним символом. В браузерах без `Intl.Segmenter` используются кодовые точки Unicode.

### Работа без интернета и приватность

Для своего чата нужен современный браузер и JSON-экспорт Telegram Desktop. Для нескольких чатов откройте **«Настройки → Продвинутые настройки → Экспорт данных из Telegram»**, отметьте нужные типы чатов и выберите **«Машиночитаемый JSON»**. При открытии HTML-экспорта анализатор покажет шаги для экспорта JSON.

Выбор или перетаскивание нового файла останавливает незавершённый импорт. Если новый файл не открывается, последний готовый отчёт или список чатов аккаунта остаётся доступен.

Если приложение сообщает об ошибке кодировки, экспортируйте данные заново в формате JSON из Telegram Desktop.

Распакуйте [ZIP из последнего релиза](https://github.com/orangepony4/telegram-analyzer/releases/latest) и откройте `index.html`. Оставьте папку `vendor` рядом с ним. Графики, значки и выгрузка CSV и PNG работают без интернета. Данные переписки обрабатываются в браузере. Скрипты, стили и библиотека графиков входят в приложение, а политика безопасности блокирует подключения через `fetch` и `XMLHttpRequest`.

### Разработка

Для локального запуска нужны Node.js и npm. Выполните команды в папке с исходным кодом.

```sh
npm ci
npm start
```

Откройте [localhost:3000](http://localhost:3000). Команда `npm test` проверяет импорт, переходы между месяцами и расчёт времени ответа с помощью встроенного тестового раннера Node.js. [Проверки на GitHub](https://github.com/orangepony4/telegram-analyzer/actions/workflows/test.yml)

Если порт 3000 занят, задайте другой через `PORT` или укажите `0`, чтобы система выбрала свободный порт. В PowerShell выполните `$env:PORT = '0'` перед `npm start`. Откройте адрес, который появится в терминале.

Команда `npm run package:offline` собирает `telegram-analyzer-offline.zip` из файлов приложения, документации и лицензий, зафиксированных в текущем коммите Git. Чтобы указать другой путь, запустите `npm run package:offline -- ./offline-build.zip`.

[Сообщить об ошибке или предложить улучшение](https://github.com/orangepony4/telegram-analyzer/issues) · [Лицензия MIT](LICENSE)
