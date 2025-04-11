const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const MongoStore = require('connect-mongo');

const Cafe = require('./models/Cafe');
const User = require('./models/User'); // Подключение модели пользователя
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Инициализация приложения
const app = express();

// Строка подключения к MongoDB
const mongoURL = 'mongodb+srv://Gleb:0171862901gB@cluster0.sdcfbnm.mongodb.net/coffee_shop?retryWrites=true&w=majority';

// Подключение к MongoDB
mongoose.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Успешно подключено к MongoDB'))
    .catch((err) => console.error('Ошибка подключения к MongoDB:', err.message));

// Отслеживание событий подключения
mongoose.connection.on('connected', () => console.log('Mongoose: подключен к MongoDB'));
mongoose.connection.on('error', (err) => console.error('Mongoose: ошибка подключения к MongoDB:', err.message));
mongoose.connection.on('disconnected', () => console.log('Mongoose: соединение с MongoDB разорвано'));

// Закрытие соединения при завершении работы приложения
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Mongoose: соединение закрыто из-за завершения работы приложения');
    process.exit(0);
});

// Настройка Handlebars
app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
}));
app.set('view engine', 'hbs');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'aefc3b1e5f1c2ed9a0b3d4e9f7a1234b56789abcdef1234567890abcdef1234',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoURL, // Использование MongoDB для хранения сессий
        ttl: 24 * 60 * 60 // Время жизни сессии 24 часа
    }),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // Время жизни cookies (24 часа)
        httpOnly: true,
        secure: false // Установите true, если используете HTTPS
    }
}));

// Middleware для передачи информации о пользователе в шаблоны
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Middleware для проверки авторизации
function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/login');
}

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) return next();
    res.redirect('/login');
}

// Маршруты
app.get('/', (req, res) => {
    res.render('home', { title: 'Добро пожаловать в нашу сеть кофеен!' });
});

app.get('/cafes', async (req, res) => {
    try {
        const cafes = await Cafe.find();
        res.render('cafes', { title: 'Наши кофейни', cafes });
    } catch (error) {
        console.error('Ошибка при получении кофеен:', error.message);
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

        // Проверка на уникальность пользователя
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.render('register', { title: 'Регистрация', error: 'Пользователь уже существует' });
        }

        // Создание и сохранение нового пользователя
        const user = new User({ username, password });
        await user.save();
        console.log('Пользователь успешно зарегистрирован:', username);

        res.redirect('/login');
    } catch (error) {
        console.error('Ошибка при регистрации пользователя:', error.message);
        res.render('register', { title: 'Регистрация', error: 'Ошибка при регистрации' });
    }
});

// Вход
app.get('/login', (req, res) => {
    res.render('login', { title: 'Вход' });
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Поиск пользователя в базе данных
        const user = await User.findOne({ username });
        if (user && await user.comparePassword(password)) {
            req.session.user = { id: user._id, username: user.username, isAdmin: user.isAdmin };
            return res.redirect(user.isAdmin ? '/admin' : '/cafes');
        }

        res.render('login', { title: 'Вход', error: 'Неверные учетные данные' });
    } catch (error) {
        console.error('Ошибка при входе:', error.message);
        res.render('login', { title: 'Вход', error: 'Ошибка сервера' });
    }
});

// Выход
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
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
app.use('/', adminRoutes);

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});