<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

// Initialize auth store - this will check if the user is logged in
// and load user data if there's a valid token
const authStore = useAuthStore();

onMounted(async () => {
  try {
    await authStore.initialize();
  } catch (error) {
    console.error('Failed to initialize auth store:', error);
  }
});
</script>

<template>
    <router-view />
</template>

<style scoped></style>