<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../../stores/auth';
import { useToast } from 'primevue/usetoast';
import ProgressSpinner from 'primevue/progressspinner';
import Button from 'primevue/button';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();
const loading = ref(true);
const error = ref<string | null>(null);
const statusMessage = ref('Verifying authentication...');

// For debugging
const debugInfo = ref<Record<string, any> | null>(null);
const showDebug = ref(false);

onMounted(async () => {
  try {
    console.log("Auth callback mounted, route query:", route.query);
    
    // Track processing for debug purposes
    debugInfo.value = {
      queryParams: { ...route.query },
      timestamp: new Date().toISOString(),
      steps: []
    };

    // Check if there's an error parameter from the redirect
    if (route.query.error) {
      error.value = route.query.error as string;
      debugInfo.value.steps.push({ 
        step: 'check_error_param', 
        status: 'error', 
        error: error.value 
      });
      loading.value = false;
      return;
    }

    // Get token from URL query parameter
    const token = route.query.token as string;
    const refreshToken = route.query.refreshToken as string;
    
    if (!token) {
      error.value = 'No authentication token provided';
      debugInfo.value.steps.push({ step: 'check_token', status: 'error', error: 'No token provided' });
      loading.value = false;
      return;
    }

    debugInfo.value.steps.push({ step: 'received_token', status: 'success' });
    console.log('Processing OAuth callback with token');
    statusMessage.value = 'Authentication confirmed, loading your profile...';
    
    // Store the tokens
    localStorage.setItem('accessToken', token);
    
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
      debugInfo.value.steps.push({ step: 'stored_refresh_token', status: 'success' });
    }
    
    debugInfo.value.steps.push({ step: 'stored_access_token', status: 'success' });
    
    // Fetch user information
    try {
      await authStore.fetchCurrentUser();
      debugInfo.value.steps.push({ 
        step: 'fetch_user', 
        status: 'success',
        user: authStore.user ? {
          id: authStore.user.id,
          email: authStore.user.email
        } : null
      });
    } catch (fetchError: any) {
      console.error('Error fetching user:', fetchError);
      debugInfo.value.steps.push({ 
        step: 'fetch_user', 
        status: 'error',
        error: fetchError.message || 'Failed to fetch user'
      });
      throw fetchError;
    }
    
    // Show success toast
    toast.add({
      severity: 'success',
      summary: 'Login Successful',
      detail: 'You have been logged in successfully with Google',
      life: 3000
    });
    
    // Redirect to dashboard or intended destination
    const redirectPath = route.query.redirect as string || '/';
    debugInfo.value.steps.push({ step: 'redirect', path: redirectPath });
    router.push(redirectPath);
  } catch (err: any) {
    console.error('Authentication callback error:', err);
    error.value = err.message || 'Authentication failed';
    
    if (debugInfo.value) {
      debugInfo.value.steps.push({ 
        step: 'error', 
        error: err.message || 'Unknown error',
        stack: err.stack
      });
    }
    
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

function toggleDebug() {
  showDebug.value = !showDebug.value;
}
</script>

<template>
  <div class="flex flex-column align-items-center justify-content-center min-h-screen p-4">
    <div class="card w-full max-w-md text-center p-5">
      <div v-if="loading">
        <ProgressSpinner style="width:50px;height:50px" />
        <h2 class="mt-3 mb-2">Processing Authentication</h2>
        <p class="text-surface-500">{{ statusMessage }}</p>
      </div>
      
      <div v-else-if="error">
        <i class="pi pi-exclamation-circle text-5xl text-red-500 mb-3"></i>
        <h2 class="mt-3 mb-2">Authentication Failed</h2>
        <p class="text-surface-500">{{ error }}</p>
        <p class="mt-3">Redirecting to login page...</p>
        
        <div class="mt-4">
          <Button 
            label="Show Debug Info" 
            class="p-button-sm p-button-text" 
            @click="toggleDebug" 
            v-if="debugInfo"
          />
          
          <div v-if="showDebug && debugInfo" class="debug-info mt-3 text-left">
            <pre class="text-xs overflow-auto bg-surface-100 p-3 rounded">{{ JSON.stringify(debugInfo, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background-color: var(--surface-0);
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

:global(.app-dark) .card {
  background-color: var(--surface-900);
}

.debug-info {
  max-height: 300px;
  overflow-y: auto;
}
</style> 