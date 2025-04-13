const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: String,
    stock: { type: Number, required: true }, // Общий остаток товара
});

module.exports = mongoose.model('Product', ProductSchema);