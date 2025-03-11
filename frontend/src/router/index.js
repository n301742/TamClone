// import AppLayout from '@/layout/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/dummy',
            name: 'dummy',
            component: () => import('@/views/pages/dummy.vue')
        },
        {
            path: '/',
            name: 'home',
            component: () => import('@/views/pages/home.vue')
        }
    ]
});

export default router;
