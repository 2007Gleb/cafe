const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Убедитесь, что путь к модели User корректный
const sendEmail = require('../utils/mailer'); // Убедитесь, что путь к модулю mailer корректный
const { generateVerificationToken } = require('../utils/token'); // Убедитесь, что путь к модулю token корректный

const router = express.Router(); // Создаём объект router
router.get('/login', (req, res) => {
    res.render('login', { title: 'Вход' });
});
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
        const verificationUrl = `http://localhost:3000/verify/verify-email?token=${token}`;

        // Отправка письма
        await sendEmail(email, 'Подтверждение почты', `Пожалуйста, подтвердите вашу почту, перейдя по ссылке: ${verificationUrl}`);

        res.render('register', { title: 'Регистрация', message: 'Пользователь зарегистрирован! Проверьте вашу почту для подтверждения.' });
    } catch (error) {
        console.error('Ошибка при регистрации пользователя:', error.message);
        res.render('register', { title: 'Регистрация', error: 'Ошибка сервера' });
    }
});

// Вход пользователя
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Поиск пользователя по email
        console.log('Проверка email:', email);
        const user = await User.findOne({ email });
        if (!user) {
            console.log('Пользователь не найден');
            return res.render('login', { title: 'Вход', error: 'Неверные учетные данные' });
        }

        // Проверка пароля
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('Неверный пароль');
            return res.render('login', { title: 'Вход', error: 'Неверные учетные данные' });
        }

        // Проверка подтверждения почты
        if (!user.isVerified) {
            console.log('Почта не подтверждена');
            return res.render('login', { title: 'Вход', error: 'Пожалуйста, подтвердите вашу почту перед входом.' });
        }

        // Если всё верно, создаём сессию
        req.session.user = { id: user._id, username: user.username, isAdmin: user.isAdmin };
        console.log('Авторизация успешна');
        res.redirect(user.isAdmin ? '/admin' : '/cafes');
    } catch (error) {
        console.error('Ошибка при входе пользователя:', error.message);
        res.render('login', { title: 'Вход', error: 'Ошибка сервера' });
    }
});
module.exports = router; // Экспортируем router