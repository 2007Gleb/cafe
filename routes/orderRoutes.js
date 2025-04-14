const express = require('express');
const router = express.Router();
const Cafe = require('../models/Cafe');
const Recipe = require('../models/Recipe');
const Order = require('../models/Order');
const isAuthenticated = require('../middleware/authMiddleware');

// Получение кофеен и рецептов
router.get('/order', isAuthenticated, async (req, res) => {
    try {
        const cafes = await Cafe.find().populate('products.product');
        const recipes = await Recipe.find().populate('ingredients.product');

        // Создаем безопасные объекты кофеен
        const safeCafes = cafes.map(cafe => ({
            _id: cafe?._id?.toString() || '', // Защита от undefined
            name: cafe?.name || 'Неизвестная кофейня',
            products: cafe.products.map(product => ({
                product: product.product?._id?.toString() || '', // Защита от undefined
                stock: product?.stock || 0,
            })),
        }));

        res.render('order', { title: 'Сделать заказ', cafes: safeCafes, recipes });
    } catch (error) {
        console.error('Ошибка при получении кофеен и рецептов:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

// Получение рецептов для выбранной кофейни
router.post('/order/recipes', async (req, res) => {
    console.log('Запрос тела:', req.body);

    const { cafeId } = req.body;
    if (!cafeId) {
        console.error('Ошибка: cafeId не был предоставлен');
        return res.status(400).json({ error: 'Необходимо указать cafeId' });
    }

    try {
        const cafe = await Cafe.findById(cafeId).populate('products.product');
        if (!cafe) {
            return res.status(404).json({ error: 'Кофейня не найдена' });
        }

        const recipes = await Recipe.find().populate('ingredients.product');

        const availableRecipes = recipes.filter(recipe =>
            recipe.ingredients.every(ingredient => {
                const productInCafe = cafe.products.find(p =>
                    p.product && p.product.equals(ingredient.product)
                );
                return productInCafe && productInCafe.stock >= ingredient.amount;
            })
        );

        res.json(availableRecipes);
    } catch (error) {
        console.error('Ошибка маршрута /order/recipes:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение времени ожидания для выбранной кофейни
router.post('/cafe/wait-time', async (req, res) => {
    const { cafeId } = req.body;

    if (!cafeId) {
        return res.status(400).json({ error: 'Необходимо указать ID кофейни' });
    }

    try {
        const pendingOrdersCount = await Order.countDocuments({
            cafe: cafeId,
            isReady: false,
        });

        const estimatedWaitTime = pendingOrdersCount * 5;

        res.json({ estimatedWaitTime });
    } catch (error) {
        console.error('Ошибка при расчёте времени ожидания:', error.message);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обработка заказа
router.post('/order', isAuthenticated, async (req, res) => {
    const { recipeId, cafeId, quantity } = req.body;
    const userId = req.session.user.id;

    try {
        const recipe = await Recipe.findById(recipeId).populate('ingredients.product');
        const cafe = await Cafe.findById(cafeId).populate('products.product');

        if (!cafe) {
            return res.status(404).send('Кофейня не найдена');
        }

        if (!recipe) {
            return res.status(404).send('Рецепт не найден');
        }

        for (const ingredient of recipe.ingredients) {
            const productInCafe = cafe.products.find(p =>
                p.product && p.product.equals(ingredient.product)
            );

            if (productInCafe) {
                const totalRequired = ingredient.amount * quantity;
                if (productInCafe.stock >= totalRequired) {
                    productInCafe.stock -= totalRequired;
                } else {
                    return res.status(400).send('Недостаточно продуктов для выполнения заказа');
                }
            } else {
                return res.status(400).send('Продукт не найден в кофейне');
            }
        }

        await cafe.save();

        const newOrder = new Order({
            cafe: cafeId,
            user: userId,
            products: recipe.ingredients.map(ingredient => ({
                product: ingredient.product,
                quantity: ingredient.amount * quantity,
            })),
            coffeeName: recipe.name,
            quantity: quantity,
            status: 'Создан',
            createdAt: new Date(),
        });

        await newOrder.save();

        console.log('Новый заказ создан:', newOrder);

        res.redirect('/orders');
    } catch (error) {
        console.error('Ошибка при создании заказа:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router;