<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';
import FloatLabel from 'primevue/floatlabel';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';

import type { SenderProfile } from '../types/api.types';
import { getAllSenderProfiles, createSenderProfile } from '../api/senderProfile';

interface Props {
  modelValue?: string;
  label?: string;
  required?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: 'Sender Profile',
  required: false,
});

const emit = defineEmits(['update:modelValue', 'profile-selected']);

const toast = useToast();
const profiles = ref<SenderProfile[]>([]);
const selectedProfileId = ref<string>(props.modelValue);
const loading = ref<boolean>(true);
const showCreateDialog = ref<boolean>(false);

// Form for creating a new sender profile
const newProfile = ref({
  name: '',
  companyName: '',
  isCompany: false,
  address: '',
  city: '',
  state: '',
  zip: '',
  country: 'AT',
  email: '',
  phone: '',
  isDefault: false,
});

// Country options
const countries = [
  { name: 'Austria', code: 'AT' },
  { name: 'Germany', code: 'DE' },
  { name: 'Switzerland', code: 'CH' },
];

// Load sender profiles on component mount
onMounted(async () => {
  await loadProfiles();
});

// Watch for changes in the modelValue prop
watch(() => props.modelValue, (newValue) => {
  selectedProfileId.value = newValue;
});

// Watch for changes in the selected profile
watch(selectedProfileId, (newValue) => {
  emit('update:modelValue', newValue);
  
  // Find the selected profile to emit
  const selectedProfile = profiles.value.find(p => p.id === newValue);
  if (selectedProfile) {
    emit('profile-selected', selectedProfile);
  }
});

// Load all sender profiles for the current user
async function loadProfiles() {
  loading.value = true;
  try {
    const response = await getAllSenderProfiles();
    profiles.value = response || [];
    
    // If we have profiles but no selection, select the default one
    if (profiles.value.length > 0 && !selectedProfileId.value) {
      const defaultProfile = profiles.value.find(p => p.isDefault);
      if (defaultProfile) {
        selectedProfileId.value = defaultProfile.id;
      } else {
        selectedProfileId.value = profiles.value[0].id;
      }
    }
  } catch (error) {
    console.error('Error loading sender profiles:', error);
    profiles.value = []; // Ensure profiles is at least an empty array
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load sender profiles',
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

// Create a new sender profile
async function submitNewProfile() {
  try {
    const response = await createSenderProfile(newProfile.value);
    
    // Initialize profiles array if it doesn't exist
    if (!profiles.value) profiles.value = [];
    
    // Only add the profile to the list if we got a valid response
    if (response) {
      // Add to profiles array and select it
      profiles.value = [...profiles.value, response];
      selectedProfileId.value = response.id;
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Sender profile created successfully',
        life: 3000,
      });
      
      // Reset the form and close the dialog
      resetNewProfileForm();
      showCreateDialog.value = false;
      
      // Refresh profiles from server to ensure we have the latest data
      await loadProfiles();
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create sender profile. Please try again.',
        life: 3000,
      });
    }
  } catch (error) {
    console.error('Error creating sender profile:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create sender profile',
      life: 3000,
    });
  }
}

// Reset the new profile form
function resetNewProfileForm() {
  newProfile.value = {
    name: '',
    companyName: '',
    isCompany: false,
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'AT',
    email: '',
    phone: '',
    isDefault: false,
  };
}

// Format the profile for display in the dropdown
function formatProfile(profile: SenderProfile | undefined) {
  if (!profile) return 'Unknown profile';
  
  if (profile.isCompany) {
    return `${profile.name} (Company)`;
  }
  return profile.name;
}
</script>

<template>
  <div class="sender-profile-dropdown">
    <InputGroup>
      <FloatLabel class="w-full">
        <Select
          v-model="selectedProfileId"
          :options="profiles"
          optionLabel="name"
          optionValue="id"
          placeholder="Select a sender profile"
          class="w-full"
          :loading="loading"
          :disabled="loading"
          :required="props.required"
        >
          <template #value="slotProps">
            <div v-if="slotProps.value" class="flex align-items-center">
              <div>{{ formatProfile(profiles.find(p => p.id === slotProps.value)) }}</div>
              <div v-if="profiles.find(p => p.id === slotProps.value)?.isDefault" 
                class="ml-2 text-xs bg-primary text-white px-2 py-1 rounded-sm">
                Default
              </div>
            </div>
            <span v-else>
              {{ loading ? 'Loading...' : 'Select a sender profile' }}
            </span>
          </template>
          <template #option="slotProps">
            <div class="flex align-items-center justify-content-between w-full">
              <div>{{ formatProfile(slotProps.option) }}</div>
              <div v-if="slotProps.option.isDefault" 
                class="text-xs bg-primary text-white px-2 py-1 rounded-sm">
                Default
              </div>
            </div>
          </template>
        </Select>
        <label>{{ props.label }}</label>
      </FloatLabel>
      <Button 
        icon="pi pi-plus" 
        @click="showCreateDialog = true" 
        :disabled="loading"
        aria-label="Create new sender profile"
      />
    </InputGroup>
    
    <!-- Dialog for creating a new sender profile -->
    <Dialog
      v-model:visible="showCreateDialog"
      modal
      closable
      closeOnEscape
      header="Create New Sender Profile"
      :style="{ width: '500px' }"
    >
      <div class="grid">
        <div class="field col-12">
          <FloatLabel>
            <InputText id="name" v-model="newProfile.name" required class="w-full" />
            <label for="name">Name*</label>
          </FloatLabel>
        </div>
        
        <div class="field col-12 md:col-6">
          <div class="flex align-items-center gap-2 mb-2">
            <Checkbox id="isCompany" v-model="newProfile.isCompany" :binary="true" />
            <label for="isCompany" class="ml-2">This is a company</label>
          </div>
        </div>
        
        <div class="field col-12 md:col-6">
          <div class="flex align-items-center gap-2 mb-2">
            <Checkbox id="isDefault" v-model="newProfile.isDefault" :binary="true" />
            <label for="isDefault" class="ml-2">Set as default</label>
          </div>
        </div>
        
        <div class="field col-12" v-if="newProfile.isCompany">
          <FloatLabel>
            <InputText id="companyName" v-model="newProfile.companyName" class="w-full" />
            <label for="companyName">Company Name</label>
          </FloatLabel>
        </div>
        
        <div class="field col-12">
          <FloatLabel>
            <InputText id="address" v-model="newProfile.address" required class="w-full" />
            <label for="address">Street Address*</label>
          </FloatLabel>
        </div>
        
        <div class="field col-12 md:col-6">
          <FloatLabel>
            <InputText id="city" v-model="newProfile.city" required class="w-full" />
            <label for="city">City*</label>
          </FloatLabel>
        </div>
        
        <div class="field col-12 md:col-6">
          <FloatLabel>
            <InputText id="zip" v-model="newProfile.zip" required class="w-full" />
            <label for="zip">ZIP Code*</label>
          </FloatLabel>
        </div>
        
        <div class="field col-12 md:col-6">
          <FloatLabel>
            <Select
              id="country"
              v-model="newProfile.country"
              :options="countries"
              optionLabel="name"
              optionValue="code"
              required
              class="w-full"
            />
            <label for="country">Country*</label>
          </FloatLabel>
        </div>
        
        <div class="field col-12 md:col-6">
          <FloatLabel>
            <InputText id="state" v-model="newProfile.state" class="w-full" />
            <label for="state">State/Province</label>
          </FloatLabel>
        </div>
        
        <div class="field col-12 md:col-6">
          <FloatLabel>
            <InputText id="email" v-model="newProfile.email" type="email" class="w-full" />
            <label for="email">Email</label>
          </FloatLabel>
        </div>
        
        <div class="field col-12 md:col-6">
          <FloatLabel>
            <InputText id="phone" v-model="newProfile.phone" class="w-full" />
            <label for="phone">Phone</label>
          </FloatLabel>
        </div>
      </div>
      
      <template #footer>
        <Button 
          label="Cancel" 
          icon="pi pi-times" 
          @click="showCreateDialog = false" 
          text
          severity="secondary"
        />
        <Button 
          label="Create" 
          icon="pi pi-check" 
          @click="submitNewProfile" 
          :disabled="!newProfile.name || !newProfile.address || !newProfile.city || !newProfile.zip"
          severity="primary"
        />
      </template>
    </Dialog>
    
    <Toast />
  </div>
</template>

<style scoped>
.sender-profile-dropdown {
  width: 100%;
}
</style> 