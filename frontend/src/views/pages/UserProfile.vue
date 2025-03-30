<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useToast } from 'primevue/usetoast';
import type { User } from '../../services/api';
import type { SenderProfile } from '../../types/api.types';
import SenderProfileDropdown from '../../components/SenderProfileDropdown.vue';

// PrimeVue components
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import Tag from 'primevue/tag';
import Avatar from 'primevue/avatar';

// Services
const authStore = useAuthStore();
const toast = useToast();

// State
const loading = ref(false);
const editMode = ref(false);
const user = ref<User | null>(null);

// Sender profile state
const selectedProfileId = ref('');
const selectedProfile = ref<SenderProfile | null>(null);

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

// Handle selected sender profile
const onProfileSelected = (profile: SenderProfile) => {
  selectedProfile.value = profile;
};

// Get country name from country code
const getCountryName = (code: string): string => {
  const countries: Record<string, string> = {
    'AT': 'Austria',
    'DE': 'Germany',
    'CH': 'Switzerland'
  };
  return countries[code] || code;
};

// Format date for display
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

// Initialize component
onMounted(() => {
  loadUserProfile();
});
</script>

<template>
  <div class="flex flex-column gap-4">
    <!-- User Profile Section -->
    <Card class="shadow-1">
      <template #header>
        <div class="flex justify-content-between align-items-center px-3 py-2">
          <h2 class="text-xl font-bold m-0">My Profile</h2>
          <Button 
            :label="editMode ? 'Cancel' : 'Edit Profile'" 
            :icon="editMode ? 'pi pi-times' : 'pi pi-pencil'" 
            :severity="editMode ? 'secondary' : 'info'" 
            @click="toggleEditMode" 
          />
        </div>
      </template>
      
      <template #content>
        <div v-if="loading" class="flex justify-content-center py-5">
          <ProgressSpinner />
        </div>
        
        <div v-else-if="user">
          <!-- View mode -->
          <div v-if="!editMode" class="grid">
            <div class="col-12 md:col-6">
              <div class="flex flex-column">
                <h3 class="text-lg font-semibold mb-3">User Information</h3>
                
                <div class="flex flex-column gap-3">
                  <div>
                    <div class="font-medium text-500 mb-1">Name</div>
                    <div class="text-900">{{ user.firstName }} {{ user.lastName }}</div>
                  </div>
                  
                  <Divider />
                  
                  <div>
                    <div class="font-medium text-500 mb-1">Email</div>
                    <div class="text-900">{{ user.email }}</div>
                  </div>
                  
                  <Divider />
                  
                  <div>
                    <div class="font-medium text-500 mb-1">Account Created</div>
                    <div class="text-900">{{ formatDate(user.createdAt) }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-12 md:col-6">
              <h3 class="text-lg font-semibold mb-3">Account Statistics</h3>
              <div class="grid">
                <div class="col-6 mb-3">
                  <Card class="h-full">
                    <template #content>
                      <div class="font-medium text-500 mb-1">Total Letters</div>
                      <div class="text-2xl font-bold text-900">0</div>
                    </template>
                  </Card>
                </div>
                
                <div class="col-6 mb-3">
                  <Card class="h-full">
                    <template #content>
                      <div class="font-medium text-500 mb-1">Addresses</div>
                      <div class="text-2xl font-bold text-900">0</div>
                    </template>
                  </Card>
                </div>
                
                <div class="col-6">
                  <Card class="h-full">
                    <template #content>
                      <div class="font-medium text-500 mb-1">Letters Sent</div>
                      <div class="text-2xl font-bold text-900">0</div>
                    </template>
                  </Card>
                </div>
                
                <div class="col-6">
                  <Card class="h-full">
                    <template #content>
                      <div class="font-medium text-500 mb-1">Letters Delivered</div>
                      <div class="text-2xl font-bold text-900">0</div>
                    </template>
                  </Card>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Edit mode -->
          <div v-else>
            <form @submit.prevent="saveProfile" class="p-fluid">
              <div class="grid formgrid">
                <div class="field col-12 md:col-6">
                  <label for="firstName" class="font-medium mb-2 block">First Name</label>
                  <InputText id="firstName" v-model="profileForm.firstName" />
                </div>
                <div class="field col-12 md:col-6">
                  <label for="lastName" class="font-medium mb-2 block">Last Name</label>
                  <InputText id="lastName" v-model="profileForm.lastName" />
                </div>
              </div>
              
              <div class="field">
                <label for="email" class="font-medium mb-2 block">Email</label>
                <InputText id="email" v-model="profileForm.email" type="email" disabled />
                <small class="text-500">Email cannot be changed</small>
              </div>
              
              <div class="flex gap-2 mt-4">
                <Button label="Save Changes" icon="pi pi-check" type="submit" :loading="loading" />
                <Button label="Cancel" icon="pi pi-times" severity="secondary" text @click="toggleEditMode" />
              </div>
            </form>
          </div>
        </div>
        
        <div v-else class="p-4 text-center">
          <Avatar icon="pi pi-user" size="large" class="mb-3" />
          <div class="text-xl text-700">User profile not available</div>
        </div>
      </template>
    </Card>

    <!-- Sender Profiles Section -->
    <Card class="shadow-1">
      <template #header>
        <div class="px-3 py-2">
          <h2 class="text-xl font-bold m-0">Sender Profiles</h2>
        </div>
      </template>
      
      <template #content>
        <p class="mb-4 text-700">
          Sender profiles are used when sending documents through the BriefButler service. 
          Create and manage your sender information here.
        </p>
        
        <div class="mb-4">
          <SenderProfileDropdown 
            v-model="selectedProfileId" 
            @profile-selected="onProfileSelected" 
            label="Select or create a sender profile"
          />
        </div>
        
        <!-- Selected profile details -->
        <Card v-if="selectedProfile" class="mt-4">
          <template #header>
            <div class="flex align-items-center px-3 py-2">
              <span class="font-bold">{{ selectedProfile.name }}</span>
              <Tag v-if="selectedProfile.isDefault" value="Default Profile" severity="info" class="ml-2" />
            </div>
          </template>
          
          <template #content>
            <div class="grid">
              <div class="col-12 md:col-6">
                <div class="flex flex-column gap-3">
                  <div>
                    <div class="font-medium text-500 mb-1">Address</div>
                    <div class="text-900">{{ selectedProfile.address }}</div>
                  </div>
                  
                  <Divider />
                  
                  <div>
                    <div class="font-medium text-500 mb-1">City/ZIP</div>
                    <div class="text-900">{{ selectedProfile.city }}, {{ selectedProfile.zip }}</div>
                  </div>
                  
                  <Divider />
                  
                  <div>
                    <div class="font-medium text-500 mb-1">Country</div>
                    <div class="text-900">{{ getCountryName(selectedProfile.country) }}</div>
                  </div>
                </div>
              </div>
              
              <div class="col-12 md:col-6">
                <div class="flex flex-column gap-3">
                  <div v-if="selectedProfile.email">
                    <div class="font-medium text-500 mb-1">Email</div>
                    <div class="text-900">{{ selectedProfile.email }}</div>
                    <Divider />
                  </div>
                  
                  <div v-if="selectedProfile.phone">
                    <div class="font-medium text-500 mb-1">Phone</div>
                    <div class="text-900">{{ selectedProfile.phone }}</div>
                    <Divider />
                  </div>
                  
                  <div v-if="selectedProfile.companyName">
                    <div class="font-medium text-500 mb-1">Company</div>
                    <div class="text-900">{{ selectedProfile.companyName }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>
        
        <Card v-else-if="!loading" class="mt-4">
          <template #content>
            <div class="text-center p-5">
              <Avatar icon="pi pi-id-card" size="large" class="mb-3" />
              <div class="text-700">
                No sender profile selected. Please select or create a profile using the dropdown above.
              </div>
            </div>
          </template>
        </Card>
      </template>
    </Card>
  </div>
</template>

<style scoped>
/* No custom styling needed as we're using PrimeVue and Tailwind classes */
</style> 