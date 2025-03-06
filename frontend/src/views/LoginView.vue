<script setup lang="ts">
console.log('LoginView component is loading!');
// Import Aura theme directly in this component for testing
import Aura from '@primeuix/themes/aura';
console.log('Aura theme imported:', Aura ? 'Yes' : 'No');

import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import IconField from 'primevue/iconfield';
import type { LoginCredentials } from '../types/auth.types';

// Services and utilities
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

// Form state
const email = ref('');
const password = ref('');
const errorMessage = ref('');

// Computed properties
const isLoading = ref(false);
const redirectPath = ref(route.query.redirect?.toString() || '/');

// Handle login with email and password
async function handleLogin() {
  console.log('Login attempt with:', email.value, password.value);
  // Reset error
  errorMessage.value = '';
  isLoading.value = true;

  try {
    // Simple validation
    if (!email.value) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Email is required', life: 3000 });
      return;
    }

    if (!password.value) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Password is required', life: 3000 });
      return;
    }

    const credentials: LoginCredentials = {
      email: email.value,
      password: password.value
    };
    
    await authStore.login(credentials);
    toast.add({ severity: 'success', summary: 'Login successful', detail: 'Welcome back!', life: 3000 });
    router.push(redirectPath.value);
  } catch (error: any) {
    errorMessage.value = authStore.errorMessage || 'Login failed. Please check your credentials.';
  } finally {
    isLoading.value = false;
  }
}

// Handle Google login
function handleGoogleLogin() {
  try {
    authStore.loginWithGoogle();
    // Note: This will redirect to Google's OAuth page, no need to handle navigation here
  } catch (error: any) {
    errorMessage.value = authStore.errorMessage || 'Google login failed. Please try again.';
  }
}
</script>

<template>
  <div class="flex align-items-center justify-content-center" style="min-height: 100vh;">
    <Card class="shadow-2" style="width: 450px">
      <template #header>
        <div class="flex justify-content-center py-3">
          <h2 class="text-3xl font-medium text-900 m-0">BriefButler Login</h2>
        </div>
      </template>
      
      <template #content>
        <form @submit.prevent="handleLogin" novalidate>
          <div class="flex flex-column gap-3">
            <div class="field">
              <label for="email" class="block text-900 font-medium mb-2">Email</label>
              <span class="p-input-icon-right w-full">
                <i class="pi pi-envelope" />
                <InputText 
                  id="email" 
                  v-model="email" 
                  type="email" 
                  class="w-full" 
                  placeholder="Email address"
                  :class="{'p-invalid': errorMessage && !email}"
                />
              </span>
              <small class="text-red-500" v-if="errorMessage && !email">Email is required</small>
            </div>
            
            <div class="field">
              <label for="password" class="block text-900 font-medium mb-2">Password</label>
              <Password 
                id="password" 
                v-model="password" 
                :feedback="false" 
                toggleMask 
                placeholder="Password"
                :class="{'p-invalid': errorMessage && !password}"
                class="w-full"
              />
              <small class="text-red-500" v-if="errorMessage && !password">Password is required</small>
            </div>
            
            <div v-if="errorMessage" class="mb-3">
              <Message severity="error" :closable="false">{{ errorMessage }}</Message>
            </div>
            
            <div class="flex justify-content-center">
              <Button 
                type="submit" 
                label="Login" 
                icon="pi pi-sign-in"
                :loading="isLoading"
              />
            </div>
            
            <Divider align="center">
              <span class="text-600">OR</span>
            </Divider>
            
            <div class="flex justify-content-center">
              <Button 
                type="button"
                label="Sign in with Google" 
                icon="pi pi-google"
                outlined
                @click="handleGoogleLogin"
                style="min-width: 10rem;"
              />
            </div>
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.field {
  margin-bottom: 1.5rem;
}

/* Fix for Password component width */
:deep(.p-password) {
  width: 100%;
}

:deep(.p-password-input) {
  width: 100%;
}
</style> 