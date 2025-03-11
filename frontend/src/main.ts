import { createApp } from 'vue';
// Import Tailwind before other styles
import './assets/tailwind.css';
// Import main stylesheet
import './assets/style.scss';

import App from './App.vue';
import router from './router';

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import StyleClass from 'primevue/styleclass';

const app = createApp(App);

// Register StyleClass directive
app.directive('styleclass', StyleClass);

app.use(router);
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

app.mount('#app');