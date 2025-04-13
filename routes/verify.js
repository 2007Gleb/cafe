const express = require('express');
const User = require('../models/User'); // Убедитесь, что путь корректен
const { verifyToken } = require('../utils/token'); // Убедитесь, что путь корректен

const router = express.Router();

// Маршрут для подтверждения почты
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query; // Получение токена из запроса

        // Расшифровка токена
        const decoded = verifyToken(token);

        // Поиск пользователя по ID
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).send('Пользователь не найден');
        }

        // Проверка, подтверждён ли уже email
        if (user.isVerified) {
            return res.render('verify', { title: 'Подтверждение почты', message: 'Почта уже подтверждена.' });
        }

        // Обновление статуса пользователя
        user.isVerified = true;
        await user.save();

        res.render('verify', { title: 'Подтверждение почты', message: 'Почта успешно подтверждена!' });
    } catch (error) {
        console.error('Ошибка при подтверждении почты:', error.message);
        res.status(400).send('Неверный или истёкший токен.');
    }
});

module.exports = router;