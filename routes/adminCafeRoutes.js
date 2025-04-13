const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cafe = require('../models/Cafe');

// Админ-страница для управления заказами конкретной кофейни
router.get('/admin/cafe/:cafeId', async (req, res) => {
    try {
        const cafeId = req.params.cafeId;
        const cafe = await Cafe.findById(cafeId);
        const orders = await Order.find({ cafe: cafeId }).populate('products.product');

        if (!cafe) {
            return res.status(404).send('Кофейня не найдена');
        }

        res.render('adminCafe', { title: `Управление заказами: ${cafe.name}`, cafe, orders });
    } catch (error) {
        console.error('Ошибка при загрузке админ-страницы:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

// Обновление статуса готовности заказа
router.post('/admin/order/:orderId/ready', async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const { isReady } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Заказ не найден');
        }

        order.isReady = isReady === 'true'; // Преобразуем строку в логическое значение
        await order.save();

        res.redirect(`/admin/cafe/${order.cafe}`);
    } catch (error) {
        console.error('Ошибка при обновлении статуса готовности заказа:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router;