<script setup lang="ts">
import { ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import ToggleButton from 'primevue/togglebutton'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// User preferences
const preferences = ref({
  emailNotifications: true,
  deliveryUpdates: true,
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
})

const userProfile = ref({
  name: authStore.user?.name || '',
  email: authStore.user?.email || '',
  phone: ''
})

const handleSavePreferences = () => {
  // Here we would save the preferences to the backend
  console.log('Saving preferences:', preferences.value)
}

const handleSaveProfile = () => {
  // Here we would update the user profile
  console.log('Saving profile:', userProfile.value)
}

const handleDeleteAccount = () => {
  // Here we would implement account deletion
  console.log('Deleting account...')
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
        <p class="text-gray-600">Manage your account settings and preferences.</p>
      </div>

      <!-- Profile Settings -->
      <Card>
        <template #title>
          <div class="flex items-center space-x-2">
            <i class="pi pi-user text-primary-500"></i>
            <span>Profile Settings</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-sm text-gray-600">Full Name</label>
                <InputText v-model="userProfile.name" class="w-full" />
              </div>
              <div class="space-y-2">
                <label class="text-sm text-gray-600">Email</label>
                <InputText v-model="userProfile.email" class="w-full" disabled />
              </div>
              <div class="space-y-2">
                <label class="text-sm text-gray-600">Phone Number</label>
                <InputText v-model="userProfile.phone" class="w-full" placeholder="Optional" />
              </div>
            </div>
            <div class="flex justify-end">
              <Button label="Save Changes" icon="pi pi-check" @click="handleSaveProfile" />
            </div>
          </div>
        </template>
      </Card>

      <!-- Notification Preferences -->
      <Card>
        <template #title>
          <div class="flex items-center space-x-2">
            <i class="pi pi-bell text-primary-500"></i>
            <span>Notification Preferences</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-medium">Email Notifications</h3>
                <p class="text-sm text-gray-600">Receive email updates about your letters</p>
              </div>
              <ToggleButton v-model="preferences.emailNotifications" />
            </div>
            <Divider />
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-medium">Delivery Updates</h3>
                <p class="text-sm text-gray-600">Get notified when your letter status changes</p>
              </div>
              <ToggleButton v-model="preferences.deliveryUpdates" />
            </div>
            <div class="flex justify-end">
              <Button label="Save Preferences" icon="pi pi-check" @click="handleSavePreferences" />
            </div>
          </div>
        </template>
      </Card>

      <!-- Danger Zone -->
      <Card>
        <template #title>
          <div class="flex items-center space-x-2">
            <i class="pi pi-exclamation-triangle text-red-500"></i>
            <span class="text-red-500">Danger Zone</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <p class="text-sm text-gray-600">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button 
              label="Delete Account" 
              icon="pi pi-trash" 
              severity="danger" 
              @click="handleDeleteAccount"
            />
          </div>
        </template>
      </Card>
    </div>
  </AppLayout>
</template> 