import { createApp } from 'vue';
import { createPinia } from 'pinia'; // Certifique-se de que o Pinia está instalado
import '@/styles/medieval-theme.css';
import App from './App.vue';
import router from './router/index.js'; // Ajuste o caminho se necessário

const app = createApp(App);

// Use Pinia
const pinia = createPinia();
app.use(pinia);

// Use Router
app.use(router);

// Mount the app
app.mount('#app');