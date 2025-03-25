<template>
  <div class="metadata-editor p-4">
    <h3 class="text-xl font-bold mb-4">Document Metadata</h3>
    
    <div v-if="loading" class="flex justify-center items-center p-4">
      <ProgressSpinner />
      <span class="ml-2">Processing metadata...</span>
    </div>
    
    <form v-else @submit.prevent="handleSubmit">
      <!-- Document ID section - Display the document ID with explanation -->
      <div class="document-id-section mb-4 p-3 bg-blue-50 border-round">
        <h4 class="text-lg font-semibold mb-2">Document Information</h4>
        <div class="flex flex-column md:flex-row gap-3">
          <div class="field flex-1">
            <label for="documentId" class="block text-sm font-medium mb-1">Document ID</label>
            <div class="p-input-icon-right w-full">
              <i class="pi pi-info-circle" v-tooltip.top="'This is the unique identifier for your document in the BriefButler system'"></i>
              <!-- Show readonly input if document ID is provided by prop -->
              <InputText v-if="props.documentId" id="documentId" :value="props.documentId" class="w-full" readonly />
              <!-- Show editable input if document ID is not provided by prop -->
              <InputText v-else id="customDocumentId" v-model="customDocumentId" class="w-full" placeholder="Enter document ID" 
                :class="{'p-invalid': v$.customDocumentId?.$invalid && v$.customDocumentId?.$dirty}" />
            </div>
            <small v-if="props.documentId" class="text-sm text-blue-700">System-generated document ID (required for BriefButler)</small>
            <small v-else-if="v$.customDocumentId?.$invalid && v$.customDocumentId?.$dirty" class="p-error">Document ID is required</small>
            <small v-else class="text-sm text-blue-700">Please enter your document ID (required for BriefButler)</small>
          </div>
          
          <div class="field flex-1">
            <label for="reference" class="block text-sm font-medium mb-1">Reference Number (Optional)</label>
            <InputText id="reference" v-model="metadata.reference" class="w-full" placeholder="Your reference number" />
            <small class="text-sm text-gray-500">Add a custom reference number for your records</small>
          </div>
        </div>
      </div>
      
      <!-- Address fields (pre-filled from extraction) -->
      <div class="address-section mb-4">
        <h4 class="text-lg font-semibold mb-2">Recipient Information</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="field">
            <label for="name" class="block text-sm font-medium mb-1">Name</label>
            <InputText id="name" v-model="metadata.name" class="w-full" :class="{'p-invalid': v$.name.$invalid && v$.name.$dirty}" />
            <small v-if="v$.name.$invalid && v$.name.$dirty" class="p-error">Name is required</small>
          </div>
          
          <div class="field">
            <label for="email" class="block text-sm font-medium mb-1">Email (Optional)</label>
            <InputText id="email" v-model="metadata.email" class="w-full" :class="{'p-invalid': v$.email && v$.email.$invalid && v$.email.$dirty}" type="email" />
            <small v-if="v$.email && v$.email.$invalid && v$.email.$dirty" class="p-error">Please enter a valid email address</small>
          </div>
          
          <div class="field">
            <label for="street" class="block text-sm font-medium mb-1">Street</label>
            <InputText id="street" v-model="metadata.street" class="w-full" :class="{'p-invalid': v$.street.$invalid && v$.street.$dirty}" />
            <small v-if="v$.street.$invalid && v$.street.$dirty" class="p-error">Street is required</small>
          </div>
          
          <div class="field">
            <label for="city" class="block text-sm font-medium mb-1">City</label>
            <InputText id="city" v-model="metadata.city" class="w-full" :class="{'p-invalid': v$.city.$invalid && v$.city.$dirty}" />
            <small v-if="v$.city.$invalid && v$.city.$dirty" class="p-error">City is required</small>
          </div>
          
          <div class="field">
            <label for="postalCode" class="block text-sm font-medium mb-1">Postal Code</label>
            <InputText id="postalCode" v-model="metadata.postalCode" class="w-full" :class="{'p-invalid': v$.postalCode.$invalid && v$.postalCode.$dirty}" />
            <small v-if="v$.postalCode.$invalid && v$.postalCode.$dirty" class="p-error">Postal code is required</small>
          </div>
          
          <div class="field">
            <label for="country" class="block text-sm font-medium mb-1">Country</label>
            <InputText id="country" v-model="metadata.country" class="w-full" :class="{'p-invalid': v$.country.$invalid && v$.country.$dirty}" />
            <small v-if="v$.country.$invalid && v$.country.$dirty" class="p-error">Country is required</small>
          </div>
        </div>
      </div>
      
      <!-- BriefButler specific fields -->
      <div class="briefbutler-section mb-4">
        <h4 class="text-lg font-semibold mb-2">Document Settings</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="field">
            <label for="formType" class="block text-sm font-medium mb-1">Form Type</label>
            <Select id="formType" v-model="metadata.formType" :options="formTypes" optionLabel="label" optionValue="value" class="w-full" />
          </div>
          
          <!-- Delivery options -->
          <div class="delivery-options mt-2 p-3 border-1 border-round bg-gray-50">
            <h5 class="text-md font-medium mb-2">Delivery Options</h5>
            <div class="flex flex-column gap-2">
              <div class="field-checkbox flex align-items-center">
                <Checkbox id="isExpress" v-model="metadata.isExpress" :binary="true" />
                <label for="isExpress" class="ml-2">Express Delivery</label>
              </div>
              
              <div class="field-checkbox flex align-items-center">
                <Checkbox id="isRegistered" v-model="metadata.isRegistered" :binary="true" />
                <label for="isRegistered" class="ml-2">Registered Mail</label>
              </div>
              
              <div class="field-checkbox flex align-items-center">
                <Checkbox id="isDuplexPrint" v-model="metadata.isDuplexPrint" :binary="true" />
                <label for="isDuplexPrint" class="ml-2">Duplex Print</label>
              </div>
              
              <div class="field-checkbox flex align-items-center">
                <Checkbox id="isColorPrint" v-model="metadata.isColorPrint" :binary="true" />
                <label for="isColorPrint" class="ml-2">Color Print</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex justify-between mt-4">
        <Button type="button" label="Back" icon="pi pi-arrow-left" class="p-button-secondary" @click="$emit('back')" />
        <Button type="submit" label="Send to BriefButler" icon="pi pi-send" :loading="submitting" />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useVuelidate } from '@vuelidate/core';
import { required, email } from '@vuelidate/validators';
import { pdfService } from '../services/api';
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Select from "primevue/select";

const toast = useToast();

// Props
interface Props {
  initialMetadata?: Partial<DocumentMetadata>;
  documentId?: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

// Emits
const emit = defineEmits<{
  (e: 'submit', result: { metadata: DocumentMetadata, documentId: string, response: any }): void;
  (e: 'error', error: any): void;
  (e: 'back'): void;
}>();

// Form Types
const formTypes = [
  { label: 'Form A', value: 'formA' },
  { label: 'Form B', value: 'formB' },
  { label: 'DIN 676', value: 'din676' }
];

// Metadata interface
interface DocumentMetadata {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  formType: 'formA' | 'formB' | 'din676';
  isDuplexPrint: boolean;
  isColorPrint: boolean;
  email?: string;
  isExpress?: boolean;
  isRegistered?: boolean;
  reference?: string;
  documentId?: string; // Optional document ID property
}

// Default metadata values
const defaultMetadata: DocumentMetadata = {
  name: '',
  street: '',
  city: '',
  postalCode: '',
  country: '',
  formType: 'formB',
  isDuplexPrint: true,
  isColorPrint: false,
  email: '',
  isExpress: false,
  isRegistered: false,
  reference: ''
};

// State
const metadata = reactive<DocumentMetadata>({...defaultMetadata});
const submitting = ref(false);
const customDocumentId = ref('');

// Build validation rules to match the metadata structure
const buildValidationRules = () => {
  const rules = {
    name: { required },
    street: { required },
    city: { required },
    postalCode: { required },
    country: { required },
    email: { email } // Optional but must be valid if provided
  };
  
  // Add validation for customDocumentId when there's no document ID from props
  if (!props.documentId) {
    return {
      ...rules,
      customDocumentId: { required }
    };
  }
  
  return rules;
};

// Create validation instance
const v$ = useVuelidate(buildValidationRules(), { ...metadata, customDocumentId });

// Watch for initialMetadata changes and update form
watch(() => props.initialMetadata, (newValue) => {
  if (newValue) {
    // Update metadata with initialMetadata, keeping default values for undefined fields
    Object.assign(metadata, {
      ...defaultMetadata,
      ...newValue
    });
  }
}, { immediate: true });

// Handle form submission
const handleSubmit = async () => {
  console.log('Starting form validation');
  
  // Validate form
  const isValid = await v$.value.$validate();
  
  // Log validation errors for debugging
  if (!isValid) {
    console.error('Validation failed. Errors:', v$.value.$errors);
    
    // Log details about each error
    v$.value.$errors.forEach(error => {
      console.error(`Field: ${error.$property}, Error: ${error.$message}`);
    });
    
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please check the form for errors.',
      life: 3000
    });
    return;
  }

  console.log('Validation passed successfully');
  
  // Get document ID (either from props or custom input)
  const documentId = props.documentId || customDocumentId.value;
  
  if (!documentId) {
    console.error('Document ID is missing');
    toast.add({
      severity: 'error',
      summary: 'Missing Document ID',
      detail: 'Document ID is required for BriefButler processing.',
      life: 3000
    });
    return;
  }

  console.log('Using document ID:', documentId);
  submitting.value = true;

  try {
    console.log('Sending to BriefButler:', { 
      documentId, 
      metadata: { 
        ...metadata,
        senderAddress: 'Default Address',
        senderCity: 'Default City',
        senderZip: '1000',
        senderCountry: 'Austria' 
      }
    });
    
    // Send metadata to BriefButler API with all required fields
    const response = await pdfService.sendToBriefButler(
      documentId, 
      {
        ...metadata,
        senderAddress: 'Default Address',
        senderCity: 'Default City',
        senderZip: '1000',
        senderCountry: 'Austria'
      }
    );
    
    console.log('BriefButler response received:', response);
    
    toast.add({
      severity: 'success',
      summary: 'Document Sent',
      detail: 'Document has been successfully sent to BriefButler.',
      life: 3000
    });
    
    // Emit success event with metadata and response
    emit('submit', { 
      metadata, 
      documentId, 
      response 
    });
  } catch (error: any) {
    console.error('Error sending to BriefButler:', error);
    
    // Try to extract and show more meaningful error messages
    let errorMessage = 'Failed to send document to BriefButler.';
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
      console.error('Server error message:', errorMessage);
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.add({
      severity: 'error',
      summary: 'Submission Error',
      detail: errorMessage,
      life: 5000
    });
    
    // Emit error event
    emit('error', error);
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.metadata-editor {
  background-color: #f8f9fa;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style> 