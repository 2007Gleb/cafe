require('dotenv').config(); // Подключение dotenv

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL, // Ваш Gmail из переменных окружения
        pass: process.env.EMAIL_PASSWORD, // Пароль приложения из переменных окружения
    },
});

const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: `"Coffee Shop" <${process.env.EMAIL}>`,
            to,
            subject,
            text,
        });
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};
async function sendEmail(to, subject, text) {
    try {
        const info = await transporter.sendMail({
            from: 'bobkovgleb38@gmail.com', // Адрес отправителя
            to, // Адрес получателя
            subject, // Тема письма
            text, // Текст письма
        });
        console.log('Email успешно отправлен:', info.response);
    } catch (error) {
        console.error('Ошибка при отправке email:', error.message);
        throw error; // Пробрасываем ошибку, чтобы обработать её в вызывающем коде
    }
}
module.exports = sendEmail;