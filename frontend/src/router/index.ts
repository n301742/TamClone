import AppLayout from '../layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { authService } from '../services/api';
import { useAuthStore } from '../stores/auth';

// Router type definitions
export interface RouteMetaData {
  requiresAuth?: boolean;
  guestOnly?: boolean;
  title?: string;
}

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '/',
                    name: 'dashboard',
                    component: () => import('../views/Dashboard.vue'),
                    meta: { requiresAuth: true, title: 'Dashboard' }
                },
                {
                    path: '/profile',
                    name: 'userProfile',
                    component: () => import('../views/pages/UserProfile.vue'),
                    meta: { requiresAuth: true, title: 'My Profile' }
                },
                {
                    path: '/letters',
                    name: 'letters',
                    component: () => import('../views/pages/Letters.vue'),
                    meta: { requiresAuth: true, title: 'My Letters' }
                },
                {
                    path: '/address-book',
                    name: 'addressBook',
                    component: () => import('../views/pages/AddressBook.vue'),
                    meta: { requiresAuth: true, title: 'Address Book' }
                },
                {
                    path: '/uikit/formlayout',
                    name: 'formlayout',
                    component: () => import('../views/uikit/FormLayout.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: '/uikit/input',
                    name: 'input',
                    component: () => import('../views/uikit/InputDoc.vue')
                },
                {
                    path: '/uikit/button',
                    name: 'button',
                    component: () => import('../views/uikit/ButtonDoc.vue')
                },
                {
                    path: '/uikit/table',
                    name: 'table',
                    component: () => import('../views/uikit/TableDoc.vue')
                },
                {
                    path: '/uikit/list',
                    name: 'list',
                    component: () => import('../views/uikit/ListDoc.vue')
                },
                {
                    path: '/uikit/tree',
                    name: 'tree',
                    component: () => import('../views/uikit/TreeDoc.vue')
                },
                {
                    path: '/uikit/panel',
                    name: 'panel',
                    component: () => import('../views/uikit/PanelsDoc.vue')
                },
                {
                    path: '/uikit/overlay',
                    name: 'overlay',
                    component: () => import('../views/uikit/OverlayDoc.vue')
                },
                {
                    path: '/uikit/media',
                    name: 'media',
                    component: () => import('../views/uikit/MediaDoc.vue')
                },
                {
                    path: '/uikit/message',
                    name: 'message',
                    component: () => import('../views/uikit/MessagesDoc.vue')
                },
                {
                    path: '/uikit/file',
                    name: 'file',
                    component: () => import('../views/uikit/FileDoc.vue')
                },
                {
                    path: '/uikit/menu',
                    name: 'menu',
                    component: () => import('../views/uikit/MenuDoc.vue')
                },
                {
                    path: '/uikit/charts',
                    name: 'charts',
                    component: () => import('../views/uikit/ChartDoc.vue')
                },
                {
                    path: '/uikit/misc',
                    name: 'misc',
                    component: () => import('../views/uikit/MiscDoc.vue')
                },
                {
                    path: '/uikit/timeline',
                    name: 'timeline',
                    component: () => import('../views/uikit/TimelineDoc.vue')
                },
                {
                    path: '/pages/empty',
                    name: 'empty',
                    component: () => import('../views/pages/Empty.vue')
                },
                {
                    path: '/pages/crud',
                    name: 'crud',
                    component: () => import('../views/pages/Crud.vue')
                },
                {
                    path: '/pdf-processing',
                    name: 'pdfProcessing',
                    component: () => import('../views/pages/PdfProcessingDemo.vue'),
                    meta: { requiresAuth: true, title: 'PDF Processing Demo' }
                },
                {
                    path: '/documentation',
                    name: 'documentation',
                    component: () => import('../views/pages/Documentation.vue')
                }
            ]
        },
        {
            path: '/home',
            name: 'landing',
            component: () => import('../views/pages/Home.vue')
        },
        {
            path: '/dummy',
            name: 'dummy',
            component: () => import('../views/pages/Dummy.vue')
        },
        {
            path: '/auth/login',
            name: 'login',
            component: () => import('../views/pages/auth/Login.vue'),
            meta: { guestOnly: true, title: 'Login' }
        },
        {
            path: '/auth/register',
            name: 'register',
            component: () => import('../views/pages/auth/Register.vue'),
            meta: { guestOnly: true, title: 'Register' }
        },
        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('../views/pages/auth/Access.vue')
        },
        {
            path: '/auth/callback',
            name: 'authCallback',
            component: () => import('../views/pages/auth/AuthCallback.vue'),
            meta: { title: 'Authentication Callback' }
        },
        {
            path: '/auth/error',
            name: 'error',
            component: () => import('../views/pages/auth/Error.vue')
        },
        {
            path: '/:catchAll(.*)',
            name: 'notFound',
            component: () => import('../views/pages/NotFound.vue')
        }
    ]
});

// Navigation guard to handle authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const guestOnly = to.matched.some(record => record.meta.guestOnly);

  // Debug info
  console.log(`Route navigation: ${from.path} -> ${to.path}`);
  console.log(`Requires auth: ${requiresAuth}, Is authenticated: ${authStore.isAuthenticated}`);
  console.log(`Guest only: ${guestOnly}`);

  // Update document title
  document.title = to.meta.title 
    ? `${to.meta.title} | BriefButler` 
    : 'BriefButler';

  // If route requires authentication and user is not authenticated
  if (requiresAuth && !authStore.isAuthenticated) {
    console.log('Authentication required, redirecting to login');
    // Redirect to login page with intended destination
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    });
  } 
  // If route is guest-only and user is authenticated
  else if (guestOnly && authStore.isAuthenticated) {
    console.log('Guest-only route, redirecting to dashboard');
    // Redirect to dashboard
    next({ name: 'dashboard' });
  } 
  // Otherwise proceed normally
  else {
    console.log('Authentication check passed or not required');
    next();
  }
});

export default router;
