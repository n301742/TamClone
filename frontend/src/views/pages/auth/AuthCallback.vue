<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../../stores/auth';
import { useToast } from 'primevue/usetoast';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    // Get token from URL query parameter
    const token = route.query.token as string;
    
    if (!token) {
      error.value = 'No authentication token provided';
      loading.value = false;
      return;
    }
    
    console.log('Processing OAuth callback with token');
    
    // Store the token
    localStorage.setItem('accessToken', token);
    
    // Fetch user information
    await authStore.fetchCurrentUser();
    
    // Show success toast
    toast.add({
      severity: 'success',
      summary: 'Login Successful',
      detail: 'You have been logged in successfully with Google',
      life: 3000
    });
    
    // Redirect to dashboard or intended destination
    const redirectPath = route.query.redirect as string || '/';
    router.push(redirectPath);
  } catch (err: any) {
    console.error('Authentication callback error:', err);
    error.value = err.message || 'Authentication failed';
    
    // Show error toast
    toast.add({
      severity: 'error',
      summary: 'Authentication Failed',
      detail: error.value,
      life: 5000
    });
    
    // Redirect to login after a short delay
    setTimeout(() => {
      router.push('/auth/login');
    }, 3000);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex flex-column align-items-center justify-content-center min-h-screen p-4">
    <div class="card w-full max-w-md text-center">
      <div v-if="loading" class="p-5">
        <ProgressSpinner style="width:50px;height:50px" />
        <h2 class="mt-3 mb-2">Processing Authentication</h2>
        <p class="text-surface-500">Please wait while we authenticate your account...</p>
      </div>
      
      <div v-else-if="error" class="p-5">
        <i class="pi pi-exclamation-circle text-5xl text-red-500 mb-3"></i>
        <h2 class="mt-3 mb-2">Authentication Failed</h2>
        <p class="text-surface-500">{{ error }}</p>
        <p class="mt-3">Redirecting to login page...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles here */
</style> 