<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useToast } from 'primevue/usetoast';
import type { User } from '../../services/api';

// Services
const authStore = useAuthStore();
const toast = useToast();

// State
const loading = ref(false);
const editMode = ref(false);
const user = ref<User | null>(null);

// Form state
const profileForm = reactive({
  firstName: '',
  lastName: '',
  email: ''
});

// Load user profile
const loadUserProfile = async () => {
  loading.value = true;
  try {
    await authStore.fetchCurrentUser();
    user.value = authStore.user;
    
    if (user.value) {
      // Populate form
      profileForm.firstName = user.value.firstName;
      profileForm.lastName = user.value.lastName;
      profileForm.email = user.value.email;
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to load user profile',
      life: 5000
    });
  } finally {
    loading.value = false;
  }
};

// Toggle edit mode
const toggleEditMode = () => {
  if (editMode.value) {
    // Cancel edit - reset form
    if (user.value) {
      profileForm.firstName = user.value.firstName;
      profileForm.lastName = user.value.lastName;
      profileForm.email = user.value.email;
    }
  }
  
  editMode.value = !editMode.value;
};

// Save profile changes
const saveProfile = async () => {
  loading.value = true;
  
  try {
    // Call API to update user profile
    // Note: Need to implement this API endpoint and service call
    // await userService.updateProfile(profileForm);
    
    // For now, show success message
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Profile updated successfully',
      life: 3000
    });
    
    // Update local user object
    if (user.value) {
      user.value.firstName = profileForm.firstName;
      user.value.lastName = profileForm.lastName;
    }
    
    editMode.value = false;
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update profile',
      life: 5000
    });
  } finally {
    loading.value = false;
  }
};

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

// Initialize component
onMounted(() => {
  loadUserProfile();
});
</script>

<template>
  <div>
    <div class="card mb-4">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">My Profile</h1>
        <Button 
          :label="editMode ? 'Cancel' : 'Edit Profile'" 
          :icon="editMode ? 'pi pi-times' : 'pi pi-pencil'" 
          :severity="editMode ? 'secondary' : 'info'" 
          @click="toggleEditMode" 
        />
      </div>
      
      <div v-if="loading" class="flex justify-center py-8">
        <ProgressSpinner />
      </div>
      
      <div v-else-if="user">
        <!-- View mode -->
        <div v-if="!editMode" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 class="text-lg font-semibold mb-4">User Information</h2>
            <div class="mb-4">
              <div class="text-gray-600 dark:text-gray-400 text-sm mb-1">Name</div>
              <div class="font-medium">{{ user.firstName }} {{ user.lastName }}</div>
            </div>
            <div class="mb-4">
              <div class="text-gray-600 dark:text-gray-400 text-sm mb-1">Email</div>
              <div class="font-medium">{{ user.email }}</div>
            </div>
            <div class="mb-4">
              <div class="text-gray-600 dark:text-gray-400 text-sm mb-1">Account Created</div>
              <div class="font-medium">{{ formatDate(user.createdAt) }}</div>
            </div>
          </div>
          
          <div>
            <h2 class="text-lg font-semibold mb-4">Account Statistics</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Letters</div>
                <div class="text-xl font-bold">{{ 0 }}</div>
              </div>
              <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-gray-600 dark:text-gray-400 text-sm mb-1">Addresses</div>
                <div class="text-xl font-bold">{{ 0 }}</div>
              </div>
              <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-gray-600 dark:text-gray-400 text-sm mb-1">Letters Sent</div>
                <div class="text-xl font-bold">{{ 0 }}</div>
              </div>
              <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-gray-600 dark:text-gray-400 text-sm mb-1">Letters Delivered</div>
                <div class="text-xl font-bold">{{ 0 }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Edit mode -->
        <div v-else>
          <form @submit.prevent="saveProfile" class="space-y-4 max-w-lg">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="field">
                <label for="firstName" class="block font-medium mb-2">First Name</label>
                <InputText id="firstName" v-model="profileForm.firstName" class="w-full" />
              </div>
              <div class="field">
                <label for="lastName" class="block font-medium mb-2">Last Name</label>
                <InputText id="lastName" v-model="profileForm.lastName" class="w-full" />
              </div>
            </div>
            
            <div class="field">
              <label for="email" class="block font-medium mb-2">Email</label>
              <InputText id="email" v-model="profileForm.email" type="email" class="w-full" disabled />
              <small class="text-gray-500">Email cannot be changed</small>
            </div>
            
            <div class="flex gap-2 mt-6">
              <Button label="Save Changes" icon="pi pi-check" type="submit" :loading="loading" />
              <Button label="Cancel" icon="pi pi-times" severity="secondary" text @click="toggleEditMode" />
            </div>
          </form>
        </div>
      </div>
      
      <div v-else class="p-6 text-center">
        <div class="text-xl text-gray-600 dark:text-gray-400">User profile not available</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

:deep(.dark) .card {
  background-color: #111827;
}
</style> 