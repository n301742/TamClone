<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';
import Avatar from 'primevue/avatar';
import PanelMenu from 'primevue/panelmenu';
import Button from 'primevue/button';
import Drawer from 'primevue/drawer';

const props = defineProps({
  visible: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:visible']);

const router = useRouter();
const authStore = useAuthStore();

// Define navigation items using PanelMenu format
const menuItems = computed(() => [
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    command: () => {
      router.push('/');
      closeMenuOnMobile();
    }
  },
  {
    label: 'Upload Letter',
    icon: 'pi pi-upload',
    command: () => {
      router.push('/upload');
      closeMenuOnMobile();
    }
  },
  {
    label: 'Letter History',
    icon: 'pi pi-history',
    command: () => {
      router.push('/history');
      closeMenuOnMobile();
    }
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    command: () => {
      router.push('/settings');
      closeMenuOnMobile();
    }
  },
  { separator: true },
  {
    label: 'Logout',
    icon: 'pi pi-sign-out',
    command: async () => {
      await authStore.logout();
      router.push('/login');
    }
  }
]);

// Toggle drawer visibility
function toggleSidebar() {
  emit('update:visible', !props.visible);
}

// Function to close sidebar on mobile when a menu item is clicked
function closeMenuOnMobile() {
  if (window.innerWidth < 768) {
    emit('update:visible', false);
  }
}

// Get the user's initials for avatar
const userInitials = computed(() => {
  if (authStore.user) {
    const first = authStore.user.firstName ? authStore.user.firstName.charAt(0) : '';
    const last = authStore.user.lastName ? authStore.user.lastName.charAt(0) : '';
    return (first + last).toUpperCase();
  }
  return 'U';
});
</script>

<template>
  <!-- Desktop sidebar - always visible on larger screens -->
  <div class="hidden md:block h-screen w-18rem shadow-1">
    <div class="surface-section h-full flex flex-column border-right-1 surface-border">
      <div class="p-3 border-bottom-1 surface-border flex align-items-center justify-content-center">
        <h1 class="text-xl font-bold text-primary m-0">BriefButler</h1>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        <PanelMenu :model="menuItems" class="border-none w-full" />
      </div>
      
      <div v-if="authStore.user" class="p-3 border-top-1 surface-border flex align-items-center">
        <Avatar :label="userInitials" shape="circle" size="large" class="mr-2" 
                style="background-color:var(--primary-color); color: var(--primary-color-text)" />
        <div class="flex flex-column">
          <span class="font-semibold">{{ authStore.user.firstName }} {{ authStore.user.lastName }}</span>
          <span class="text-sm text-color-secondary">{{ authStore.user.email }}</span>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Mobile sidebar - shown as Drawer component -->
  <Drawer v-model:visible="props.visible" position="left" class="md:hidden w-18rem">
    <div class="flex flex-column h-full">
      <div class="p-3 border-bottom-1 surface-border flex align-items-center justify-content-between">
        <h1 class="text-xl font-bold text-primary m-0">BriefButler</h1>
        <Button icon="pi pi-times" text rounded @click="toggleSidebar" />
      </div>
      
      <div class="flex-1 overflow-y-auto">
        <PanelMenu :model="menuItems" class="border-none w-full" />
      </div>
      
      <div v-if="authStore.user" class="p-3 border-top-1 surface-border flex align-items-center">
        <Avatar :label="userInitials" shape="circle" size="large" class="mr-2" 
                style="background-color:var(--primary-color); color: var(--primary-color-text)" />
        <div class="flex flex-column">
          <span class="font-semibold">{{ authStore.user.firstName }} {{ authStore.user.lastName }}</span>
          <span class="text-sm text-color-secondary">{{ authStore.user.email }}</span>
        </div>
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
/* All styling now uses PrimeVue utility classes */
</style> 