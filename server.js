const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000; // Порт вынесен в переменную для удобства

// Статические файлы
app.use(express.static(path.join(__dirname)));

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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
