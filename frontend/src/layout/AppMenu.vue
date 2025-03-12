<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import AppMenuItem from './AppMenuItem.vue';

// Define interfaces for menu items
interface MenuItem {
  label: string;
  icon?: string;
  to?: string;
  url?: string;
  target?: string;
  class?: string;
  command?: () => void;
  items?: MenuItem[];
}

interface MenuGroup {
  label: string;
  icon?: string;
  to?: string;
  items: MenuItem[];
  separator?: boolean;
}

// Get authentication state
const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);
const userName = computed(() => authStore.userFullName);

// Menu model
const model = ref<MenuGroup[]>([
    {
        label: 'Home',
        items: [
            { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' }
        ]
    },
    {
        label: 'Mail Management',
        items: [
            { label: 'My Letters', icon: 'pi pi-fw pi-envelope', to: '/letters' },
            { label: 'Address Book', icon: 'pi pi-fw pi-map-marker', to: '/address-book' }
        ]
    },
    {
        label: 'Account',
        items: [
            { label: 'My Profile', icon: 'pi pi-fw pi-user', to: '/profile' },
            { 
                label: 'Logout', 
                icon: 'pi pi-fw pi-sign-out', 
                command: () => {
                    authStore.logout().then(() => {
                        window.location.href = '/auth/login';
                    });
                }
            }
        ]
    },
    {
        label: 'Developer Resources',
        items: [
            // UI component examples (only for development)
            { label: 'UI Components', icon: 'pi pi-fw pi-palette', to: '/uikit/formlayout' },
            { label: 'Documentation', icon: 'pi pi-fw pi-book', to: '/documentation' }
        ]
    }
]);
</script>

<template>
    <ul class="layout-menu">
        <div v-if="isAuthenticated" class="user-profile mb-4 p-3">
            <div class="text-center">
                <div class="avatar-circle mb-2">
                    <span class="avatar-initials">{{ userName.split(' ').map(n => n[0]).join('') }}</span>
                </div>
                <div class="font-semibold">{{ userName }}</div>
            </div>
        </div>
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped>
.user-profile {
    border-radius: 12px;
    background-color: var(--surface-card);
    
    .avatar-circle {
        background-color: var(--primary-color);
        color: var(--primary-color-text);
        border-radius: 50%;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
        
        .avatar-initials {
            font-size: 18px;
            font-weight: 600;
        }
    }
}
</style>
