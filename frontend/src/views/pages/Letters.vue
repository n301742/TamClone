<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { letterService } from '../../services/api';
import type { Letter } from '../../services/api';

// Services
const router = useRouter();
const toast = useToast();

// State
const letters = ref<Letter[]>([]);
const loading = ref(true);
const uploadDialog = ref(false);
const selectedLetter = ref<Letter | null>(null);
const pdfFile = ref<File | null>(null);
const newLetterTitle = ref('');
const uploadProgress = ref(0);
const isUploading = ref(false);

// Status display utilities
const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'secondary';
    case 'PROCESSING': return 'info';
    case 'READY_TO_SEND': return 'warning';
    case 'SENT': return 'success';
    case 'DELIVERED': return 'success';
    case 'ERROR': return 'danger';
    default: return 'secondary';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'pi pi-pencil';
    case 'PROCESSING': return 'pi pi-spinner pi-spin';
    case 'READY_TO_SEND': return 'pi pi-envelope';
    case 'SENT': return 'pi pi-send';
    case 'DELIVERED': return 'pi pi-check-circle';
    case 'ERROR': return 'pi pi-exclamation-triangle';
    default: return 'pi pi-question-circle';
  }
};

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Handle file upload
const onFileSelect = (event: any) => {
  pdfFile.value = event.files[0];
};

// Open upload dialog
const openUploadDialog = () => {
  newLetterTitle.value = '';
  pdfFile.value = null;
  uploadDialog.value = true;
};

// Close upload dialog
const closeUploadDialog = () => {
  uploadDialog.value = false;
  pdfFile.value = null;
  newLetterTitle.value = '';
};

// Upload new letter
const uploadLetter = async () => {
  if (!pdfFile.value) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Please select a PDF file', life: 3000 });
    return;
  }

  if (!newLetterTitle.value) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Please enter a title for your letter', life: 3000 });
    return;
  }

  isUploading.value = true;

  try {
    await letterService.createLetter(
      { title: newLetterTitle.value },
      pdfFile.value,
      (event) => {
        uploadProgress.value = Math.round((event.loaded * 100) / event.total);
      }
    );

    toast.add({ severity: 'success', summary: 'Success', detail: 'Letter uploaded successfully', life: 3000 });
    closeUploadDialog();
    fetchLetters();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Upload Failed',
      detail: error.response?.data?.message || 'Failed to upload letter. Please try again.',
      life: 5000
    });
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

// Send letter
const sendLetter = async (letter: Letter) => {
  try {
    await letterService.sendLetter(letter.id);
    toast.add({ severity: 'success', summary: 'Success', detail: 'Letter sent for processing', life: 3000 });
    fetchLetters();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to send letter. Please try again.',
      life: 5000
    });
  }
};

// View letter details
const viewLetterDetails = (letter: Letter) => {
  selectedLetter.value = letter;
  router.push(`/letters/${letter.id}`);
};

// Delete letter
const deleteLetter = async (letter: Letter) => {
  try {
    await letterService.deleteLetter(letter.id);
    toast.add({ severity: 'success', summary: 'Success', detail: 'Letter deleted successfully', life: 3000 });
    fetchLetters();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to delete letter. Please try again.',
      life: 5000
    });
  }
};

// Fetch letters from API
const fetchLetters = async () => {
  loading.value = true;
  try {
    letters.value = await letterService.getLetters();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to fetch letters. Please try again.',
      life: 5000
    });
  } finally {
    loading.value = false;
  }
};

// Initialize component
onMounted(() => {
  fetchLetters();
});
</script>

<template>
  <div>
    <div class="card mb-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">My Letters</h1>
        <Button label="Upload New Letter" icon="pi pi-plus" @click="openUploadDialog" />
      </div>

      <DataTable :value="letters" :loading="loading" paginator :rows="10" 
               emptyMessage="No letters found. Create your first letter by clicking the 'Upload New Letter' button."
               stripedRows class="p-datatable-letters">
        <Column field="title" header="Title" :sortable="true">
          <template #body="{ data }">
            <div>
              <span class="font-medium">{{ data.title }}</span>
            </div>
          </template>
        </Column>
        
        <Column field="status" header="Status" :sortable="true">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" :icon="getStatusIcon(data.status)" />
          </template>
        </Column>
        
        <Column field="trackingNumber" header="Tracking #">
          <template #body="{ data }">
            <div v-if="data.trackingNumber">
              {{ data.trackingNumber }}
            </div>
            <div v-else>
              <span class="text-surface-400">N/A</span>
            </div>
          </template>
        </Column>
        
        <Column field="createdAt" header="Created" :sortable="true">
          <template #body="{ data }">
            {{ formatDate(data.createdAt) }}
          </template>
        </Column>
        
        <Column field="updatedAt" header="Updated" :sortable="true">
          <template #body="{ data }">
            {{ formatDate(data.updatedAt) }}
          </template>
        </Column>
        
        <Column field="actions" header="Actions">
          <template #body="{ data }">
            <div class="flex gap-2">
              <Button icon="pi pi-eye" severity="info" text rounded aria-label="View Letter"
                     @click="viewLetterDetails(data)" />
              
              <Button v-if="data.status === 'DRAFT' || data.status === 'READY_TO_SEND'" 
                     icon="pi pi-send" severity="success" text rounded aria-label="Send Letter"
                     @click="sendLetter(data)" />
              
              <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Delete Letter"
                     @click="deleteLetter(data)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Upload Dialog -->
    <Dialog v-model:visible="uploadDialog" header="Upload New Letter" :style="{ width: '500px' }" 
           :modal="true" :closable="!isUploading" :closeOnEscape="!isUploading">
      <div class="grid">
        <div class="col-12 mb-3">
          <div class="field">
            <label for="letterTitle" class="font-medium mb-2 block">Letter Title</label>
            <InputText v-model="newLetterTitle" id="letterTitle" class="w-full" 
                      placeholder="Enter a title for your letter" />
          </div>
        </div>
        
        <div class="col-12 mb-3">
          <div class="field">
            <label for="pdfFile" class="font-medium mb-2 block">PDF File</label>
            <FileUpload mode="basic" accept="application/pdf" :maxFileSize="10000000" 
                       chooseLabel="Choose PDF" class="w-full" :auto="false" 
                       @select="onFileSelect" :disabled="isUploading"
                       :fileLimit="1" />
            <small class="text-surface-500">Max file size: 10MB</small>
          </div>
        </div>
        
        <div v-if="isUploading" class="col-12 mb-3">
          <ProgressBar :value="uploadProgress" class="h-2" />
          <small class="block text-center mt-2">Uploading: {{ uploadProgress }}%</small>
        </div>
      </div>
      
      <template #footer>
        <Button label="Cancel" icon="pi pi-times" severity="secondary" text @click="closeUploadDialog" 
               :disabled="isUploading" />
        <Button label="Upload" icon="pi pi-upload" @click="uploadLetter" :loading="isUploading" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>

</style> 