const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  
  // Додаємо конфігурацію проксі-сервера
  devServer: {
    headers: { "Access-Control-Allow-Origin": "*" },
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Цільовий сервер
        changeOrigin: true, // Змінюємо origin для запиту
        pathRewrite: { '^/api': '' }, // Видаляємо префікс '/api'
        secure: false, // Якщо сервер використовує самопідписаний SSL-сертифікат
      },
    },
  },
});