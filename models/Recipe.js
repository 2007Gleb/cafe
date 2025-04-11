const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Название кофе
    ingredients: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // Продукт
            amount: { type: Number, required: true }, // Количество продукта
        },
    ],
});

module.exports = mongoose.model('Recipe', RecipeSchema);