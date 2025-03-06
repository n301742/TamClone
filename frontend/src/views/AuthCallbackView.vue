<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
  try {
    // Get token from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      throw new Error('No authentication token received');
    }
    
    // Store the token and fetch user profile
    localStorage.setItem('access_token', token);
    await authStore.fetchCurrentUser();
    
    // Redirect to dashboard
    router.push('/');
  } catch (error) {
    console.error('Authentication callback error:', error);
    router.push('/login');
  }
});
</script>

<template>
  <div class="flex justify-content-center align-items-center min-h-screen">
    <Card>
      <template #title>
        Authenticating...
      </template>
      <template #content>
        <p>Please wait while we complete your authentication...</p>
        <div class="flex justify-content-center mt-5">
          <ProgressSpinner />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
/* All styling now uses PrimeVue utility classes */
</style> 