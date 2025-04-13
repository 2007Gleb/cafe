const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Убедитесь, что путь к модели User корректный
const LoginHistory = require('../models/LoginHistory'); // Новая модель для хранения истории входов
const axios = require('axios'); // Для получения геолокации через API
const { generateVerificationToken, verifyToken } = require('../utils/token'); // Генерация и проверка токенов
const sendEmail = require('../utils/mailer'); // Модуль для отправки email

const router = express.Router();

// Функция получения геолокации
async function getGeoLocation(ip) {
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        return response.data; // Возвращает данные о местоположении
    } catch (error) {
        console.error('Ошибка получения геолокации:', error.message);
        return null;
    }
}

// Страница входа
router.get('/login', (req, res) => {
    res.render('login', { title: 'Вход' });
});

// Регистрация пользователя
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.render('register', { title: 'Регистрация', error: 'Пользователь с таким email или именем уже существует.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ username, email, password: hashedPassword, isVerified: false });
        await user.save();
        const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        console.log(`IP-адрес клиента: ${clientIp}`);
        await sendEmail(email, 'Подтверждение почты', `Пожалуйста, подтвердите вашу почту, перейдя по ссылке: ${clientIp}`);
        const token = generateVerificationToken(user._id);
        const verificationUrl = `https://calm-wildwood-74397-bd579eb94163.herokuapp.com/verify/verify-email?token=${token}`;


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
        const userId = verifyToken(token);
        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).send('Недействительная ссылка подтверждения.');
        }

        user.isVerified = true;
        await user.save();

        res.send(`
            <html>
            <head>
                <title>Подтверждение почты</title>
            </head>
            <body>
                <h1>Почта успешно подтверждена!</h1>
                <script>
                    setTimeout(() => {
                        window.close();
                    }, 2000);
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

        // Получение IP-адреса клиента


        // Сохранение данных о входе
        const loginInfo = {
            userId: user._id,
            ip: clientIp,
            location: geoData ? `${geoData.city}, ${geoData.country}` : 'Неизвестно',
            time: new Date(),
        };

        // Сохранение записи о входе в базу данных
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

module.exports = router;