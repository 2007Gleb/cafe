const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Название продукта
    unit: { type: String, required: true }, // Единица измерения (г, мл)
});

module.exports = mongoose.model('Product', ProductSchema);