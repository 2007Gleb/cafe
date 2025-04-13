const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Ссылка на пользователя
    cafe: { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe', required: true }, // Ссылка на кофейню
    products: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // Ссылка на продукт
            quantity: { type: Number, required: true }, // Количество продукта
        },
    ],
    coffeeName: { type: String, required: true }, // Название кофе
    quantity: { type: Number, required: true }, // Количество порций
    status: { type: String, default: 'pending' }, // Статус заказа
    isReady: { type: Boolean, default: false }, // Готовность заказа
    createdAt: { type: Date, default: Date.now }, // Дата создания
});

module.exports = mongoose.model('Order', OrderSchema);