<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();
const userMenuRef = ref();

// Define emits
const emit = defineEmits(['toggle-sidebar']);

// User menu items
const userMenuItems = ref([
  {
    label: 'Profile',
    icon: 'pi pi-user',
    command: () => {
      // Navigate to profile page (will be implemented later)
    }
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    command: () => {
      router.push('/settings');
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

// Toggle user menu
function toggleUserMenu(event: Event) {
  userMenuRef.value.toggle(event);
}

// Toggle dark/light mode (placeholder for now)
function toggleTheme() {
  // This will be implemented later
  console.log('Theme toggle clicked');
}

// User display for the end template
const userDisplay = computed(() => {
  return authStore.user ? `${authStore.user.firstName}` : 'Guest';
});

// Get the first letter of user's first name for the avatar
const userInitial = computed(() => {
  if (authStore.user && authStore.user.firstName) {
    return authStore.user.firstName.charAt(0).toUpperCase();
  }
  return 'G';
});
</script>

<template>
  <Menubar :model="[]" class="border-none border-bottom-1 border-300 py-2 px-3">
    <!-- Start slot for logo and mobile menu button -->
    <template #start>
      <div class="flex align-items-center">
        <!-- Mobile menu toggle, only visible on mobile -->
        <Button 
          icon="pi pi-bars" 
          text 
          rounded
          class="md:hidden mr-2"
          aria-label="Toggle menu"
          @click="emit('toggle-sidebar')"
        />
        
        <h2 class="text-primary font-semibold text-xl m-0">BriefButler</h2>
      </div>
    </template>
    
    <!-- End slot for user controls -->
    <template #end>
      <div class="flex align-items-center gap-3">
        <!-- Theme toggle -->
        <Button 
          icon="pi pi-moon" 
          text 
          rounded 
          aria-label="Toggle theme"
          @click="toggleTheme"
        />
        
        <!-- User avatar and menu trigger -->
        <div class="flex align-items-center cursor-pointer" @click="toggleUserMenu($event)">
          <Avatar :label="userInitial" shape="circle" class="mr-2" style="background-color:var(--primary-color); color: var(--primary-color-text)" />
          <span class="font-medium text-color hidden md:block">{{ userDisplay }}</span>
          <i class="pi pi-angle-down ml-2 hidden md:block"></i>
        </div>
        
        <!-- Popup menu for user actions -->
        <Menu ref="userMenuRef" :model="userMenuItems" :popup="true" />
      </div>
    </template>
  </Menubar>
</template>

<style scoped>
/* All styling now uses PrimeVue utility classes */
</style> 