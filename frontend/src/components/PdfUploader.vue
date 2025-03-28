<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { pdfService, type AddressExtraction } from '../services/api';
import { useAuthStore } from '../stores/auth';
import PdfEmbed from 'vue-pdf-embed';
import MetadataEditor from './MetadataEditor.vue';
import Button from 'primevue/button';
import FileUpload from 'primevue/fileupload';
import ProgressBar from 'primevue/progressbar';
import ProgressSpinner from 'primevue/progressspinner';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';

const toast = useToast();
const authStore = useAuthStore();

// Props
interface Props {
  formType?: 'formA' | 'formB' | 'din676';
  isDuplexPrint?: boolean;
  isColorPrint?: boolean;
  maxFileSize?: number; // in MB
  showPdfPreview?: boolean; // Whether to show PDF preview
  showFormTypeFields?: boolean; // Whether to show form type fields
}

const props = withDefaults(defineProps<Props>(), {
  formType: 'formB',
  isDuplexPrint: true,
  isColorPrint: false,
  maxFileSize: 10, // 10MB by default
  showPdfPreview: true, // Show PDF preview by default
  showFormTypeFields: true // Show form type fields by default
});

// Emits
const emit = defineEmits<{
  (e: 'upload-success', result: { id: string, addressExtraction?: AddressExtraction }): void;
  (e: 'upload-error', error: any): void;
  (e: 'address-extracted', addressData: AddressExtraction): void;
  (e: 'file-selected', event: { files: File[] }): void;
  (e: 'workflow-complete', result: any): void;
  (e: 'clear-preview'): void;
}>();

// State
const fileUploadRef = ref<any>(null);
const selectedFiles = ref<File[]>([]);
const uploadedFiles = ref<any[]>([]);
const uploadProgress = ref<number>(0);
const isUploading = ref<boolean>(false);
const addressExtraction = ref<AddressExtraction | null>(null);
const description = ref<string>('');
const totalSize = ref<number>(0);
const pdfSource = ref<string | null>(null);
const pdfBlob = ref<Blob | null>(null);
const showPdfViewer = ref<boolean>(false);
const formTypeInternal = ref(props.formType);
const isDuplexPrintInternal = ref(props.isDuplexPrint);
const isColorPrintInternal = ref(props.isColorPrint);
const documentId = ref<string | null>(null);
const showMetadataEditor = ref<boolean>(false);
const metadataSubmitting = ref<boolean>(false);
const error = ref<any>(null);

// Form types for dropdown
const formTypes = [
  { label: 'Form A', value: 'formA' },
  { label: 'Form B', value: 'formB' },
  { label: 'DIN 676', value: 'din676' }
];

// Workflow states
type WorkflowState = 'upload' | 'processing' | 'metadata' | 'complete';
const currentState = ref<WorkflowState>('upload');

// Watch for formType changes from the parent
watch(() => props.formType, (newFormType) => {
  formTypeInternal.value = newFormType;
  console.log(`📝 Form type updated to: ${newFormType}`);
});

// Watch for isDuplexPrint changes from the parent
watch(() => props.isDuplexPrint, (newValue) => {
  isDuplexPrintInternal.value = newValue;
  console.log(`📝 Duplex print updated to: ${newValue}`);
});

// Watch for isColorPrint changes from the parent
watch(() => props.isColorPrint, (newValue) => {
  isColorPrintInternal.value = newValue;
  console.log(`📝 Color print updated to: ${newValue}`);
});

// Computed
const maxFileSizeBytes = computed(() => props.maxFileSize * 1024 * 1024);
const fileSelected = computed(() => selectedFiles.value.length > 0);
const isValidFile = computed(() => {
  if (selectedFiles.value.length === 0) return false;
  
  // Only accept PDFs and check size
  return selectedFiles.value.every(file => 
    file.type === 'application/pdf' && 
    file.size <= maxFileSizeBytes.value
  );
});

// Calculate total size and percentage
const totalSizePercent = computed(() => {
  const maxSize = props.maxFileSize * 1024 * 1024; // Convert to bytes
  const percent = (totalSize.value / maxSize) * 100;
  return Math.min(percent, 100); // Cap at 100%
});

const formattedTotalSize = computed(() => {
  return formatSize(totalSize.value);
});

// Format size for display
const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Methods
const onSelectedFiles = (event: any) => {
  selectedFiles.value = [...event.files];
  
  // Calculate total size
  totalSize.value = selectedFiles.value.reduce((sum, file) => sum + file.size, 0);
  
  // Reset the address extraction data
  addressExtraction.value = null;
  
  // Clear any previous errors
  error.value = null;
  
  // Create a preview for the PDF file if it's a valid PDF
  if (selectedFiles.value.length > 0 && selectedFiles.value[0].type === 'application/pdf') {
    const file = selectedFiles.value[0];
    pdfBlob.value = file;
    pdfSource.value = URL.createObjectURL(file);
    
    // Show the PDF viewer by default if enabled
    if (props.showPdfPreview) {
      showPdfViewer.value = true;
    }
  } else {
    pdfSource.value = null;
    pdfBlob.value = null;
    showPdfViewer.value = false;
  }
  
  // Emit file-selected event to notify parent components
  emit('file-selected', { files: selectedFiles.value });
  
  // Reset workflow state
  currentState.value = 'upload';
  documentId.value = null;
  showMetadataEditor.value = false;
};

const onClear = () => {
  selectedFiles.value = [];
  uploadProgress.value = 0;
  addressExtraction.value = null;
  totalSize.value = 0;
  error.value = null; // Clear any error state
  
  // Clear PDF preview
  if (pdfSource.value) {
    URL.revokeObjectURL(pdfSource.value);
  }
  pdfSource.value = null;
  pdfBlob.value = null;
  showPdfViewer.value = false;
  
  // Reset workflow state
  currentState.value = 'upload';
  documentId.value = null;
  showMetadataEditor.value = false;
  
  // Emit event to clear external previews like PdfAnnotator
  emit('clear-preview');
};

const onRemoveFile = (file: File, removeCallback: Function, index: number) => {
  totalSize.value -= file.size;
  removeCallback(index);
  
  // If removing the last file, clear the PDF preview
  if (selectedFiles.value.length <= 1) {
    if (pdfSource.value) {
      URL.revokeObjectURL(pdfSource.value);
    }
    pdfSource.value = null;
    pdfBlob.value = null;
    showPdfViewer.value = false;
  }
};

const togglePdfViewer = () => {
  showPdfViewer.value = !showPdfViewer.value;
};

const uploadEvent = async (uploadCallback: Function) => {
  if (selectedFiles.value.length === 0 || !isValidFile.value) {
    toast.add({
      severity: 'error',
      summary: 'Invalid File',
      detail: 'Please select a valid PDF file.',
      life: 3000
    });
    return;
  }

  // Check authentication status if API is connected
  if (authStore.apiConnected && !authStore.isAuthenticated) {
    toast.add({
      severity: 'warn',
      summary: 'Authentication Required',
      detail: 'Please log in to upload and process PDF files.',
      life: 5000
    });
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;
  
  // First call the PrimeVue's upload callback
  uploadCallback();

  // Then handle our custom upload logic for the first file (we only process one PDF at a time)
  const fileToUpload = selectedFiles.value[0];
  
  try {
    console.log('⬆️ Starting file upload...');
    currentState.value = 'processing';
    
    const result = await pdfService.uploadPdfWithAddressExtraction(
      fileToUpload,
      {
        description: description.value,
        formType: formTypeInternal.value,
        isDuplexPrint: isDuplexPrintInternal.value,
        isColorPrint: isColorPrintInternal.value
      }
    );

    console.log('✅ Upload response received:', result);
    
    // Store document ID for later use with BriefButler
    if (result.id) {
      documentId.value = result.id;
    }

    toast.add({
      severity: 'success',
      summary: 'Upload Complete',
      detail: 'PDF uploaded successfully.',
      life: 3000
    });

    // Store the address extraction result
    if (result.addressExtraction) {
      console.log('📋 Address extraction data:', result.addressExtraction);
      addressExtraction.value = result.addressExtraction;
      emit('address-extracted', result.addressExtraction);
      
      // Move to metadata editing step
      currentState.value = 'metadata';
      showMetadataEditor.value = true;
    } else {
      console.warn('⚠️ No address extraction data in response');
      // Still move to metadata step but without pre-filled data
      currentState.value = 'metadata';
      showMetadataEditor.value = true;
    }

    // Emit the upload success event
    emit('upload-success', { 
      id: result.id,
      addressExtraction: result.addressExtraction
    });

    // Don't clear selected files yet, as we need to keep the preview during metadata editing
    // selectedFiles.value = [];
    // totalSize.value = 0;

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    
    // Check if this is a scanned PDF error (status 422 with requiresOcr flag)
    if (error.response?.status === 422 && error.response?.data?.data?.requiresOcr) {
      console.log('📑 Scanned PDF detected:', error.response.data);
      
      // Show a specific error message for scanned PDFs
      toast.add({
        severity: 'warn',
        summary: 'Scanned PDF Detected',
        detail: 'This appears to be a scanned document without extractable text. Address extraction requires a text-based PDF.',
        life: 8000
      });
      
      // Emit a specific error for scanned PDFs
      emit('upload-error', {
        type: 'scanned-pdf',
        message: 'Scanned PDF detected',
        details: error.response.data
      });
      
      // Set error state
      error.value = {
        type: 'scanned-pdf',
        message: 'Scanned PDF detected',
        details: error.response.data
      };
    } else {
      // Regular error handling for other types of errors
      toast.add({
        severity: 'error',
        summary: 'Upload Failed',
        detail: error.response?.data?.message || 'Failed to upload the PDF file.',
        life: 5000
      });
      emit('upload-error', error);
      
      // Set error state
      error.value = error;
    }
    
    // Reset to upload state on error
    currentState.value = 'upload';
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

// Format confidence as percentage
const confidencePercentage = computed(() => {
  if (!addressExtraction.value) return '0%';
  return `${Math.round(addressExtraction.value.confidence * 100)}%`;
});

// Handle templated upload 
const onTemplatedUpload = (event: any) => {
  // Update uploaded files
  uploadedFiles.value = event.files;
};

// Handle metadata submission
const onMetadataSubmit = async (result: { metadata: any, documentId: string, response: any }) => {
  console.log('📋 Metadata submitted:', result);
  console.log('📋 Document ID used:', result.documentId);
  
  // Show success message
  toast.add({
    severity: 'success',
    summary: 'Document Processed',
    detail: 'Document successfully sent to BriefButler service.',
    life: 3000
  });
  
  // Update workflow state
  currentState.value = 'complete';
  showMetadataEditor.value = false;
  
  // Emit the workflow-complete event
  emit('workflow-complete', result);
  
  // Reset for next upload
  setTimeout(() => {
    // Clear the file selection after a short delay to show the success state
    selectedFiles.value = [];
    totalSize.value = 0;
    addressExtraction.value = null;
    documentId.value = null;
    
    // Clear PDF preview
    if (pdfSource.value) {
      URL.revokeObjectURL(pdfSource.value);
    }
    pdfSource.value = null;
    pdfBlob.value = null;
    showPdfViewer.value = false;
    
    // Reset to upload state for next document
    currentState.value = 'upload';
  }, 3000);
};

// Handle metadata editing error
const onMetadataError = (error: any) => {
  console.error('❌ Metadata submission error:', error);
  
  // Stay in metadata editing state to allow corrections
  currentState.value = 'metadata';
};

// Go back from metadata editor to upload state
const onMetadataBack = () => {
  showMetadataEditor.value = false;
  currentState.value = 'upload';
};

// Updated event handlers for FileUpload
const onSelectedRemoveFile = (event: any) => {
  // Get the file from the event
  const file = event.file;
  // Call our existing handler (without the callback and index that may not be available)
  onRemoveFile(file, () => {}, 0);
};

// Trigger file input click to open file dialog
const triggerFileUpload = () => {
  if (fileUploadRef.value && fileUploadRef.value.$el) {
    const fileInput = fileUploadRef.value.$el.querySelector('input[type=file]');
    if (fileInput) {
      fileInput.click();
    }
  }
};

const onUploader = (event: any) => {
  // Extract the upload callback function from the event
  const uploadCallback = event && typeof event === 'object' ? event.uploader || (() => {}) : () => {};
  
  // Call our existing upload handler with the callback
  uploadEvent(uploadCallback);
};
</script>

<template>
  <div class="pdf-uploader">
    <!-- File Upload UI - shown in upload state -->
    <div v-if="currentState === 'upload'" class="upload-section">
      <div v-if="!error" class="mb-5">
        <div class="text-center my-3">
          <h3 class="text-lg font-semibold">Upload your PDF file</h3>
          <p class="text-sm text-gray-500">Drag and drop or click to select</p>
        </div>
        
        <div v-if="showFormTypeFields">
          <span class="p-float-label">
            <Select 
              id="formType" 
              v-model="formTypeInternal" 
              :options="formTypes" 
              optionLabel="label" 
              optionValue="value" 
              class="w-full md:w-56"
            />
            <label for="formType">Form Type</label>
          </span>
        </div>
      </div>
      
      <FileUpload
        ref="fileUploadRef"
        mode="advanced"
        :multiple="false"
        accept="application/pdf"
        :maxFileSize="maxFileSizeBytes"
        :auto="false"
        :customUpload="true"
        @select="onSelectedFiles"
        @clear="onClear"
        @remove="onSelectedRemoveFile"
        @uploader="onUploader"
        :class="{ 'p-invalid': !isValidFile && fileSelected }"
      >
        <template #header="{ chooseCallback, uploadCallback, clearCallback }">
          <div class="flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <span class="font-bold mr-2">PDF Upload</span>
              <span class="text-sm">Max size: {{ props.maxFileSize }}MB</span>
            </div>
            <div class="flex gap-2 justify-content-end">
              <!-- Clear button -->
              <Button
                v-if="fileSelected"
                type="button"
                icon="pi pi-times"
                label="Clear"
                class="p-button-outlined p-button-danger p-button-sm justify-content-end"
                @click="clearCallback"
              />
            </div>
          </div>
        </template>
        
        <template #empty>
          <div class="flex flex-column align-items-center p-5">
            <i class="pi pi-file-pdf text-5xl mb-3" style="color: var(--primary-color);"></i>
            <div class="flex flex-wrap items-center justify-center gap-1 mb-2">
              <span class="font-semibold">Drag and drop a PDF here</span>
              <span class="text-sm">or</span>
              <button type="button" class="p-link text-primary p-0 hover:underline text-sm" @click="triggerFileUpload">
                click to browse
              </button>
            </div>
          </div>
        </template>
      </FileUpload>
      
      <!-- Size indicator -->
      <div v-if="fileSelected" class="mt-2">
        <div class="flex justify-content-between text-sm mb-1">
          <span>Total Size: {{ formattedTotalSize }}</span>
          <span>{{ Math.round(totalSizePercent) }}% of max</span>
        </div>
        <ProgressBar :value="totalSizePercent" :class="{'danger-progress': totalSizePercent > 90}" />
      </div>
      
      <!-- File type validation error -->
      <small v-if="!isValidFile && fileSelected" class="p-error block mt-2">
        Please select a valid PDF file under {{ props.maxFileSize }}MB
      </small>
      
      <!-- Optional description field -->
      <div class="mt-3">
        <span class="p-float-label">
          <InputText id="description" v-model="description" class="w-full" />
          <label for="description">Description (optional)</label>
        </span>
      </div>
      
      <!-- Form Type Selection -->
      <div v-if="showFormTypeFields" class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <span class="p-float-label">
            <Select 
              id="formType" 
              v-model="formTypeInternal" 
              :options="formTypes" 
              optionLabel="label" 
              optionValue="value" 
              class="w-full"
            />
            <label for="formType">Form Type</label>
          </span>
        </div>
        
        <div class="flex flex-column gap-2 justify-content-center">
          <div class="field-checkbox flex align-items-center">
            <Checkbox id="isDuplexPrint" v-model="isDuplexPrintInternal" :binary="true" />
            <label for="isDuplexPrint" class="ml-2">Duplex Print</label>
          </div>
          
          <div class="field-checkbox flex align-items-center">
            <Checkbox id="isColorPrint" v-model="isColorPrintInternal" :binary="true" />
            <label for="isColorPrint" class="ml-2">Color Print</label>
          </div>
        </div>
      </div>
      
      <!-- Upload button outside FileUpload component for better visibility -->
      <div v-if="fileSelected && isValidFile" class="mt-4 text-center">
        <Button 
          type="button" 
          icon="pi pi-cloud-upload" 
          label="Start Upload" 
          class="p-button-success"
          @click="() => uploadEvent(() => {})"
        />
        <div class="text-sm text-gray-500 mt-2">
          Click the button above to start processing the document
        </div>
      </div>
    </div>
    
    <!-- Loading state -->
    <div v-if="currentState === 'processing'" class="processing-section p-4 flex flex-column align-items-center">
      <ProgressSpinner style="width: 50px; height: 50px;" />
      <div class="text-center mt-3">
        <h3 class="m-0 mb-2">Processing Document</h3>
        <p class="text-sm text-500 m-0">Uploading and extracting metadata...</p>
      </div>
    </div>
    
    <!-- Metadata Editor - shown in metadata state -->
    <MetadataEditor
      v-if="currentState === 'metadata' && showMetadataEditor"
      :initialMetadata="addressExtraction ? {
        name: addressExtraction.name || '',
        street: addressExtraction.street || '',
        city: addressExtraction.city || '',
        postalCode: addressExtraction.postalCode || '',
        country: addressExtraction.country || '',
        formType: formTypeInternal,
        isDuplexPrint: isDuplexPrintInternal,
        isColorPrint: isColorPrintInternal
      } : undefined"
      :documentId="documentId || undefined"
      @submit="onMetadataSubmit"
      @error="onMetadataError"
      @back="onMetadataBack"
    />
    
    <!-- PDF Overlay showing extraction areas - shown during metadata editing -->
    <div v-if="currentState === 'metadata' && pdfSource && addressExtraction" class="pdf-extraction-overlay mt-4">
      <h3 class="text-xl font-bold mb-2">Extracted Data Visualization</h3>
      <p class="text-sm text-gray-600 mb-3">The highlighted areas show where data was extracted from your document.</p>
      
      <div class="relative border-1 border-round overflow-hidden">
        <div class="pdf-container">
          <PdfEmbed :source="pdfSource" class="w-full" style="height: 500px;" />
          
          <!-- Overlay highlights -->
          <div v-if="addressExtraction" class="extraction-highlights">
            <!-- Name highlight -->
            <div v-if="addressExtraction.name" class="highlight name-highlight">
              <span class="highlight-label">Name: {{ addressExtraction.name }}</span>
            </div>
            
            <!-- Address highlight -->
            <div v-if="addressExtraction.street" class="highlight address-highlight">
              <span class="highlight-label">Address: {{ addressExtraction.street }}</span>
            </div>
            
            <!-- City/Postal highlight -->
            <div v-if="addressExtraction.city && addressExtraction.postalCode" class="highlight city-highlight">
              <span class="highlight-label">City/Postal: {{ addressExtraction.postalCode }} {{ addressExtraction.city }}</span>
            </div>
          </div>
          
          <!-- Confidence indicator -->
          <div class="confidence-indicator">
            <span class="font-semibold">Extraction Confidence:</span>
            <ProgressBar 
              :value="addressExtraction ? addressExtraction.confidence * 100 : 0" 
              :class="{ 
                'green-progress': addressExtraction && addressExtraction.confidence > 0.8,
                'yellow-progress': addressExtraction && addressExtraction.confidence > 0.5 && addressExtraction.confidence <= 0.8,
                'red-progress': addressExtraction && addressExtraction.confidence <= 0.5
              }"
              class="mt-1"
            />
            <span class="text-sm">{{ confidencePercentage }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Complete state -->
    <div v-if="currentState === 'complete'" class="complete-section p-4 flex flex-column align-items-center">
      <i class="pi pi-check-circle text-5xl text-green-500 mb-3"></i>
      <div class="text-center">
        <h3 class="m-0 mb-2">Document Sent Successfully</h3>
        <p class="text-sm text-500 m-0">Your document has been sent to BriefButler.</p>
      </div>
    </div>
    
    <!-- PDF Preview - shown in all states if available -->
    <div v-if="pdfSource && props.showPdfPreview" class="pdf-preview-section mt-4">
      <div class="flex justify-content-between align-items-center mb-2">
        <h3 class="m-0 text-lg">Document Preview</h3>
        <Button 
          type="button" 
          :icon="showPdfViewer ? 'pi pi-eye-slash' : 'pi pi-eye'" 
          :label="showPdfViewer ? 'Hide Preview' : 'Show Preview'"
          class="p-button-sm"
          @click="togglePdfViewer"
        />
      </div>
      
      <div v-if="showPdfViewer" class="pdf-viewer border-1 border-round">
        <PdfEmbed :source="pdfSource" class="w-full" style="height: 500px;" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-uploader {
  width: 100%;
}

/* Make sure the FileUpload component is properly styled */
:deep(.p-fileupload) {
  width: 100%;
}

:deep(.p-fileupload-buttonbar) {
  display: none; /* Hide default buttons since we're using custom header */
}

:deep(.p-fileupload-content) {
  border-top: none;
}

:deep(.p-message) {
  margin-bottom: 1rem;
}

/* PDF Viewer Styles */
.pdf-viewer-container {
  width: 100%;
  margin-bottom: 1rem;
}

.pdf-viewer {
  height: 500px;
  overflow: auto;
  border: 1px solid var(--surface-200);
  border-radius: 6px;
  padding: 1rem;
  background-color: var(--surface-50);
}

/* Make sure the PDF fits in the container */
:deep(.pdf-page) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  margin: 0 auto;
}

/* Extraction overlay styles */
.pdf-extraction-overlay {
  width: 100%;
}

.pdf-container {
  position: relative;
}

.extraction-highlights {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.highlight {
  position: absolute;
  background-color: rgba(255, 221, 0, 0.2);
  border: 2px solid rgba(255, 165, 0, 0.5);
  border-radius: 4px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.name-highlight {
  top: 20%;
  left: 15%;
  width: 40%;
  height: 30px;
}

.address-highlight {
  top: 25%;
  left: 15%;
  width: 50%;
  height: 30px;
}

.city-highlight {
  top: 30%;
  left: 15%;
  width: 45%;
  height: 30px;
}

.highlight-label {
  background-color: #ffffff;
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 0.8rem;
  color: #333;
  border: 1px solid #ddd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.confidence-indicator {
  position: absolute;
  bottom: 15px;
  right: 15px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 250px;
  z-index: 6;
}

.green-progress :deep(.p-progressbar-value) {
  background-color: #22c55e !important;
}

.yellow-progress :deep(.p-progressbar-value) {
  background-color: #eab308 !important;
}

.red-progress :deep(.p-progressbar-value) {
  background-color: #ef4444 !important;
}

/* Fix text overflow in file cards */
.max-w-60 {
  max-width: 15rem;
}
</style> 