const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Убедитесь, что путь к модели User корректный
const sendEmail = require('../utils/mailer'); // Убедитесь, что путь к модулю mailer корректный
const { generateVerificationToken } = require('../utils/token'); // Убедитесь, что путь к модулю token корректный
const LoginHistory = require('../models/LoginHistory'); // Новая модель для хранения истории входов
const axios = require('axios');
const router = express.Router();
router.get('/login', (req, res) => {
    res.render('login', { title: 'Вход' });
});
async function getGeoLocation(ip) {
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        return response.data; // Возвращает данные о местоположении
    } catch (error) {
        console.error('Ошибка получения геолокации:', error.message);
        return null;
    }
}
const sendEmail = require('../utils/mailer'); // Подключите ваш модуль для отправки email

// Отправка уведомления
await sendEmail(
    'bobkovgleb38@gmail.com',
    'Новый вход в систему',
    `Пользователь вошел в систему:\nIP: ${clientIp}\nМестоположение: ${geoData ? `${geoData.city}, ${geoData.country}` : 'Неизвестно'}`
);
// Регистрация пользователя
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Проверка существующего пользователя
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.render('register', { title: 'Регистрация', error: 'Пользователь с таким email или именем уже существует.' });
        }

        // Хэширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание пользователя
        const user = new User({ username, email, password: hashedPassword, isVerified: false });
        await user.save();

        // Генерация токена
        const token = generateVerificationToken(user._id);
        const verificationUrl = `https://calm-wildwood-74397-bd579eb94163.herokuapp.com/verify/verify-email?token=${token}`;

        // Отправка письма
        await sendEmail(email, 'Подтверждение почты', `Пожалуйста, подтвердите вашу почту, перейдя по ссылке: ${verificationUrl}`);

        res.render('register', { title: 'Регистрация', message: 'Пользователь зарегистрирован! Проверьте вашу почту для подтверждения.' });
    } catch (error) {
        console.error('Ошибка при регистрации пользователя:', error.message);
        res.render('register', { title: 'Регистрация', error: 'Ошибка сервера' });
    }
});
// Подтверждение почты
router.get('/verify/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        // Проверка и расшифровка токена
        const userId = verifyToken(token); // Убедитесь, что verifyToken корректно реализован и импортирован
        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).send('Недействительная ссылка подтверждения.');
        }

        // Обновление статуса пользователя
        user.isVerified = true;
        await user.save();

        // Возвращаем HTML-страницу для закрытия вкладки
        res.send(`
            <html>
            <head>
                <title>Подтверждение почты</title>
            </head>
            <body>
                
                <script>
                    // Закрываем текущую вкладку
                    setTimeout(() => {
                        window.close();
                    }, 2000); // Закроется через 2 секунды
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Ошибка при подтверждении почты:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});
// Вход пользователя
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Поиск пользователя
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('login', { title: 'Вход', error: 'Неверные учетные данные' });
        }

        // Проверка пароля
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { title: 'Вход', error: 'Неверные учетные данные' });
        }

        // Проверка подтверждения почты
        if (!user.isVerified) {
            return res.render('login', { title: 'Вход', error: 'Пожалуйста, подтвердите вашу почту перед входом.' });
        }

        // Получение IP и геолокации
        const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const geoData = await getGeoLocation(clientIp);

        // Сохранение данных о входе
        const loginInfo = {
            userId: user._id,
            ip: clientIp,
            location: geoData ? `${geoData.city}, ${geoData.country}` : 'Неизвестно',
            time: new Date(),
        };

        // Сохранение в базу данных
        await LoginHistory.create(loginInfo);

        console.log('Информация о входе:', loginInfo);

        // Создание сессии
        req.session.user = { id: user._id, username: user.username, isAdmin: user.isAdmin };
        res.redirect(user.isAdmin ? '/admin' : '/cafes');
    } catch (error) {
        console.error('Ошибка при входе пользователя:', error.message);
        res.render('login', { title: 'Вход', error: 'Ошибка сервера' });
    }
});
module.exports = router; // Экспортируем router