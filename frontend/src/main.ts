import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
// Import Form from PrimeVue forms for later component registration
import { Form } from '@primevue/forms'

// PrimeVue theme
import Aura from '@primeuix/themes/aura'

// PrimeIcons
import 'primeicons/primeicons.css'

// Style
import './style.css'

// App
import App from './App.vue'

// Import views
import LoginView from './views/LoginView.vue'
import DashboardView from './views/DashboardView.vue'
import LetterUploadView from './views/LetterUploadView.vue'
import HistoryView from './views/HistoryView.vue'
import SettingsView from './views/SettingsView.vue'
import NotFoundView from './views/NotFoundView.vue'
import AuthCallbackView from './views/AuthCallbackView.vue'

// Create the pinia store
const pinia = createPinia()

// Define routes with authentication requirements
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: AuthCallbackView,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: '/upload',
    name: 'letter-upload',
    component: LetterUploadView,
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryView,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: { requiresAuth: false }
  }
]

// Create the router
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Create the Vue app
const app = createApp(App)

// Use plugins
app.use(pinia)
app.use(router)
app.use(PrimeVue, {
  unstyled: false,
  pt: {},
  theme: {
    preset: Aura,
    darkMode: false
  }
})
app.use(ToastService)
app.use(ConfirmationService)
// Form is registered as a component below, not as a plugin

// Import auth store - will be used in navigation guards
import { useAuthStore } from './stores/auth.store'

// Create app with async setup to handle authentication before mounting
async function initApp() {
  // Import auth store - will be used in navigation guards
  const authStore = useAuthStore();
  
  // Preload authentication state before setting up navigation guards
  try {
    await authStore.checkAuth();
  } catch (error) {
    console.error('Initial auth check failed:', error);
  }
  
  // Setup navigation guards
  router.beforeEach(async (to, from, next) => {
    // Check if the route requires authentication
    const requiresAuth = to.meta.requiresAuth === true;
    
    // Use already loaded auth state to prevent flashing
    const isAuthenticated = authStore.isAuthenticated;
    
    if (requiresAuth && !isAuthenticated) {
      // If route requires auth but user is not authenticated, redirect to login
      next({ name: 'login', query: { redirect: to.fullPath } });
    } else if (to.path === '/login' && isAuthenticated) {
      // If user is already authenticated and tries to access login page, redirect to dashboard
      next({ name: 'dashboard' });
    } else {
      // Otherwise proceed normally
      next();
    }
  });
  
  // Mount the app
  app.mount('#app');
}

// Initialize the application
initApp().catch(error => {
  console.error('Failed to initialize app:', error);
});

// Register commonly used PrimeVue components globally
import Button from 'primevue/button'
import Card from 'primevue/card'
import Toast from 'primevue/toast'
import Menubar from 'primevue/menubar'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import Drawer from 'primevue/drawer'
import PanelMenu from 'primevue/panelmenu'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Divider from 'primevue/divider'
import ProgressSpinner from 'primevue/progressspinner'
import Message from 'primevue/message'
import IconField from 'primevue/iconfield'

app.component('Button', Button)
app.component('Card', Card)
app.component('Toast', Toast)
app.component('Menubar', Menubar)
app.component('Avatar', Avatar)
app.component('Menu', Menu)
app.component('Drawer', Drawer)
app.component('PanelMenu', PanelMenu)
app.component('InputText', InputText)
app.component('Password', Password)
app.component('Divider', Divider)
app.component('ProgressSpinner', ProgressSpinner)
app.component('Message', Message)
app.component('Form', Form)
app.component('IconField', IconField)
