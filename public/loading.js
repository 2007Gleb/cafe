
// Показать эффект загрузки
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

// Скрыть эффект загрузки
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}


// Добавляем обработку для всех форм

// Показываем эффект загрузки при переходе между страницами
window.addEventListener('load', hideLoading);
window.addEventListener('beforeunload', showLoading);
document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', () => {
            showLoading(); // Показываем загрузку при отправке формы
        });
    });

    // Пример обработки для AJAX-запросов (если используются fetch или другие API)
    const sendRequestWithLoading = async (url, options) => {
        try {
            showLoading();
            const response = await fetch(url, options);
            return await response.json();
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
            throw error;
        } finally {
            hideLoading();
        }
    };

    // Пример использования sendRequestWithLoading
    // sendRequestWithLoading('/your-endpoint', { method: 'POST', body: JSON.stringify(data) });
});