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

module.exports = sendEmail;