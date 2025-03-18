<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useLayout } from './composables/layout';
import Menu from 'primevue/menu';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import AppConfigurator from './AppConfigurator.vue';

const router = useRouter();
const authStore = useAuthStore();
const { 
  darkTheme, 
  toggleDarkMode: toggleTheme, 
  mobileMenuActive, 
  toggleMobileMenuActive,  
  layoutConfig 
} = useLayout();

const userMenu = ref();
const configRef = ref();

// Function to toggle the configurator panel
const toggleConfig = (event?: Event) => {
  if (configRef.value) {
    // Pass the event to the toggle function in AppConfigurator
    configRef.value.toggle(event);
  }
};

// Only show API status indicator when API is disconnected
const showApiStatus = computed(() => authStore.apiConnected === false);

const isAuthenticated = computed(() => authStore.isAuthenticated);
const currentUser = computed(() => authStore.user);

const userInitials = computed(() => {
  if (!currentUser.value || !currentUser.value.email) {
    return 'U';
  }
  
  const nameParts = currentUser.value.email.split('@')[0].split('.');
  if (nameParts.length >= 2) {
    return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
  }
  return nameParts[0].substring(0, 2).toUpperCase();
});

const userMenuItems = computed(() => [
  {
    label: 'Profile',
    icon: 'pi pi-user',
    command: () => router.push('/profile')
  },
  {
    label: 'Documents',
    icon: 'pi pi-file',
    command: () => router.push('/documents')
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    command: () => router.push('/settings')
  },
  {
    separator: true
  },
  {
    label: 'Logout',
    icon: 'pi pi-sign-out',
    command: () => logout()
  }
]);

const logoUrl = computed(() => {
  return '/BriefButlerLogo.svg';
});

function openUserMenu(event: Event) {
  userMenu.value.toggle(event);
}

function login() {
  router.push('/auth/login');
}

function signUp() {
  router.push('/auth/register');
}

function logout() {
  authStore.logout();
  router.push('/auth/login');
}
</script>

<template>
  <div class="layout-topbar">
    <!-- Logo Section with Burger Menu -->
    <div class="flex items-center">
      <!-- Burger Menu (Left Side) -->
      <Button 
        icon="pi pi-bars"
        class="p-button-rounded p-button-text p-button-plain mr-2" 
        @click="toggleMobileMenuActive"
      />
      
      <!-- Logo and App Name -->
      <router-link to="/" class="layout-topbar-logo">
        <img 
          :src="logoUrl" 
          alt="BriefButler Logo" 
          class="h-10 mr-2"
        />
        <span class="font-semibold text-lg">BriefButler</span>
      </router-link>
    </div>
    
    <!-- Actions Section (Right Aligned) -->
    <div class="flex items-center ml-auto">
      <!-- API Status Indicator - only show when disconnected -->
      <div v-if="showApiStatus" class="mr-4 flex items-center bg-red-50 px-2 py-1 rounded-md">
        <i class="pi pi-exclamation-triangle text-red-500 mr-2"></i>
        <span class="text-sm text-red-500">API Offline</span>
      </div>
      
      <!-- Theme Toggle -->
      <Button 
        v-if="darkTheme" 
        icon="pi pi-sun" 
        class="p-button-rounded p-button-text p-button-plain mr-2" 
        @click="toggleTheme"
        aria-label="Toggle to light mode"
      />
      <Button 
        v-else
        icon="pi pi-moon" 
        class="p-button-rounded p-button-text p-button-plain mr-2" 
        @click="toggleTheme"
        aria-label="Toggle to dark mode"
      />
      
      <!-- Configurator Button -->
      <div class="relative inline-block">
        <Button 
          icon="pi pi-palette"
          class="p-button-rounded p-button-text p-button-plain mr-2 configurator-toggle-button" 
          @click="toggleConfig"
          aria-label="Configuration"
        />
        <AppConfigurator ref="configRef" />
      </div>
      
      <!-- User Menu -->
      <div class="hidden md:flex items-center">
        <template v-if="isAuthenticated">
          <Button 
            class="p-button-rounded p-button-text p-button-plain mr-2" 
            @click="openUserMenu"
            aria-label="User menu"
          >
            <Avatar 
              size="large" 
              shape="circle" 
              :label="userInitials" 
              class="bg-primary text-white"
            />
          </Button>
          <Menu id="user-menu" ref="userMenu" :model="userMenuItems" :popup="true" />
        </template>
        <template v-else>
          <Button 
            label="Login" 
            icon="pi pi-sign-in" 
            class="p-button-outlined mr-2" 
            @click="login"
          />
          <Button 
            label="Sign Up" 
            icon="pi pi-user-plus" 
            @click="signUp"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout-topbar {
  @apply flex items-center justify-between h-16 px-4 relative z-50;
  background-color: var(--surface-card);
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
}

.layout-topbar-logo {
  @apply flex items-center;
  color: var(--text-color);
}

:deep(.p-button.p-button-text.p-button-plain) {
  @apply p-2;
  color: var(--text-color);
  
  &:hover {
    background-color: var(--surface-hover);
  }
}

:deep(.p-avatar) {
  &.bg-primary {
    background-color: var(--primary-color);
  }
  &.text-white {
    color: var(--primary-color-text);
  }
}
</style>
