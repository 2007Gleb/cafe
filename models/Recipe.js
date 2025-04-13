// models/Recipe.js
const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ingredients: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            amount: { type: Number, required: true }, // Количество продукта, необходимое для рецепта
        },
    ],
});

module.exports = mongoose.model('Recipe', RecipeSchema);