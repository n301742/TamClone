<script setup lang="ts">
import { ref } from 'vue';
import AppTopbar from '@/layout/AppTopbar.vue';

const msg = ref('');
</script>

<template>
  <AppTopbar />
  <main>
    <h1>Dummy</h1>
    <InputText v-model="msg" />
    <p>{{ msg }}</p>

    <Button type="button" @click="toggleDarkMode" rounded :icon="isDarkTheme ? 'pi pi-moon' : 'pi pi-sun'" severity="secondary" />
  </main>
</template>

<style scoped></style>