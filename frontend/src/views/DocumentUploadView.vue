<template>
  <div class="document-upload-view">
    <div class="card p-0">
      <div class="p-4">
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
          
          <div class="flex flex-col md:flex-row gap-4">
            <!-- Left Column: Form Selection and Upload -->
            <div class="w-full md:w-8/12">
              <!-- Form Type Selection -->
              <div class="mb-4">
                <FormTypeSelector 
                  v-model="selectedFormType"
                />
              </div>
              
              <!-- Main workflow area -->
              <div class="document-uploader-container mb-4">
                <PdfUploader 
                  @upload-success="handleUploadSuccess" 
                  @address-extracted="handleAddressExtracted"
                  @file-selected="handleFileSelected"
                  @upload-error="handleUploadError"
                  @workflow-complete="handleWorkflowComplete"
                  @clear-preview="handleClearPreview"
                  :formType="getFormType(selectedFormType)"
                  :maxFileSize="10"
                  :showPdfPreview="false"
                  :showFormTypeFields="false"
                />
                
                <!-- PDF Annotator Component -->
                <div v-if="showAnnotator && pdfUrl" class="mt-4 border-1 surface-border p-3 border-round">
                  <div class="flex justify-content-between align-items-center mb-2">
                    <h6 class="text-sm font-medium m-0">Address Window Visualization</h6>
                    <Tag v-if="selectedFormType === 'custom'" severity="info" value="Custom Positioning Enabled" />
                  </div>
                  
                  <PdfAnnotator
                    :source="pdfUrl"
                    :formType="getFormType(selectedFormType)"
                    :allowReposition="allowAnnotationRepositioning"
                    @annotation-moved="handleAnnotationMoved"
                  />
                  
                  <small class="block text-gray-500 mt-2">
                    <i class="pi pi-info-circle mr-1"></i> 
                    This visualization shows where the address information will be extracted.
                    <span v-if="selectedFormType === 'custom'"> Drag the blue rectangle to reposition.</span>
                  </small>
                </div>
              </div>
            </div>
            
            <!-- Right Column: Address Extraction Results -->
            <div class="w-full md:w-4/12">
              <AddressExtractionResult 
                :extractedAddress="extractedAddress"
                :isScannedPdfDetected="isScannedPdfDetected"
                :scannedPdfError="scannedPdfError"
                @parse-name="parseNameWithBackendService"
              />
            </div>
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
import { ref, computed, watch } from 'vue';
import PdfUploader from '../components/PdfUploader.vue';
import FormTypeSelector from '../components/FormTypeSelector.vue';
import AddressExtractionResult from '../components/AddressExtractionResult.vue';
import PdfAnnotator from '../components/PdfAnnotator.vue';
import type { AddressExtraction } from '../services/api';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import nameParserService from '../services/api/NameParserService';

const toast = useToast();

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
const selectedFormType = ref('formB');
const extractedAddress = ref<AddressExtraction | null>(null);
const isScannedPdfDetected = ref(false);
const scannedPdfError = ref<any>(null);

// Add variables for PdfAnnotator
const showAnnotator = ref(false);
const pdfUrl = ref<string | null>(null);

// Computed property to determine if repositioning is allowed
const allowAnnotationRepositioning = computed(() => {
  return selectedFormType.value === 'custom';
});

// Event handlers
const handleFileSelected = (event: any) => {
  currentStep.value = 0;
  processingComplete.value = false;
  console.log('File selected:', event.files);
  
  // Generate a URL for the PDF and show annotator
  if (event && event.files && event.files.length > 0) {
    const file = event.files[0];
    
    // Generate a URL for the PDF
    if (pdfUrl.value) {
      URL.revokeObjectURL(pdfUrl.value);
    }
    pdfUrl.value = URL.createObjectURL(file);
    showAnnotator.value = true;
  }
  
  toast.add({
    severity: 'info',
    summary: 'File Selected',
    detail: 'Click the "Upload" button to process the document',
    life: 5000
  });
};

// Handle annotation moved event
const handleAnnotationMoved = (coordinates: any) => {
  console.log('📐 Address window annotation moved:', coordinates);
  
  toast.add({
    severity: 'info',
    summary: 'Address Window Repositioned',
    detail: 'The custom position will be used for future extraction attempts',
    life: 3000
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
  
  // Store address extraction data if available
  if (result.addressExtraction) {
    extractedAddress.value = result.addressExtraction;
  }
};

const handleAddressExtracted = (addressData: AddressExtraction) => {
  console.log('Address extracted:', addressData);
  currentStep.value = 2;
  
  // Store the extracted address data
  extractedAddress.value = addressData;
  
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

// Handle upload errors
const handleUploadError = (error: any) => {
  console.error('🛑 Upload error:', error);
  
  // Check if this is a scanned PDF error
  if (error.type === 'scanned-pdf') {
    console.log('📑 Handling scanned PDF error:', error);
    isScannedPdfDetected.value = true;
    scannedPdfError.value = error;
  } else {
    // Reset scanned PDF flag for other errors
    isScannedPdfDetected.value = false;
    scannedPdfError.value = null;
  }
};

// Parse name using the backend service when components are missing
const parseNameWithBackendService = async (nameValue: string) => {
  if (!nameValue) return;
  
  try {
    const parsedName = await nameParserService.parseName(nameValue);
    
    if (extractedAddress.value && parsedName) {
      // Update the name components in the extracted address
      if (parsedName.firstName) {
        extractedAddress.value.firstName = parsedName.firstName;
      }
      
      if (parsedName.lastName) {
        extractedAddress.value.lastName = parsedName.lastName;
      }
      
      if (parsedName.academicTitle) {
        extractedAddress.value.academicTitle = parsedName.academicTitle;
      }
    }
  } catch (error) {
    console.error('Error parsing name:', error);
  }
};

// Get form type from the selector component
const getFormType = (type: string): 'formA' | 'formB' | 'din676' => {
  return (type === 'custom' ? 'formB' : type) as 'formA' | 'formB' | 'din676';
};

const handleClearPreview = () => {
  showAnnotator.value = false;
  pdfUrl.value = null;
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

.card {
  padding: 1.5rem;
  margin-top: 0;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.document-upload-view {
  height: 100%;
}

.container {
  padding: 0.75rem;
}
</style> 