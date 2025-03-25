<template>
  <div class="document-upload-view">
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-6">Document Upload Workflow</h1>
      
      <div class="card p-4 shadow-sm rounded-lg">
        <h2 class="text-xl font-semibold mb-4">Upload, Edit Metadata, and Send to BriefButler</h2>
        <p class="mb-4 text-gray-600">
          This workflow allows you to upload PDF documents, extract and edit metadata, 
          and send them to the BriefButler service for processing.
        </p>
        
        <div class="workflow-container">
          <!-- Workflow steps indicator -->
          <div class="steps mb-6">
            <ul class="flex flex-wrap">
              <li v-for="(step, index) in workflowSteps" :key="index" 
                class="flex-1 relative text-center" 
                :class="{ 
                  'text-primary font-semibold': currentStep === index,
                  'text-gray-500': currentStep !== index,
                  'completed': currentStep > index 
                }">
                <div class="step-circle mx-auto mb-2 flex items-center justify-center w-10 h-10 rounded-full text-white"
                  :class="{ 
                    'bg-primary': currentStep >= index,
                    'bg-gray-300': currentStep < index 
                  }">
                  <i :class="step.icon"></i>
                </div>
                <span>{{ step.label }}</span>
              </li>
            </ul>
          </div>
          
          <!-- Main workflow area -->
          <div class="document-uploader-container mb-4">
            <PdfUploader 
              @upload-success="handleUploadSuccess" 
              @address-extracted="handleAddressExtracted"
              @file-selected="handleFileSelected"
              @workflow-complete="handleWorkflowComplete"
              :formType="formType"
              :isDuplexPrint="isDuplexPrint"
              :isColorPrint="isColorPrint"
              :maxFileSize="10"
              :showPdfPreview="true"
            />
          </div>
          
          <!-- Success message when workflow is complete -->
          <div v-if="processingComplete" class="mt-4 p-4 bg-green-100 border-round text-center">
            <i class="pi pi-check-circle text-green-500 text-4xl mb-3"></i>
            <h3 class="m-0 mb-2 text-green-700">Workflow Complete</h3>
            <p class="m-0 text-green-600">Your document has been successfully processed and sent to BriefButler.</p>
            <Button 
              label="Start New Upload" 
              icon="pi pi-plus" 
              class="mt-3 p-button-success" 
              @click="() => { processingComplete = false; currentStep = 0; }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import PdfUploader from '../components/PdfUploader.vue';
import type { AddressExtraction } from '../services/api';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

// Form settings
const formType = ref<'formA' | 'formB' | 'din676'>('formB');
const isDuplexPrint = ref(true);
const isColorPrint = ref(false);

// Define workflow steps
const workflowSteps = [
  { label: 'Upload Document', icon: 'pi pi-upload' },
  { label: 'Extract Metadata', icon: 'pi pi-file-edit' },
  { label: 'Edit & Confirm', icon: 'pi pi-check-square' },
  { label: 'Send to BriefButler', icon: 'pi pi-send' }
];

// Track current step
const currentStep = ref(0);
const processingComplete = ref(false);

// Event handlers
const handleFileSelected = (event: any) => {
  currentStep.value = 0;
  processingComplete.value = false;
  console.log('File selected:', event.files);
  
  toast.add({
    severity: 'info',
    summary: 'File Selected',
    detail: 'Click the "Upload" button to process the document',
    life: 5000
  });
};

const handleUploadSuccess = (result: any) => {
  console.log('Upload success:', result);
  currentStep.value = 1;
  
  toast.add({
    severity: 'success',
    summary: 'Upload Complete',
    detail: 'Document uploaded successfully. Extracting metadata...',
    life: 3000
  });
};

const handleAddressExtracted = (addressData: AddressExtraction) => {
  console.log('Address extracted:', addressData);
  currentStep.value = 2;
  
  toast.add({
    severity: 'success',
    summary: 'Metadata Extracted',
    detail: 'Document metadata extracted. Please review and edit if necessary.',
    life: 3000
  });
  
  // After a successful extraction, move to the next step when metadata editing begins
  setTimeout(() => {
    currentStep.value = 3;
  }, 1000);
};

// Add a completed event listener
const handleWorkflowComplete = (result: any) => {
  console.log('📋 Workflow completed:', result);
  console.log('📋 Document ID used:', result.documentId || 'No document ID provided');
  
  processingComplete.value = true;
  
  toast.add({
    severity: 'success',
    summary: 'Process Complete',
    detail: `Document has been successfully sent to BriefButler with ID: ${result.documentId || 'custom ID'}`,
    life: 3000
  });
};
</script>

<style scoped>
.steps ul {
  position: relative;
}

.steps ul:before {
  content: '';
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #e5e7eb;
  z-index: 0;
}

.steps ul li.completed:before {
  background-color: var(--primary-color);
}

.step-circle {
  position: relative;
  z-index: 1;
}

.document-uploader-container {
  max-width: 800px;
  margin: 0 auto;
}
</style> 