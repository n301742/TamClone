<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from './components/layout/AppLayout.vue'
import Toast from 'primevue/toast'

const route = useRoute()

// Check if the current route requires authentication
const requiresAuth = computed(() => route.meta.requiresAuth === true)
</script>

<template>
  <!-- Global toast container for non-layout pages -->
  <Toast />
  
  <!-- Use AppLayout for authenticated routes -->
  <AppLayout v-if="requiresAuth" />
  
  <!-- For non-authenticated routes, just render the view -->
  <router-view v-else />
</template>

<style>
/* Global styles can go here */
</style>
