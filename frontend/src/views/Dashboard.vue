<script setup lang="ts">
import { ref } from 'vue';
import { useLayout } from '../layout/composables/layout';

const { isDarkTheme } = useLayout();
const msg = ref('');
</script>

<template>
  <div class="grid">
    <div class="col-12">
      <div class="card">
        <h1>Home Dashboard</h1>
        <div class="p-fluid">
          <div class="field">
            <label for="message">Message</label>
            <InputText id="message" v-model="msg" />
          </div>
          <p>{{ msg }}</p>
        </div>
      </div>
    </div>
    
    <!-- Example of a stats card similar to Sakai -->
    <div class="col-12 md:col-6 lg:col-3">
      <div class="card mb-0">
        <div class="flex justify-between mb-4">
          <div>
            <span class="block text-muted-color font-medium mb-4">Sample Stats</span>
            <div class="font-medium text-xl" :style="{ color: isDarkTheme ? 'white' : '#111827' }">152</div>
          </div>
          <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
            <i class="pi pi-chart-bar text-blue-500 text-xl"></i>
          </div>
        </div>
        <span class="text-primary font-medium">24 new </span>
        <span class="text-muted-color">since last visit</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Card styling will be inherited from global styles */
</style>