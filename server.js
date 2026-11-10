const express = require('express');
const path = require('path');
const app = express();
const port = Number(process.env.PORT?.trim() || '3000');

// Serve only the files used by the web interface. Chat exports stay local.
const publicFiles = {
    '/': 'index.html',
    '/index.html': 'index.html',
    '/styles.css': 'styles.css',
    '/analyzer.js': 'analyzer.js',
    '/vendor/chart.umd.min.js': 'vendor/chart.umd.min.js',
    '/vendor/chartjs-LICENSE.md': 'vendor/chartjs-LICENSE.md',
    '/vendor/kurkle-color-LICENSE.md': 'vendor/kurkle-color-LICENSE.md',
};

for (const [route, file] of Object.entries(publicFiles)) {
    app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, file));
    });
}

if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    console.error('PORT must be a whole number from 0 to 65535.');
    process.exitCode = 1;
} else {
    const server = app.listen(port, () => {
        console.log(`Telegram Analyzer is available at http://localhost:${server.address().port}`);
    });
    server.once('error', error => {
        console.error(error.code === 'EADDRINUSE'
            ? `Port ${port} is already in use. Choose another PORT or set PORT=0.`
            : `Could not start Telegram Analyzer. ${error.message}`);
        process.exitCode = 1;
    });
}

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('⚠️ Ошибка сервера:', err.stack); // Более информативный лог ошибки
    res.status(500).send('<h1> 500 - Ошибка сервера </h1><p> Что-то пошло не так на сервере. Пожалуйста, попробуйте позже. </p>'); // Улучшенное сообщение об ошибке для пользователя
});
