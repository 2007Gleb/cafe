const mongoose = require('mongoose');

// Схема для хранения истории входов
const loginHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ip: { type: String, required: true },
    location: { type: String, default: 'Неизвестно' },
    time: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LoginHistory', loginHistorySchema);