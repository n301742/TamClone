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
            { label: 'Address Book', icon: 'pi pi-fw pi-map-marker', to: '/address-book' },
            { label: 'PDF Processing', icon: 'pi pi-fw pi-file-pdf', to: '/pdf-processing' },
            { label: 'Document Upload', icon: 'pi pi-fw pi-upload', to: '/document-upload' }
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
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped>
/* Removed user-profile styles since they're no longer needed */
</style>
