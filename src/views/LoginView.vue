<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Button from 'primevue/button'

const router = useRouter()
const authStore = useAuthStore()
const error = ref('')
const currentOrigin = computed(() => window.location.origin)

// Initialize Google OAuth
onMounted(() => {
  try {
    console.log('Initializing Google OAuth...')
    if (!window.google) {
      error.value = 'Google OAuth client not loaded. Please check if the script is blocked by your browser.'
      return
    }

    // Log the current origin for debugging
    console.log('Current origin:', window.location.origin)
    
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    })

    console.log('Rendering Google button...')
    window.google.accounts.id.renderButton(
      document.getElementById("googleButton")!,
      { 
        theme: "outline", 
        size: "large",
        type: "standard",
        shape: "rectangular",
        text: "signin_with",
        logo_alignment: "left"
      }
    )

    // Disable One Tap for now to avoid FedCM issues
    // window.google.accounts.id.prompt()
  } catch (err) {
    console.error('Error initializing Google OAuth:', err)
    error.value = `Error initializing login: ${err instanceof Error ? err.message : String(err)}`
  }
})

// Handle Google OAuth response
const handleCredentialResponse = async (response: any) => {
  console.log('Received auth response:', response)
  try {
    if (response.credential) {
      authStore.setAuthenticated(true)
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      console.log('Decoded user info:', payload)
      authStore.setUser({
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      })
      router.push('/')
    } else {
      throw new Error('No credentials received')
    }
  } catch (err) {
    console.error('Error handling auth response:', err)
    error.value = `Authentication failed: ${err instanceof Error ? err.message : String(err)}`
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-lg">
      <div>
        <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Welcome to BriefButler
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Please sign in to continue
        </p>
        <p class="mt-2 text-center text-xs text-gray-500">
          Current origin: {{ currentOrigin }}
        </p>
      </div>
      
      <div v-if="error" class="mt-4 rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <span class="pi pi-exclamation-triangle text-red-400"></span>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error</h3>
            <div class="mt-2 text-sm text-red-700">
              {{ error }}
            </div>
          </div>
        </div>
      </div>
      
      <div class="mt-8 space-y-6">
        <div id="googleButton" class="flex justify-center"></div>
        <div class="text-center text-sm text-gray-500">
          Having trouble signing in? Try refreshing the page or check your browser's console for errors.
        </div>
      </div>
    </div>
  </div>
</template> 