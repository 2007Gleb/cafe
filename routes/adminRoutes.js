const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Убедитесь, что путь к модели корректен
const isAdmin = require('../middleware/adminMiddleware'); // Убедитесь, что middleware корректно импортирован

// Страница админки для управления заказами
router.get('/admin/:cafeId', isAdmin, async (req, res) => {
    const { cafeId } = req.params;
    try {
        const orders = await Order.find({ cafe: cafeId });
        res.render('admin', { title: 'Админ-панель', orders });
    } catch (error) {
        console.error('Ошибка при получении заказов:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

// Обновление статуса заказа
router.post('/admin/:cafeId/order/:orderId', isAdmin, async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    try {
        await Order.findByIdAndUpdate(orderId, { status });
        res.redirect(`/admin/${req.params.cafeId}`);
    } catch (error) {
        console.error('Ошибка при обновлении заказа:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router;