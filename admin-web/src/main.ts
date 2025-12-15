import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import './assets/main.css';

import App from './App.vue';
import router from './router';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(Antd);

app.mount('#app');

// 初始化暗黑模式
import { useUiStore } from './stores/ui';
const ui = useUiStore();
if (ui.darkMode) {
	document.body.setAttribute('data-theme', 'dark');
	document.documentElement.classList.add('dark');
}
