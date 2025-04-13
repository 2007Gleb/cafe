const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const isAuthenticated = require('../middleware/authMiddleware'); // Middleware для проверки авторизации

// Маршрут для отображения заказов авторизованного пользователя
router.get('/orders', isAuthenticated, async (req, res) => {
    try {
        // Получение ID текущего авторизованного пользователя
        const userId = req.session.user.id;

        // Поиск заказов, принадлежащих пользователю
        const orders = await Order.find({ user: userId })
            .populate('cafe') // Заполнить данные о кофейне
            .populate('products.product'); // Заполнить данные о продуктах

        console.log('Заказы текущего пользователя:', JSON.stringify(orders, null, 2));

        // Рендер страницы с заказами
        res.render('orders', {
            title: 'Ваши заказы',
            orders
        });
    } catch (error) {
        console.error('Ошибка при получении заказов:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router;