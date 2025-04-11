const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cafe: { type: mongoose.Schema.Types.ObjectId, ref: 'Cafe', required: true },
    coffee: { type: String, required: true }, // Название кофе
    status: { type: String, default: 'Принят' }, // Статус заказа
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', OrderSchema);