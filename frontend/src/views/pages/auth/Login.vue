<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../../stores/auth';
import { useToast } from 'primevue/usetoast';
import FloatingConfigurator from '../../../components/FloatingConfigurator.vue';
import Divider from 'primevue/divider';

// Services and stores
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// Form state
const loginForm = reactive({
  email: '',
  password: ''
});

// UI state
const isSubmitting = ref(false);
const formSubmitted = ref(false);
const rememberMe = ref(false);

/**
 * Handle login form submission
 */
const handleLogin = async () => {
  formSubmitted.value = true;
  
  // Form validation check
  if (!loginForm.email || !loginForm.password) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Please fill in all required fields', life: 3000 });
    return;
  }
  
  isSubmitting.value = true;
  
  try {
    await authStore.login({
      email: loginForm.email,
      password: loginForm.password
    });
    
    // Success message
    toast.add({ severity: 'success', summary: 'Success', detail: 'Login successful', life: 3000 });
    
    // Redirect to dashboard
    router.push('/');
  } catch (error: any) {
    // Show error message
    toast.add({ 
      severity: 'error', 
      summary: 'Login Failed', 
      detail: error.response?.data?.message || 'Invalid credentials. Please try again.', 
      life: 5000 
    });
  } finally {
    isSubmitting.value = false;
  }
};

/**
 * Handle Google login
 * This is a placeholder function. You will need to implement OAuth flow with Google
 */
const handleGoogleLogin = () => {
  toast.add({ 
    severity: 'info', 
    summary: 'Google Login', 
    detail: 'Google login functionality will be implemented in the next phase', 
    life: 3000 
  });
  
  // TODO: Implement Google OAuth flow
  // This would typically redirect to Google's OAuth endpoint
  // On successful authentication, Google will redirect back to your app
  // with an authorization code that you can exchange for an access token
};
</script>

<template>
  <div class="flex justify-center items-center min-h-screen p-4">
    <div class="w-full max-w-md">
      <div class="card">
        <div class="card-header mb-4">
          <h2 class="text-xl font-semibold text-center mb-4">Welcome Back</h2>
          <p class="text-center text-surface-500">Sign in to your account</p>
        </div>
        
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="field">
            <label for="email" class="block font-medium mb-2">Email</label>
            <InputText 
              id="email" 
              v-model="loginForm.email" 
              type="email" 
              class="w-full" 
              :class="{ 'p-invalid': formSubmitted && !loginForm.email }" 
              placeholder="Enter your email"
              aria-describedby="email-error"
            />
            <small id="email-error" class="p-error" v-if="formSubmitted && !loginForm.email">
              Email is required
            </small>
          </div>
          
          <div class="field">
            <label for="password" class="block font-medium mb-2">Password</label>
            <Password 
              id="password" 
              v-model="loginForm.password" 
              toggleMask
              class="w-full" 
              inputClass="w-full"
              :class="{ 'p-invalid': formSubmitted && !loginForm.password }" 
              :feedback="false"
              placeholder="Enter your password"
              aria-describedby="password-error"
              :pt="{ input: { root: { autocomplete: 'current-password' } } }"
            />
            <small id="password-error" class="p-error" v-if="formSubmitted && !loginForm.password">
              Password is required
            </small>
          </div>
          
          <div class="flex justify-between items-center">
            <div class="field-checkbox">
              <Checkbox id="rememberMe" v-model="rememberMe" :binary="true" />
              <label for="rememberMe" class="ml-2 cursor-pointer">Remember me</label>
            </div>
            
            <router-link to="/auth/forgot-password" class="text-primary hover:underline">
              Forgot password?
            </router-link>
          </div>
          
          <Button 
            type="submit" 
            label="Login" 
            class="w-full" 
            :loading="isSubmitting"
          />
          
          <div class="py-4">
            <Divider align="center" type="solid" borderType="dashed">
              <span class="text-xs uppercase text-surface-500 dark:text-surface-400">or continue with</span>
            </Divider>
          </div>
          
          <Button 
            type="button" 
            class="w-full p-button-outlined" 
            @click="handleGoogleLogin"
          >
            <span class="flex items-center justify-center gap-2">
              <i class="pi pi-google text-lg" style="color: #4285F4;"></i>
              <span>Login with Google</span>
            </span>
          </Button>
          
          <div class="text-center mt-4">
            <span>Don't have an account? </span>
            <router-link to="/auth/register" class="text-primary font-medium hover:underline">
              Register
            </router-link>
          </div>
        </form>
      </div>
    </div>
    <FloatingConfigurator />
  </div>
</template>

<style scoped>
.card {
  background-color: var(--surface-0);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

:global(.app-dark) .card {
  background-color: var(--surface-900);
}

/* Fix for Password component width */
:deep(.p-password) {
  width: 100%;
}

:deep(.p-password-input) {
  width: 100%;
}

/* Fix for Divider content background color */
:deep(.p-divider-content) {
  background-color: var(--surface-0);
}

:global(.app-dark) :deep(.p-divider-content) {
  background-color: var(--surface-900);
}
</style>
