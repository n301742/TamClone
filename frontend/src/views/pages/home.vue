<script setup lang="ts">
import { ref } from 'vue';
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';

const msg = ref('');
</script>

<template>
  <main>
    <FloatingConfigurator />
    <h1>Home</h1>
    <InputText v-model="msg" />
    <p>{{ msg }}</p>
  </main>
</template>

<style scoped></style>