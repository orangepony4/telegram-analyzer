const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000; // Порт вынесен в переменную для удобства

// Serve only the files used by the web interface. Chat exports stay local.
const publicFiles = {
    '/': 'index.html',
    '/index.html': 'index.html',
    '/styles.css': 'styles.css',
    '/analyzer.js': 'analyzer.js',
};

for (const [route, file] of Object.entries(publicFiles)) {
    app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, file));
    });
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log('📝 Отслеживаются изменения в файлах...');
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('⚠️ Ошибка сервера:', err.stack); // Более информативный лог ошибки
    res.status(500).send('<h1> 500 - Ошибка сервера </h1><p> Что-то пошло не так на сервере. Пожалуйста, попробуйте позже. </p>'); // Улучшенное сообщение об ошибке для пользователя
});
