<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';

// Import PrimeVue components
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';
import Tag from 'primevue/tag';

// Define props
const props = defineProps({
  // Initial value for the form type
  modelValue: {
    type: String,
    default: 'formB'
  },
  // Whether to show the card container (can be disabled if parent wants to control layout)
  showCard: {
    type: Boolean,
    default: true
  }
});

// Define emits
const emit = defineEmits(['update:modelValue', 'custom-position-initialized']);

// Toast
const toast = useToast();

// Local ref for v-model two-way binding pattern
const selectedFormType = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
  }
});

// Custom position initialization tracking
const customPositionInitialized = ref(false);

// Form type options
const formTypeItems = [
  { name: 'DIN 5008 Form A', value: 'formA' },
  { name: 'DIN 5008 Form B', value: 'formB' },
  { name: 'DIN 676 Type A', value: 'din676' },
  { name: 'Custom', value: 'custom' }
];

// Watch for form type changes to initialize Custom position when first selected
watch(() => selectedFormType.value, (newValue) => {
  if (newValue === 'custom' && !customPositionInitialized.value) {
    // Initialize custom position with Form B coordinates
    customPositionInitialized.value = true;
    
    // Emit event for parent to handle
    emit('custom-position-initialized');
    
    // Show a hint toast to the user
    toast.add({
      severity: 'info',
      summary: 'Custom Positioning Enabled',
      detail: 'You can now drag the address window to reposition it. Starting with DIN 5008 Form B layout.',
      life: 3000
    });
  }
});
</script>

<template>
  <!-- With card container (default) -->
  <Card v-if="showCard" class="mb-4">
    <template #title>
      <span class="text-base">Form Standard Selection</span>
    </template>
    <template #content>
      <div class="flex justify-center">
        <SelectButton 
          v-model="selectedFormType"
          :options="formTypeItems" 
          optionLabel="name" 
          optionValue="value"
          aria-labelledby="form-standard-selection"
        />
      </div>
      <small class="block text-center text-gray-500 mt-3">
        <i class="pi pi-info-circle mr-1"></i>
        Select the appropriate form standard for your document
        <span v-if="selectedFormType === 'custom'" class="block mt-2">
          <i class="pi pi-arrows-alt text-primary mr-1"></i>
          Custom mode: You can drag the address window annotation to position it exactly where you need.
        </span>
      </small>
    </template>
  </Card>
  
  <!-- Without card container -->
  <div v-else>
    <div class="flex justify-center">
      <SelectButton 
        v-model="selectedFormType"
        :options="formTypeItems" 
        optionLabel="name" 
        optionValue="value"
        aria-labelledby="form-standard-selection"
      />
    </div>
    <small class="block text-center text-gray-500 mt-3">
      <i class="pi pi-info-circle mr-1"></i>
      Select the appropriate form standard for your document
      <span v-if="selectedFormType === 'custom'" class="block mt-2">
        <i class="pi pi-arrows-alt text-primary mr-1"></i>
        Custom mode: You can drag the address window annotation to position it exactly where you need.
      </span>
    </small>
  </div>
</template> 