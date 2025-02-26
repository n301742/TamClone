import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const user = ref<{
    id: string
    email: string
    name: string
    picture?: string
  } | null>(null)

  function setAuthenticated(value: boolean) {
    isAuthenticated.value = value
  }

  function setUser(userData: typeof user.value) {
    user.value = userData
  }

  function logout() {
    isAuthenticated.value = false
    user.value = null
  }

  return {
    isAuthenticated,
    user,
    setAuthenticated,
    setUser,
    logout
  }
}) 