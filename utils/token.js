const jwt = require('jsonwebtoken');

const secret = 'your-secret-key'; // Замените на ваш секретный ключ

// Генерация токена для подтверждения
const generateVerificationToken = (userId) => {
    return jwt.sign({ id: userId }, secret, { expiresIn: '1h' }); // Токен будет действителен 1 час
};

// Расшифровка токена
const verifyToken = (token) => {
    return jwt.verify(token, secret);
};

module.exports = { generateVerificationToken, verifyToken };