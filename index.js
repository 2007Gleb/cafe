const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const MongoStore = require('connect-mongo');
const { engine } = require('express-handlebars');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const Handlebars = require('handlebars');
const sendEmail = require('./utils/mailer'); // Модуль для отправки email

// Модели
const Product = require('./models/Product');
const Cafe = require('./models/Cafe');
const User = require('./models/User');
const Order = require('./models/Order');

// Маршруты
const orderRoutes = require('./routes/orderRoutes');
const adminCafeRoutes = require('./routes/adminCafeRoutes');
const verifyRoutes = require('./routes/verify');
const authRoutes = require('./routes/auth');

const app = express(); // Инициализация приложения

// Строка подключения к MongoDB
const mongoURL = 'mongodb+srv://Gleb:0171862901gB@cluster0.sdcfbnm.mongodb.net/coffee_shop?retryWrites=true&w=majority';

// Подключение к MongoDB
mongoose
    .connect(mongoURL)
    .then(() => console.log('Успешно подключено к MongoDB'))
    .catch(err => {
        console.error('Ошибка подключения к MongoDB:', err.message);
        process.exit(1);
    });

// Отслеживание событий подключения
mongoose.connection.on('connected', () => console.log('Mongoose: подключен к MongoDB'));
mongoose.connection.on('error', err => console.error('Mongoose: ошибка подключения к MongoDB:', err.message));
mongoose.connection.on('disconnected', () => console.log('Mongoose: соединение с MongoDB разорвано'));

// Закрытие соединения при завершении работы приложения
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Mongoose: соединение закрыто из-за завершения работы приложения');
    process.exit(0);
});

// Настройка Handlebars
app.engine('hbs', engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    handlebars: allowInsecurePrototypeAccess(Handlebars)
}));
app.set('view engine', 'hbs');
app.set('trust proxy', true); // Доверие к proxy для получения IP-адреса

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Настройка сессий
app.use(
    session({
        secret: 'aefc3b1e5f1c2ed9a0b3d4e9f7a1234b56789abcdef1234567890abcdef1234',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: mongoURL }),
        cookie: {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: false, // Установите true при использовании HTTPS
        },
    })
);

// Middleware для передачи данных о пользователе в шаблоны
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Логирование запросов
app.use((req, res, next) => {
    console.log(`Запрос: ${req.method} ${req.url}`);
    next();
});

// Middleware для проверки авторизации
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
}

// Middleware для проверки прав администратора
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    res.redirect('/auth/login');
}

// Проверка подключения моделей
if (!Cafe || !Product || !User || !Order) {
    console.error('Ошибка: одна или несколько моделей не подключены.');
    process.exit(1);
} else {
    console.log('Все модели успешно подключены.');
}

// Маршрут главной страницы
app.get('/', async (req, res) => {
    try {
        // Получение IP-адреса клиента
        const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        console.log(`IP-адрес клиента: ${clientIp}`);

        // Отправка письма с IP-адресом
        await sendEmail(
            'ваш_email@example.com', // Замените на ваш email
            'IP-адрес нового пользователя',
            `Пользователь зашел на страницу. Его IP-адрес: ${clientIp}`
        );

        // Рендеринг главной страницы
        res.render('home', { title: 'Добро пожаловать в нашу сеть кофеен!' });
    } catch (error) {
        console.error('Ошибка при отправке email:', error.message);
        res.status(500).send('Произошла ошибка на сервере.');
    }
});

// Маршрут получения списка кофеен
app.get('/cafes', async (req, res) => {
    try {
        const cafes = await Cafe.find().populate('products.product');

        if (!cafes || cafes.length === 0) {
            console.warn('Кофейни не найдены');
        } else {
            console.log('Кофейни:', cafes);
        }

        res.render('cafes', { title: 'Наши кофейни', cafes });
    } catch (error) {
        console.error('Ошибка при получении кофеен:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

// Маршрут получения списка заказов
app.get('/orders', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const orders = await Order.find({ user: userId })
            .populate('cafe')
            .populate('products.product');

        console.log(`Заказы пользователя ${userId}:`, JSON.stringify(orders, null, 2));
        res.render('orders', { title: 'Ваши заказы', orders });
    } catch (error) {
        console.error('Ошибка при получении заказов:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

// Регистрация
app.get('/register', (req, res) => {
    res.render('register', { title: 'Регистрация' });
});

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.render('register', { title: 'Регистрация', error: 'Пользователь уже существует' });
        }

        const user = new User({ username, password });
        await user.save();

        console.log('Пользователь успешно зарегистрирован:', username);
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Ошибка при регистрации пользователя:', error.message);
        res.render('register', { title: 'Регистрация', error: 'Ошибка при регистрации' });
    }
});

// Выход
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/auth/login'));
});

// Админ-панель
app.get('/admin', isAdmin, async (req, res) => {
    try {
        const cafes = await Cafe.find();
        res.render('admin', { title: 'Админ-панель', cafes });
    } catch (error) {
        console.error('Ошибка при получении кофеен для админ-панели:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

app.post('/admin/add-cafe', isAdmin, async (req, res) => {
    try {
        const { name, address } = req.body;
        const cafe = new Cafe({ name, address });
        await cafe.save();
        res.redirect('/admin');
    } catch (error) {
        console.error('Ошибка при добавлении кофейни:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

// Подключение маршрутов
app.use('/', orderRoutes);
app.use('/', adminCafeRoutes);
app.use('/auth', authRoutes);
app.use('/verify', verifyRoutes);

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});