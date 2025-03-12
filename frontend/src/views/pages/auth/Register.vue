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
const registerForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: ''
});

// UI state
const isSubmitting = ref(false);
const formSubmitted = ref(false);
const agreeTerms = ref(false);

// Form validation
const passwordMatch = () => {
  return registerForm.password === registerForm.confirmPassword;
};

const validateForm = () => {
  if (!registerForm.firstName || 
      !registerForm.lastName || 
      !registerForm.email || 
      !registerForm.password || 
      !registerForm.confirmPassword) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Please fill in all required fields', life: 3000 });
    return false;
  }
  
  if (!passwordMatch()) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Passwords do not match', life: 3000 });
    return false;
  }
  
  if (!agreeTerms.value) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'You must agree to the terms and conditions', life: 3000 });
    return false;
  }
  
  return true;
};

/**
 * Handle registration form submission
 */
const handleRegister = async () => {
  formSubmitted.value = true;
  
  if (!validateForm()) {
    return;
  }
  
  isSubmitting.value = true;
  
  try {
    await authStore.register({
      firstName: registerForm.firstName,
      lastName: registerForm.lastName,
      email: registerForm.email,
      password: registerForm.password
    });
    
    // Success message
    toast.add({ severity: 'success', summary: 'Success', detail: 'Registration successful', life: 3000 });
    
    // Redirect to dashboard
    router.push('/');
  } catch (error: any) {
    // Show error message
    toast.add({ 
      severity: 'error', 
      summary: 'Registration Failed', 
      detail: error.response?.data?.message || 'Registration failed. Please try again.', 
      life: 5000 
    });
  } finally {
    isSubmitting.value = false;
  }
};

/**
 * Handle Google registration
 * This is a placeholder function. You will need to implement OAuth flow with Google
 */
const handleGoogleRegister = () => {
  toast.add({ 
    severity: 'info', 
    summary: 'Google Registration', 
    detail: 'Google registration functionality will be implemented in the next phase', 
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
    <div class="w-full max-w-lg">
      <div class="card">
        <div class="card-header mb-6">
          <h2 class="text-xl font-semibold text-center mb-2">Create an Account</h2>
          <p class="text-center text-surface-500">Join BriefButler to manage your mail</p>
        </div>
        
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="field">
              <label for="firstName" class="block font-medium mb-2">First Name</label>
              <InputText 
                id="firstName" 
                v-model="registerForm.firstName" 
                class="w-full" 
                :class="{ 'p-invalid': formSubmitted && !registerForm.firstName }" 
                placeholder="Enter your first name"
                aria-describedby="firstName-error"
              />
              <small id="firstName-error" class="p-error" v-if="formSubmitted && !registerForm.firstName">
                First name is required
              </small>
            </div>
            
            <div class="field">
              <label for="lastName" class="block font-medium mb-2">Last Name</label>
              <InputText 
                id="lastName" 
                v-model="registerForm.lastName" 
                class="w-full" 
                :class="{ 'p-invalid': formSubmitted && !registerForm.lastName }" 
                placeholder="Enter your last name"
                aria-describedby="lastName-error"
              />
              <small id="lastName-error" class="p-error" v-if="formSubmitted && !registerForm.lastName">
                Last name is required
              </small>
            </div>
          </div>
          
          <div class="field">
            <label for="email" class="block font-medium mb-2">Email</label>
            <InputText 
              id="email" 
              v-model="registerForm.email" 
              type="email" 
              class="w-full" 
              :class="{ 'p-invalid': formSubmitted && !registerForm.email }" 
              placeholder="Enter your email"
              aria-describedby="email-error"
            />
            <small id="email-error" class="p-error" v-if="formSubmitted && !registerForm.email">
              Email is required
            </small>
          </div>
          
          <div class="field">
            <label for="password" class="block font-medium mb-2">Password</label>
            <Password 
              id="password" 
              v-model="registerForm.password" 
              class="w-full" 
              inputClass="w-full"
              :class="{ 'p-invalid': formSubmitted && !registerForm.password }" 
              toggleMask
              placeholder="Create a password"
              aria-describedby="password-error"
              :pt="{ input: { root: { autocomplete: 'new-password' } } }"
            />
            <small id="password-error" class="p-error" v-if="formSubmitted && !registerForm.password">
              Password is required
            </small>
          </div>
          
          <div class="field">
            <label for="confirmPassword" class="block font-medium mb-2">Confirm Password</label>
            <Password 
              id="confirmPassword" 
              v-model="registerForm.confirmPassword" 
              class="w-full" 
              inputClass="w-full"
              :class="{ 'p-invalid': formSubmitted && (!registerForm.confirmPassword || !passwordMatch()) }" 
              :feedback="false"
              toggleMask
              placeholder="Confirm your password"
              aria-describedby="confirmPassword-error"
              :pt="{ input: { root: { autocomplete: 'new-password' } } }"
            />
            <small id="confirmPassword-error" class="p-error" 
              v-if="formSubmitted && !registerForm.confirmPassword">
              Please confirm your password
            </small>
            <small id="passwords-match-error" class="p-error" 
              v-if="formSubmitted && registerForm.confirmPassword && !passwordMatch()">
              Passwords do not match
            </small>
          </div>
          
          <div class="field-checkbox">
            <Checkbox id="agreeTerms" v-model="agreeTerms" :binary="true" 
              :class="{ 'p-invalid': formSubmitted && !agreeTerms }" />
            <label for="agreeTerms" class="ml-2 cursor-pointer">
              I agree to the <a href="#" class="text-primary hover:underline">Terms and Conditions</a>
            </label>
          </div>
          <small class="p-error" v-if="formSubmitted && !agreeTerms">
            You must agree to the terms and conditions
          </small>
          
          <Button 
            type="submit" 
            label="Register" 
            class="w-full mt-4" 
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
            @click="handleGoogleRegister"
          >
            <span class="flex items-center justify-center gap-2">
              <i class="pi pi-google text-lg" style="color: #4285F4;"></i>
              <span>Register with Google</span>
            </span>
          </Button>
          
          <div class="text-center mt-4">
            <span>Already have an account? </span>
            <router-link to="/auth/login" class="text-primary font-medium hover:underline">
              Sign in
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