const express = require('express');
const router = express.Router();
const Cafe = require('../models/Cafe');
const Recipe = require('../models/Recipe');
const isAuthenticated = require('../middleware/authMiddleware');

// Страница выбора кофеен и рецептов
router.get('/order', isAuthenticated, async (req, res) => {
    try {
        const cafes = await Cafe.find().populate({
            path: 'products.product',
        }); // Получаем список кофеен с продуктами
        res.render('order', { title: 'Сделать заказ', cafes });
    } catch (error) {
        console.error('Ошибка при получении кофеен:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

// Получение доступных рецептов для выбранной кофейни
router.get('/order/:cafeId', isAuthenticated, async (req, res) => {
    try {
        const { cafeId } = req.params;
        const cafes = await Cafe.find(); // Извлечение всех кофеен
        res.render('order', { title: 'Сделать заказ', cafes });

        // Получаем кофейню и связанные с ней продукты
        const cafe = await Cafe.findById(cafeId).populate({
            path: 'products.product',
        });

        if (!cafe) {
            return res.status(404).send('Кофейня не найдена');
        }

        // Получаем все рецепты
        const recipes = await Recipe.find().populate('ingredients.product');

        // Определяем, какие рецепты доступны в кофейне
        const availableRecipes = recipes.filter((recipe) => {
            return recipe.ingredients.every((ingredient) => {
                const product = cafe.products.find(
                    (p) => p.product._id.toString() === ingredient.product._id.toString()
                );
                return product && product.stock >= ingredient.amount;
            });
        });

        res.render('availableRecipes', {
            title: `Доступные рецепты в ${cafe.name}`,
            cafe,
            availableRecipes,
        });
    } catch (error) {
        console.error('Ошибка при получении рецептов:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

// Размещение заказа
router.post('/order/:cafeId', isAuthenticated, async (req, res) => {
    try {
        const { cafeId } = req.params;
        const { recipeId } = req.body;

        const recipe = await Recipe.findById(recipeId).populate('ingredients.product');
        const cafe = await Cafe.findById(cafeId).populate('products.product');

        if (!recipe || !cafe) {
            return res.status(404).send('Кофейня или рецепт не найдены');
        }

        // Проверка доступности ингредиентов
        const isAvailable = recipe.ingredients.every((ingredient) => {
            const product = cafe.products.find(
                (p) => p.product._id.toString() === ingredient.product._id.toString()
            );
            return product && product.stock >= ingredient.amount;
        });

        if (!isAvailable) {
            return res.render('availableRecipes', {
                title: 'Недостаточно ингредиентов',
                cafe,
                error: 'Недостаточно ингредиентов для выбранного рецепта',
            });
        }

        // Обновляем запасы ингредиентов
        for (const ingredient of recipe.ingredients) {
            const product = cafe.products.find(
                (p) => p.product._id.toString() === ingredient.product._id.toString()
            );
            product.stock -= ingredient.amount;
        }
        await cafe.save();

        // Добавляем заказ
        const order = new Order({
            user: req.session.user.id,
            cafe: cafeId,
            coffee: recipe.name,
        });
        await order.save();

        res.render('orderConfirmation', {
            title: 'Ваш заказ принят',
            message: `Ваш заказ на "${recipe.name}" принят!`,
        });
    } catch (error) {
        console.error('Ошибка при размещении заказа:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router;