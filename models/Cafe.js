const mongoose = require('mongoose');

const CafeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    products: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            stock: { type: Number, required: true },
        },
    ],
});

module.exports = mongoose.model('Cafe', CafeSchema);