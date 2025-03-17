<script setup>
import { useLayout } from '@/layout/composables/layout';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import AppConfigurator from './AppConfigurator.vue';

const { toggleMenu, toggleDarkMode, isDarkTheme } = useLayout();
const authStore = useAuthStore();
const router = useRouter();

// Check if user is authenticated
const isAuthenticated = computed(() => authStore.isAuthenticated);
const userFullName = computed(() => authStore.userFullName || 'Guest');

// Check if API is connected
const isApiConnected = computed(() => authStore.apiConnected !== false);

// Handle login and logout
const handleLogin = () => {
  router.push('/auth/login');
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/auth/login');
};

const handleProfile = () => {
  router.push('/profile');
};
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <router-link to="/" class="layout-topbar-logo">
                <img src="/BriefButlerLogo.svg" alt="BriefButler Logo" />
                <span>BriefButler</span>
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <!-- API Status Indicator -->
            <div v-if="!isApiConnected" class="api-status-indicator">
                <i class="pi pi-exclamation-triangle text-yellow-500 mr-2"></i>
                <span class="text-sm text-yellow-500">API Offline (Using Mock Data)</span>
            </div>
            
            <div class="layout-config-menu">
                <button type="button" class="layout-topbar-action" @click="toggleDarkMode">
                    <i :class="['pi', { 'pi-moon': isDarkTheme, 'pi-sun': !isDarkTheme }]"></i>
                </button>
                <div class="relative">
                    <button
                        v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
                        type="button"
                        class="layout-topbar-action layout-topbar-action-highlight"
                    >
                        <i class="pi pi-palette"></i>
                    </button>
                    <AppConfigurator />
                </div>
            </div>

            <button
                class="layout-topbar-menu-button layout-topbar-action"
                v-styleclass="{ selector: '@next', enterFromClass: 'hidden', enterActiveClass: 'animate-scalein', leaveToClass: 'hidden', leaveActiveClass: 'animate-fadeout', hideOnOutsideClick: true }"
            >
                <i class="pi pi-ellipsis-v"></i>
            </button>

            <div class="layout-topbar-menu hidden lg:block">
                <div class="layout-topbar-menu-content">
                    <!-- Authentication buttons based on state -->
                    <template v-if="isAuthenticated">
                        <button type="button" class="layout-topbar-action" @click="handleProfile">
                            <i class="pi pi-user"></i>
                            <span>{{ userFullName }}</span>
                        </button>
                        <button type="button" class="layout-topbar-action" @click="handleLogout">
                            <i class="pi pi-sign-out"></i>
                            <span>Logout</span>
                        </button>
                    </template>
                    <button v-else type="button" class="layout-topbar-action" @click="handleLogin">
                        <i class="pi pi-sign-in"></i>
                        <span>Login</span>
                    </button>
                    
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-calendar"></i>
                        <span>Calendar</span>
                    </button>
                    <button type="button" class="layout-topbar-action">
                        <i class="pi pi-inbox"></i>
                        <span>Messages</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.api-status-indicator {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    margin-right: 1rem;
    border-radius: 0.5rem;
    background-color: rgba(var(--yellow-500), 0.1);
}

.layout-topbar-logo img {
    height: 2.5rem;
    width: auto;
    margin-right: 0.5rem;
}
</style>
