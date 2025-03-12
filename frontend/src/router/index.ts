import AppLayout from '../layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { authService } from '../services/api';

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

// Navigation guards
router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const guestOnly = to.matched.some(record => record.meta.guestOnly);
    const isAuthenticated = authService.isAuthenticated();
    
    // Update document title
    document.title = to.meta.title 
        ? `${to.meta.title} | BriefButler` 
        : 'BriefButler';
    
    // Auth logic
    if (requiresAuth && !isAuthenticated) {
        // Redirect to login if trying to access protected route when not authenticated
        next({ name: 'login', query: { redirect: to.fullPath } });
    } else if (guestOnly && isAuthenticated) {
        // Redirect to dashboard if trying to access guest-only routes when authenticated
        next({ name: 'dashboard' });
    } else {
        // Proceed as normal
        next();
    }
});

export default router;
