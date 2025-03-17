<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import { useToast } from 'primevue/usetoast';
import { pdfService, type AddressExtraction } from '../services/api';
import { useAuthStore } from '../stores/auth';
import PdfEmbed from 'vue-pdf-embed';

const toast = useToast();
const authStore = useAuthStore();

// Props
interface Props {
  formType?: 'formA' | 'formB' | 'din676';
  isDuplexPrint?: boolean;
  isColorPrint?: boolean;
  maxFileSize?: number; // in MB
  showPdfPreview?: boolean; // Whether to show PDF preview
}

const props = withDefaults(defineProps<Props>(), {
  formType: 'formB',
  isDuplexPrint: true,
  isColorPrint: false,
  maxFileSize: 10, // 10MB by default
  showPdfPreview: true // Show PDF preview by default
});

// Emits
const emit = defineEmits<{
  (e: 'upload-success', result: { id: string, addressExtraction?: AddressExtraction }): void;
  (e: 'upload-error', error: any): void;
  (e: 'address-extracted', addressData: AddressExtraction): void;
  (e: 'file-selected'): void;
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
  emit('file-selected');
};

const onClear = () => {
  selectedFiles.value = [];
  uploadProgress.value = 0;
  addressExtraction.value = null;
  totalSize.value = 0;
  
  // Clear PDF preview
  if (pdfSource.value) {
    URL.revokeObjectURL(pdfSource.value);
  }
  pdfSource.value = null;
  pdfBlob.value = null;
  showPdfViewer.value = false;
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
    const result = await pdfService.uploadPdfWithAddressExtraction(
      fileToUpload,
      {
        description: description.value,
        formType: props.formType,
        isDuplexPrint: props.isDuplexPrint,
        isColorPrint: props.isColorPrint
      }
    );

    console.log('✅ Upload response received:', result);

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
    } else {
      console.warn('⚠️ No address extraction data in response');
    }

    // Emit the upload success event
    emit('upload-success', { 
      id: result.id,
      addressExtraction: result.addressExtraction
    });

    // Clear selected files
    selectedFiles.value = [];
    totalSize.value = 0;

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
    } else {
      // Regular error handling for other types of errors
      toast.add({
        severity: 'error',
        summary: 'Upload Failed',
        detail: error.response?.data?.message || 'Failed to upload the PDF file.',
        life: 5000
      });
      emit('upload-error', error);
    }
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
</script>

<template>
  <div class="pdf-uploader">
    <div class="flex flex-col gap-2 mb-3">
      <label for="description" class="font-medium">Description (Optional)</label>
      <InputText 
        id="description" 
        v-model="description" 
        placeholder="Enter a description for this document"
      />
    </div>
    
    <FileUpload 
      ref="fileUploadRef"
      name="pdfFile" 
      url="/api/upload" 
      @upload="onTemplatedUpload($event)" 
      :multiple="false"
      accept="application/pdf" 
      :maxFileSize="maxFileSizeBytes" 
      @select="onSelectedFiles"
      :customUpload="true"
    >
      <template #header="{ chooseCallback, uploadCallback, clearCallback, files }">
        <div class="flex flex-wrap justify-between items-center flex-1 gap-4">
          <div class="flex gap-2">
            <Button @click="chooseCallback()" icon="pi pi-file-pdf" rounded outlined severity="secondary" 
              aria-label="Choose File"></Button>
            <Button @click="uploadEvent(uploadCallback)" icon="pi pi-cloud-upload" rounded outlined severity="success" 
              :disabled="!files || files.length === 0" aria-label="Upload File"></Button>
            <Button @click="clearCallback()" icon="pi pi-times" rounded outlined severity="danger" 
              :disabled="!files || files.length === 0" aria-label="Clear Files"></Button>
            
            <!-- Toggle PDF Viewer button (shows only when a PDF is selected) -->
            <Button v-if="pdfSource && props.showPdfPreview" @click="togglePdfViewer()" 
              :icon="showPdfViewer ? 'pi pi-list' : 'pi pi-file'" 
              rounded outlined severity="info"
              :aria-label="showPdfViewer ? 'Show File List' : 'Show PDF Preview'"></Button>
          </div>
          <ProgressBar :value="totalSizePercent" :showValue="false" class="md:w-20rem h-1 w-full md:ml-auto">
            <span class="whitespace-nowrap">{{ formattedTotalSize }} / {{ props.maxFileSize }}MB</span>
          </ProgressBar>
        </div>
      </template>
      
      <template #content="{ files, uploadedFiles, removeUploadedFileCallback, removeFileCallback, messages }">
        <div class="flex flex-col gap-4 pt-4">
          <Message v-for="message of messages" :key="message" :class="{ 'mb-4': !files.length && !uploadedFiles.length}" severity="error">
            {{ message }}
          </Message>

          <!-- PDF Viewer -->
          <div v-if="pdfSource && showPdfViewer && props.showPdfPreview" class="pdf-viewer-container">
            <h5>PDF Preview</h5>
            <div class="pdf-viewer">
              <PdfEmbed :source="pdfSource" :page="1" />
            </div>
          </div>

          <!-- File Cards - show if no PDF preview or if toggle is set to list view -->
          <template v-if="!showPdfViewer || !pdfSource || !props.showPdfPreview">
            <div v-if="files.length > 0">
              <h5>Pending</h5>
              <div class="flex flex-wrap gap-4">
                <div v-for="(file, index) of files" :key="file.name + file.type + file.size" 
                  class="p-4 rounded-border flex flex-col border border-surface items-center gap-4">
                  <div>
                    <i class="pi pi-file-pdf text-4xl text-primary"></i>
                  </div>
                  <span class="font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden">{{ file.name }}</span>
                  <div>{{ formatSize(file.size) }}</div>
                  <Badge value="Pending" severity="warn" />
                  <Button icon="pi pi-times" @click="onRemoveFile(file, removeFileCallback, index)" 
                    outlined rounded severity="danger" aria-label="Remove File" />
                </div>
              </div>
            </div>

            <div v-if="uploadedFiles.length > 0">
              <h5>Completed</h5>
              <div class="flex flex-wrap gap-4">
                <div v-for="(file, index) of uploadedFiles" :key="file.name + file.type + file.size" 
                  class="p-4 rounded-border flex flex-col border border-surface items-center gap-4">
                  <div>
                    <i class="pi pi-file-pdf text-4xl text-primary"></i>
                  </div>
                  <span class="font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden">{{ file.name }}</span>
                  <div>{{ formatSize(file.size) }}</div>
                  <Badge value="Completed" class="mt-2" severity="success" />
                  <Button icon="pi pi-times" @click="removeUploadedFileCallback(index)" 
                    outlined rounded severity="danger" aria-label="Remove File" />
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>
      
      <template #empty>
        <div class="flex items-center justify-center flex-col p-6">
          <i class="pi pi-file-pdf !border-2 !rounded-full !p-8 !text-4xl !text-primary" />
          <p class="mt-4 mb-0">Drag and drop PDF files here to upload.</p>
          <p class="text-sm text-color-secondary">Only PDF documents are accepted.</p>
        </div>
      </template>
    </FileUpload>
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

/* Override some PrimeVue styles for better UX */
:deep(.p-badge) {
  min-width: 1.5rem;
}

/* Fix text overflow in file cards */
.max-w-60 {
  max-width: 15rem;
}
</style> 