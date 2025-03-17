<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';
import PdfUploader from '../../components/PdfUploader.vue';
import PdfAnnotator from '../../components/PdfAnnotator.vue';
import type { AddressExtraction } from '../../services/api';

// Import PrimeVue components
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Tab from 'primevue/tab';
import RadioButton from 'primevue/radiobutton';
import ToggleButton from 'primevue/togglebutton';
import Panel from 'primevue/panel';
import Divider from 'primevue/divider';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';

const extractedAddress = ref<AddressExtraction | null>(null);
const uploadedLetterId = ref<string | null>(null);
const isScannedPdfDetected = ref(false);
const scannedPdfError = ref<any>(null);
const toast = useToast();
const authStore = useAuthStore();
const router = useRouter();

// Check if API is connected
const isApiConnected = computed(() => authStore.apiConnected);

// Check if user is authenticated and redirect if not
const checkAuthentication = (): boolean => {
  // If user is not authenticated, redirect to login
  if (!authStore.isAuthenticated) {
    // Redirect to login
    router.push({ name: 'login' });
    toast.add({
      severity: 'info',
      summary: 'Authentication Required',
      detail: 'Please log in to access this page',
      life: 3000
    });
    return false; // User is not authenticated
  }
  return true; // User is authenticated
};

// Verify API connectivity when component mounts
onMounted(async () => {
  // First check authentication - redirect if not authenticated
  if (!checkAuthentication()) return;
  
  // Then check API connectivity
  if (!isApiConnected.value) {
    await authStore.checkApiConnectivity();
    
    if (!isApiConnected.value) {
      toast.add({
        severity: 'error',
        summary: 'Connection Error',
        detail: 'Unable to connect to the API. Using mock data for demonstration.',
        life: 5000
      });
    }
  }
});

// Computed properties for styling
const confidenceColor = computed(() => {
  if (!extractedAddress.value) return '';
  
  const score = extractedAddress.value.confidence;
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
});

// Format confidence as percentage
const confidencePercentage = computed(() => {
  if (!extractedAddress.value) return '0%';
  return `${Math.round(extractedAddress.value.confidence * 100)}%`;
});

// Compute icon classes
const zipValidIcon = computed(() => {
  if (!extractedAddress.value) return '';
  return extractedAddress.value.zipCodeValidation.matchFound ? 
    'pi pi-check-circle validation-icon-success' : 
    'pi pi-times-circle validation-icon-error';
});

const streetValidIcon = computed(() => {
  if (!extractedAddress.value) return '';
  return extractedAddress.value.streetValidation.matchFound ? 
    'pi pi-check-circle validation-icon-success' : 
    'pi pi-times-circle validation-icon-error';
});

const handleAddressExtracted = (data: AddressExtraction) => {
  console.log('📬 PdfProcessingDemo received address extraction:', data);
  extractedAddress.value = data;
  
  // Show a toast notification
  toast.add({
    severity: 'success',
    summary: 'Address Extracted',
    detail: `Address extracted with ${confidencePercentage.value} confidence`,
    life: 3000
  });
};

const handleUploadSuccess = (result: any) => {
  console.log('🎉 PdfProcessingDemo received upload success:', result);
  
  // Check if result has addressExtraction data
  console.log('🔍 Result contains addressExtraction?', !!result.addressExtraction);
  
  let addressData = null;
  let letterId = null;
  
  // Extract the relevant data based on the response structure
  if (result) {
    // If result has addressExtraction directly
    if (result.addressExtraction) {
      console.log('📋 Address extraction found directly in result');
      addressData = result.addressExtraction;
    } 
    // If result has a data property that contains addressExtraction
    else if (result.data && result.data.addressExtraction) {
      console.log('📋 Address extraction found in result.data');
      addressData = result.data.addressExtraction;
    }
    
    // Extract ID depending on where it's located
    if (result.id) {
      letterId = result.id;
    } else if (result.data && result.data.letter && result.data.letter.id) {
      letterId = result.data.letter.id;
    }
  }
  
  if (addressData) {
    console.log('📋 Setting extractedAddress.value with:', addressData);
    extractedAddress.value = addressData;
    console.log('📋 extractedAddress.value after assignment:', extractedAddress.value);
    
    // Show a toast notification
    toast.add({
      severity: 'success',
      summary: 'Address Extracted',
      detail: `Address extracted with ${confidencePercentage.value} confidence`,
      life: 3000
    });
  } else {
    console.warn('⚠️ No address extraction data in upload result');
  }
  
  if (letterId) {
    uploadedLetterId.value = letterId;
  }
};

const handleUploadError = (error: any) => {
  console.error('🛑 PdfProcessingDemo upload error:', error);
  uploadedLetterId.value = null;
  
  // Check if this is a scanned PDF error
  if (error.type === 'scanned-pdf') {
    console.log('📑 Handling scanned PDF error:', error);
    isScannedPdfDetected.value = true;
    scannedPdfError.value = error;
    
    // Show a detailed toast with suggestions
    toast.add({
      severity: 'info',
      summary: 'Address Extraction Not Available',
      detail: 'We cannot extract data from scanned PDFs. Please try a text-based PDF or enter the address manually.',
      life: 8000
    });
  } else {
    // Reset scanned PDF flag for other errors
    isScannedPdfDetected.value = false;
    scannedPdfError.value = null;
  }
};

// Form type selection
const selectedFormType = ref<'formA' | 'formB' | 'din676' | 'custom'>('formB');
const showAnnotator = ref(false);
const pdfUrl = ref<string | null>(null);
const customPositionInitialized = ref(false);

// Update form type items to include Custom option
const formTypeItems = [
  { name: 'DIN 5008 Form A', value: 'formA' },
  { name: 'DIN 5008 Form B', value: 'formB' },
  { name: 'DIN 676 Type A', value: 'din676' },
  { name: 'Custom', value: 'custom' }
];

// Computed property to determine if repositioning is allowed
const allowAnnotationRepositioning = computed(() => {
  return selectedFormType.value === 'custom';
});

// Watch for form type changes to initialize Custom position when first selected
watch(() => selectedFormType.value, (newValue) => {
  if (newValue === 'custom' && !customPositionInitialized.value) {
    // Initialize custom position with Form B coordinates
    customPositionInitialized.value = true;
    
    // Show a hint toast to the user
    toast.add({
      severity: 'info',
      summary: 'Custom Positioning Enabled',
      detail: 'You can now drag the address window to reposition it. Starting with DIN 5008 Form B layout.',
      life: 3000
    });
  }
});

// Handle annotation moved event
const handleAnnotationMoved = (coordinates: any) => {
  console.log('📐 Address window annotation moved:', coordinates);
  
  // Here you could store these custom coordinates and send them to the backend
  // for custom address extraction if needed
  toast.add({
    severity: 'info',
    summary: 'Address Window Repositioned',
    detail: 'The custom position will be used for future extraction attempts',
    life: 3000
  });
};

// Reference to the PDF uploader component
const pdfUploadRef = ref<any>(null);

// Update handleFileSelected to show annotator when a file is selected
const handleFileSelected = (event: any) => {
  if (event && event.files && event.files.length > 0) {
    const file = event.files[0];
    
    // Generate a URL for the PDF
    if (pdfUrl.value) {
      URL.revokeObjectURL(pdfUrl.value);
    }
    pdfUrl.value = URL.createObjectURL(file);
    showAnnotator.value = true;
  }
};

// New function to extract address name
const extractAddressName = (rawText: string): string => {
  if (!rawText) return 'N/A';
  
  // Typically, the name is in the first line of the address
  const lines = rawText.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    return lines[0].trim();
  }
  
  return 'N/A';
};

// New function to extract ZIP
const extractPostalCode = (rawText: string): string => {
  if (!rawText) return 'N/A';
  
  // Regex to find German (5 digits) or Austrian (4 digits) ZIP codes
  const postalCodeRegex = /\b(\d{4,5})\b/;
  const match = rawText.match(postalCodeRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return 'N/A';
};

// Add activeTabIndex ref
const activeTabIndex = ref("0");
</script>

<template>
  <div class="grid">
    <!-- PDF Processing Container -->
    <div class="col-12">
      <div class="card">
        <div class="flex align-items-center justify-content-between mb-4">
          <h5 class="m-0">PDF Processing Demo</h5>
        </div>
        
        <!-- Form Type Selection -->
        <Card class="mb-4">
          <template #title>
            <span>Form Standard Selection</span>
          </template>
          <template #content>
            <div class="flex justify-content-center">
              <SelectButton 
                v-model="selectedFormType"
                :options="formTypeItems" 
                optionLabel="name" 
                optionValue="value"
                aria-labelledby="form-standard-selection"
              />
            </div>
            <small class="block text-center text-color-secondary mt-3">
              <i class="pi pi-info-circle mr-1"></i>
              Select the appropriate form standard for your document
              <span v-if="selectedFormType === 'custom'" class="block mt-2">
                <i class="pi pi-arrows-alt text-primary mr-1"></i>
                Custom mode: You can drag the address window annotation to position it exactly where you need.
              </span>
            </small>
          </template>
        </Card>
        
        <!-- Main Content Grid -->
        <div class="grid">
          <!-- Left Column: PDF Upload -->
          <div class="col-12 md:col-8">
            <!-- PDF Upload Section -->
            <Card>
              <template #title>
                Upload Document
              </template>
              <template #content>
                <PdfUploader 
                  ref="pdfUploadRef"
                  :formType="selectedFormType === 'custom' ? 'formB' : selectedFormType"
                  @address-extracted="handleAddressExtracted"
                  @upload-success="handleUploadSuccess" 
                  @upload-error="handleUploadError"
                  @file-selected="handleFileSelected"
                  :showPdfPreview="false"
                />
                
                <!-- PDF Annotator Component (shows when a PDF is selected) -->
                <div v-if="showAnnotator && pdfUrl" class="mt-4">
                  <div class="flex justify-content-between align-items-center mb-2">
                    <h6 class="text-sm font-medium">Address Window Visualization</h6>
                    <Tag v-if="selectedFormType === 'custom'" severity="info" value="Custom Positioning Enabled" />
                  </div>
                  
                  <PdfAnnotator
                    :source="pdfUrl"
                    :formType="selectedFormType === 'custom' ? 'formB' : selectedFormType"
                    :allowReposition="allowAnnotationRepositioning"
                    @annotation-moved="handleAnnotationMoved"
                  />
                  
                  <small class="block text-color-secondary mt-2">
                    <i class="pi pi-info-circle mr-1"></i> 
                    This visualization shows where the address information will be extracted.
                    <span v-if="selectedFormType === 'custom'"> Drag the blue rectangle to reposition.</span>
                  </small>
                </div>
              </template>
            </Card>
            
            <!-- Information Tabs -->
            <Card class="mt-3">
              <template #content>
                <Tabs v-model:value="activeTabIndex">
                  <TabList>
                    <Tab value="0">How It Works</Tab>
                    <Tab value="1">Supported Formats</Tab>
                    <Tab value="2">Tips for Best Results</Tab>
                  </TabList>
                  <TabPanels>
                    <!-- How It Works Section -->
                    <TabPanel value="0">
                      <ol class="m-0 p-0 pl-4 line-height-3 text-color-secondary">
                        <li class="mb-2">Upload a PDF document containing an address in the standard format</li>
                        <li class="mb-2">Our system automatically extracts text from the address window area</li>
                        <li class="mb-2">The address components are parsed (name, street, ZIP, city)</li>
                        <li class="mb-2">ZIP code and city are validated against our database</li>
                        <li class="mb-2">Street name is validated against available street data</li>
                        <li>A confidence score is calculated based on validation results</li>
                      </ol>
                    </TabPanel>
                    
                    <!-- Supported Formats Section -->
                    <TabPanel value="1">
                      <ul class="m-0 p-0 pl-4 line-height-3 text-color-secondary">
                        <li class="mb-2">DIN 5008 Form A (German)</li>
                        <li class="mb-2">DIN 5008 Form B (German)</li>
                        <li class="mb-2">DIN 676 Type A (German/Austrian)</li>
                        <li class="mb-2">Formats with standard address window positioning</li>
                      </ul>
                    </TabPanel>
                    
                    <!-- Tips Section -->
                    <TabPanel value="2">
                      <ul class="m-0 p-0 pl-4 line-height-3 text-color-secondary">
                        <li class="mb-2">Ensure the PDF is not password protected</li>
                        <li class="mb-2">Use standard letter formats with properly positioned address windows</li>
                        <li class="mb-2">For highest accuracy, use high-quality, non-scanned PDFs</li>
                        <li class="mb-2">The address should include ZIP, city and country</li>
                        <li>Avoid decorative fonts that might reduce OCR accuracy</li>
                      </ul>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </template>
            </Card>
          </div>
          
          <!-- Right Column: Address Extraction Results -->
          <div class="col-12 md:col-4">
            <!-- Address Extraction Results -->
            <Card v-if="extractedAddress" class="h-full">
              <template #title>
                <div class="flex align-items-center justify-content-between">
                  <span>Address Extraction Results</span>
                  <Tag :value="confidencePercentage" 
                    :severity="extractedAddress.confidence >= 0.8 ? 'success' : extractedAddress.confidence >= 0.5 ? 'warning' : 'danger'"
                  />
                </div>
              </template>
              <template #content>
                <div class="mb-4">
                  <span class="block font-medium mb-2">Extracted Address:</span>
                  <div class="p-3 border-1 border-round surface-ground">
                    <div class="address-details">
                      <div class="address-row">
                        <span class="address-label">Name:</span>
                        <span class="address-value">{{ extractedAddress.name || extractAddressName(extractedAddress.rawText) }}</span>
                      </div>
                      <div class="address-row">
                        <span class="address-label">Street:</span>
                        <span class="address-value">{{ extractedAddress.street || extractedAddress.streetValidation.originalStreet }}</span>
                      </div>
                      <div class="address-row">
                        <span class="address-label">City:</span>
                        <span class="address-value">{{ extractedAddress.city || extractedAddress.zipCodeValidation.originalCity }}</span>
                      </div>
                      <div class="address-row">
                        <span class="address-label">ZIP:</span>
                        <span class="address-value">{{ extractedAddress.postalCode || extractPostalCode(extractedAddress.rawText) }}</span>
                      </div>
                      <div class="address-row">
                        <span class="address-label">Country:</span>
                        <span class="address-value">{{ extractedAddress.country || extractedAddress.zipCodeValidation.countryDetected }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="grid">
                  <!-- ZIP Code Validation -->
                  <div class="col-12">
                    <Panel header="ZIP Code Validation" toggleable>
                      <template #icons>
                        <div class="flex align-items-center ml-auto">
                          <i :class="zipValidIcon"></i>
                        </div>
                      </template>
                      <div class="validation-content">
                        <div class="validation-row">
                          <span class="validation-label">Country:</span>
                          <span class="validation-value">{{ extractedAddress.zipCodeValidation.countryDetected }}</span>
                        </div>
                        <div class="validation-row">
                          <span class="validation-label">Format:</span>
                          <span class="validation-value">{{ extractedAddress.zipCodeValidation.zipCodeFormat }}</span>
                        </div>
                        <div class="validation-row">
                          <span class="validation-label">City:</span>
                          <span class="validation-value">{{ extractedAddress.zipCodeValidation.originalCity }}</span>
                        </div>
                        
                        <div v-if="extractedAddress.zipCodeValidation.suggestedCity && extractedAddress.zipCodeValidation.suggestedCity !== extractedAddress.zipCodeValidation.originalCity" class="suggestion-container">
                          <div class="suggestion-content">
                            <i class="pi pi-info-circle suggestion-icon"></i>
                            <span class="suggestion-label">Suggested city:</span>
                            <span class="suggestion-value">{{ extractedAddress.zipCodeValidation.suggestedCity }}</span>
                          </div>
                        </div>
                      </div>
                    </Panel>
                  </div>
                  
                  <!-- Street Validation -->
                  <div class="col-12 mt-3">
                    <Panel header="Street Validation" toggleable>
                      <template #icons>
                        <div class="flex align-items-center ml-auto">
                          <i :class="streetValidIcon"></i>
                        </div>
                      </template>
                      <div class="validation-content">
                        <div class="validation-row">
                          <span class="validation-label">Street:</span>
                          <span class="validation-value">{{ extractedAddress.streetValidation.originalStreet }}</span>
                        </div>
                        
                        <div v-if="extractedAddress.streetValidation.suggestedStreet && extractedAddress.streetValidation.suggestedStreet !== extractedAddress.streetValidation.originalStreet" class="suggestion-container">
                          <div class="suggestion-content">
                            <i class="pi pi-info-circle suggestion-icon"></i>
                            <span class="suggestion-label">Suggested street:</span>
                            <span class="suggestion-value">{{ extractedAddress.streetValidation.suggestedStreet }}</span>
                          </div>
                        </div>
                      </div>
                    </Panel>
                  </div>
                </div>
              </template>
            </Card>
          
            <!-- Placeholder message when no address extraction results are available -->
            <Card v-if="!extractedAddress && !isScannedPdfDetected" class="h-full flex align-items-center justify-content-center" style="min-height: 300px;">
              <template #content>
                <div class="flex flex-column align-items-center text-center">
                  <i class="pi pi-search-plus text-6xl text-color-secondary mb-3"></i>
                  <h6 class="text-xl font-medium mb-2">No Address Data Yet</h6>
                  <p class="text-color-secondary mb-2">
                    Upload a PDF document to extract address information.
                  </p>
                  <p class="text-color-secondary">
                    The extracted data will appear here.
                  </p>
                </div>
              </template>
            </Card>
            
            <!-- Scanned PDF error message -->
            <Card v-if="isScannedPdfDetected" class="h-full">
              <template #title>
                <div class="flex align-items-center">
                  <i class="pi pi-file-pdf text-2xl text-yellow-500 mr-2"></i>
                  <span>Scanned PDF Detected</span>
                </div>
              </template>
              <template #content>
                <p class="text-color-secondary mb-3">
                  This appears to be a scanned document without extractable text. Our system can only extract addresses from text-based PDFs.
                </p>
                
                <div class="bg-yellow-50 p-3 border-round border-1 border-yellow-300">
                  <h6 class="font-medium text-yellow-700 mb-2">What's the difference?</h6>
                  <ul class="m-0 p-0 pl-4 text-yellow-700">
                    <li class="mb-2">
                      <strong>Text-based PDFs</strong> are created directly from applications like Word, Excel, or other software that generate PDFs with actual text elements.
                    </li>
                    <li>
                      <strong>Scanned PDFs</strong> are images of documents, so they don't contain actual text data that can be extracted.
                    </li>
                  </ul>
                </div>
                
                <h6 class="font-medium mt-3 mb-2">Alternatives:</h6>
                <ul class="m-0 p-0 pl-4">
                  <li class="mb-2">Try uploading a text-based PDF instead of a scan</li>
                  <li class="mb-2">Enter the recipient address manually using the form</li>
                  <li>Select an address from your address book</li>
                </ul>
              </template>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Style for extracted text */
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: var(--font-family);
  line-height: 1.5;
}

/* Validation icon styles */
.validation-icon-success {
  color: var(--green-500);
  margin-right: 0.5rem;
}

.validation-icon-error {
  color: var(--red-500);
  margin-right: 0.5rem;
}

/* Validation content styles */
.validation-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.validation-row {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.validation-label {
  font-weight: 500;
  width: 4rem;
  display: inline-block;
}

.validation-value {
  margin-left: 0.5rem;
}

/* Suggestion styles */
.suggestion-container {
  margin-top: 0.5rem;
}

.suggestion-content {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.25rem;
  background-color: var(--surface-100);
}

.suggestion-icon {
  color: var(--primary-color);
  margin-right: 0.5rem;
}

.suggestion-label {
  font-weight: 500;
  margin-right: 0.5rem;
}

/* Address details */
.address-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.address-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.address-label {
  font-weight: 600;
  min-width: 6rem;
  display: inline-block;
  color: var(--text-color-secondary);
}

.address-value {
  flex: 1;
  font-family: var(--font-family);
}
</style> 