<script setup lang="ts">
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import Button from 'primevue/button';

const router = useRouter();

function goToHome() {
  router.push('/');
}
</script>

<template>
  <div class="flex justify-content-center align-items-center min-h-screen p-3">
    <Card class="w-full" style="max-width: 600px">
      <template #title>
        <h1>404 - Page Not Found</h1>
      </template>
      <template #content>
        <div class="flex flex-column align-items-center gap-4 p-3 text-center">
          <p>The page you're looking for doesn't exist or has been moved.</p>
          <Button label="Go to Dashboard" icon="pi pi-home" @click="goToHome" />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
/* All styling now uses PrimeVue utility classes */
</style> 