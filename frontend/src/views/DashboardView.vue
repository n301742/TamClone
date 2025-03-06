<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import Card from 'primevue/card';

const authStore = useAuthStore();
const user = ref(authStore.user);
</script>

<template>
  <div class="p-4">
    <Card class="mb-4">
      <template #title>Dashboard</template>
      <template #content>
        <p>Welcome to your BriefButler dashboard.</p>
        <p v-if="user">Hello, {{ user.firstName }} {{ user.lastName }}!</p>
        <p>This is a placeholder for the dashboard view.</p>
      </template>
    </Card>
  </div>
</template>

<style scoped>
/* All styling now uses PrimeVue utility classes */
</style> 