import { createApp } from 'vue';
// Import PrimeVue resources first
import 'primeicons/primeicons.css';
// Import Tailwind before other styles
import './assets/tailwind.css';
// Import main stylesheet
import './assets/style.scss';

import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import { useAuthStore } from './stores/auth';

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import StyleClass from 'primevue/styleclass';

// Create pinia instance
const pinia = createPinia();
const app = createApp(App);

// Register StyleClass directive
app.directive('styleclass', StyleClass);

// Register plugins
app.use(router);
app.use(pinia);
app.use(PrimeVue, {
    // Configure PrimeVue to work with Tailwind
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.app-dark'
        }
    },
    ripple: true,
    // Important: Don't use unstyled mode unless you're overriding all component styles
    unstyled: false
});
app.use(ToastService);
app.use(ConfirmationService);

// Initialize the auth store to check API connectivity and authentication status
const authStore = useAuthStore();
authStore.initialize().catch(err => {
    console.error('Failed to initialize auth store:', err);
});

app.mount('#app');