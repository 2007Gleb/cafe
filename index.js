const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const MongoStore = require('connect-mongo');
const Product = require('./models/Product');
const Cafe = require('./models/Cafe');
const User = require('./models/User');
const Order = require('./models/Order');
const orderRoutes = require('./routes/orderRoutes'); // Маршруты для заказов
const adminCafeRoutes = require('./routes/adminCafeRoutes'); // Импорт маршрутов
const { engine } = require('express-handlebars');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const Handlebars = require('handlebars');

const verifyRoutes = require('./routes/verify');
const app = express(); // Инициализация приложения
const authRoutes = require('./routes/auth'); // Импорт маршрутов авторизации

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
    handlebars: allowInsecurePrototypeAccess(Handlebars) // Разрешение доступа к прототипам
}));
app.set('view engine', 'hbs');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Настройка сессий

app.use(
    session({
        secret: 'aefc3b1e5f1c2ed9a0b3d4e9f7a1234b56789abcdef1234567890abcdef1234', // Уникальный секретный ключ
        resave: false, // Не сохранять сессию, если она не изменялась
        saveUninitialized: false, // Не сохранять пустые сессии
        store: MongoStore.create({ mongoUrl: 'mongodb+srv://Gleb:0171862901gB@cluster0.sdcfbnm.mongodb.net/coffee_shop?retryWrites=true&w=majority' }), // Хранилище для сессий
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 часа
            httpOnly: true, // Запрет JavaScript доступ к cookies
            secure: false, // Установите true при использовании HTTPS
        },
    })
);
// Middleware для передачи данных о пользователе в шаблоны
app.use((req, res, next) => {
    res.locals.user = req.session.user || null; // Доступ к данным пользователя в шаблонах
    next();
});
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
app.get('/', (req, res) => {
    res.render('home', { title: 'Добро пожаловать в нашу сеть кофеен!' });
});

// Маршрут получения списка кофеен
app.get('/cafes', async (req, res) => {
    try {
        const cafes = await Cafe.find().populate('products.product'); // Загрузка кофеен с продуктами

        if (!cafes || cafes.length === 0) {
            console.warn('Кофейни не найдены');
        } else {
            console.log('Кофейни:', cafes); // Логирование данных
        }

        res.render('cafes', { title: 'Наши кофейни', cafes });
    } catch (error) {
        console.error('Ошибка при получении кофеен:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

// Маршрут получения списка заказов (с учётом авторизации)
app.get('/orders', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.user.id; // Получаем ID текущего пользователя

        // Фильтруем заказы по пользователю
        const orders = await Order.find({ user: userId })
            .populate('cafe') // Подгружаем данные кофейни
            .populate('products.product'); // Подгружаем данные продуктов (если нужно)

        // Логируем заказы для проверки
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

// Вход


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
app.use('/', adminCafeRoutes); // Подключение маршрутов
app.use('/auth', authRoutes); // Подключение маршрутов с префиксом /auth
app.use('/verify', verifyRoutes);
// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});