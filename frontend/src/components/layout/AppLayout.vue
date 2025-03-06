<script setup lang="ts">
import { ref, provide } from 'vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';

// Mobile sidebar state
const isSidebarVisible = ref(false);

// Provide the sidebar state to child components
provide('sidebarVisible', isSidebarVisible);

// Toggle sidebar visibility
function toggleSidebar() {
  isSidebarVisible.value = !isSidebarVisible.value;
}
</script>

<template>
  <div class="flex min-h-screen w-full">
    <!-- Sidebar component (handles both desktop and mobile views internally) -->
    <AppSidebar v-model:visible="isSidebarVisible" />
    
    <!-- Main content area -->
    <div class="flex flex-column flex-1 overflow-hidden">
      <!-- Top navigation bar -->
      <AppTopbar @toggle-sidebar="toggleSidebar" />
      
      <!-- Page content with automatic toast container -->
      <div class="flex-1 overflow-y-auto surface-ground p-4">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* All styling now uses PrimeVue utility classes */
</style> 