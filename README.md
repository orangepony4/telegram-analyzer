# Telegram Analyzer

**Telegram Analyzer** is a free and open-source tool for analyzing Telegram chats. The program visualizes statistics on messages, participants, response times, activity, and much more, directly in your browser.

---

## 🚀 Quick Start

### 1. Export your chat from Telegram

> **Important:** Only **JSON** format export via Telegram Desktop is supported.

1. Open **Telegram Desktop** on your computer.
2. Go to the desired chat (personal, group, or channel).
3. Click on the chat name at the top, then select **"Export chat history"**.
4. In the window that appears:
    - Ensure that the **JSON** format is selected (NOT HTML!).
    - Uncheck all boxes.
    - Click **Export**.
5. After the export is complete, download the archive and extract the file, which is usually named `result.json`.

---

### 2. Open Telegram Analyzer

- Simply open the `index.html` file in your browser (Google Chrome, Firefox, Edge, Opera, etc.).
- **OR** deploy the project on a local server (e.g., using the Live Server extension for VS Code).

---

### 3. Upload your JSON file

- Drag and drop the `result.json` file into the designated area on the page **OR** click the "Choose file" button and select the file manually.
- After uploading, a green window "Loading and analyzing data..." will appear. Wait a few seconds — the analysis happens directly in your browser.

---

### 4. Explore the statistics

- After the analysis, tabs will appear:
    - **Overall statistics** — summary data for the entire chat.
    - **By months** — detailed statistics for each month, with the ability to switch between them.
- You will see:
    - Number of messages and participants.
    - Activity graphs by time of day, days of the week, months.
    - Statistics for each participant (number of messages, average length, etc.).
    - Analysis of response time between participants.
    - Statistics on media files (photos, videos, stickers, etc.).
    - Number of "long" replies (you can set the threshold in minutes).

---

## ⚙️ Requirements

- A modern browser (Google Chrome, Firefox, Edge, Opera, etc.).
- Telegram chat file in **JSON** format (exported via Telegram Desktop).

---

## 🔒 Security

- **Your data is not sent anywhere!** All analysis happens only in your browser.
- The source code is open and transparent — you can check it yourself.


## ❓ Frequently Asked Questions (FAQ)

**Q:** Why doesn't it work with an HTML export file?
**A:** The program only supports Telegram's JSON export. HTML export does not contain the necessary data structure.

**Q:** Is my data sent anywhere?
**A:** No, all calculations happen only in your browser. The file is not uploaded to any server.

**Q:** How can I change the theme?
**A:** Use the palette icon button in the upper right corner of the page.

**Q:** Can I analyze group chats and channels?
**A:** Yes, any chats exported via Telegram Desktop are supported.

**Q:** Why are the statistics not displaying?
**A:** Make sure you have uploaded the correct Telegram JSON export file. If the problem persists, please create an issue on GitHub.

---

## 💡 Contributing to the project

- Pull requests, bug reports, and improvement suggestions are welcome!
- If you find an error or want to suggest a new feature — create an issue or write to me.

---

**P.S.** If you still have questions — feel free to open an issue on GitHub!
