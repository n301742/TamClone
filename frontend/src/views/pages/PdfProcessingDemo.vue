<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';
import PdfUploader from '../../components/PdfUploader.vue';
import type { AddressExtraction } from '../../services/api';

const extractedAddress = ref<AddressExtraction | null>(null);
const uploadedLetterId = ref<string | null>(null);
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
    } else if (result.data && result.data.id) {
      letterId = result.data.id;
    }
  }
  
  console.log('🔍 Extracted address data:', addressData);
  console.log('🔍 Extracted letter ID:', letterId);
  
  if (addressData) {
    console.log('📋 Setting extractedAddress.value with:', JSON.stringify(addressData));
    extractedAddress.value = addressData;
    console.log('📋 extractedAddress.value after assignment:', extractedAddress.value);
  } else {
    console.warn('⚠️ No address extraction data found in any location of the result');
  }
  
  if (letterId) {
    uploadedLetterId.value = letterId;
  }
};

const handleUploadError = (error: any) => {
  console.error('🛑 PdfProcessingDemo upload error:', error);
  uploadedLetterId.value = null;
};

// New handler for file selection to reset the address extraction data
const handleFileSelected = () => {
  console.log('📄 PdfProcessingDemo: New file selected, resetting extraction data');
  extractedAddress.value = null;
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
</script>

<template>
  <Fluid>
    <!-- Page Header -->
    <div class="card mb-4">
      <h5 class="text-2xl font-bold mb-2">PDF Processing with Address Extraction</h5>
      <p class="text-color-secondary line-height-3">
        Upload a PDF document to automatically extract and validate address information using our advanced processing system.
        The service analyzes the document according to standard formats (DIN 5008, DIN 676) to identify recipient addresses.
      </p>
    </div>
    
    <!-- Main Content Area -->
    <div class="flex flex-col md:flex-row gap-4">
      <!-- Left Column: Upload + Information -->
      <div class="md:w-2/3">
        <!-- Document Upload Section -->
        <div class="card p-4 mb-4">
          <h6 class="text-xl font-medium mb-3">Upload Document</h6>
          <PdfUploader 
            @address-extracted="handleAddressExtracted"
            @upload-success="handleUploadSuccess" 
            @upload-error="handleUploadError"
            @file-selected="handleFileSelected"
          />
        </div>
        
        <!-- Information Card (Moved from right column) -->
        <div class="card p-4 mb-4">
          <h6 class="text-xl font-medium mb-3">Information</h6>
          
          <!-- How It Works Section -->
          <Accordion :activeIndex="0" class="mb-4">
            <AccordionTab header="How It Works">
              <ol class="m-0 p-0 pl-4 line-height-3 text-color-secondary">
                <li class="mb-2">Upload a PDF document containing an address in the standard format</li>
                <li class="mb-2">Our system automatically extracts text from the address window area</li>
                <li class="mb-2">The address components are parsed (name, street, ZIP, city)</li>
                <li class="mb-2">ZIP code and city are validated against our database</li>
                <li class="mb-2">Street name is validated against available street data</li>
                <li>A confidence score is calculated based on validation results</li>
              </ol>
            </AccordionTab>
            
            <!-- Supported Formats Section -->
            <AccordionTab header="Supported Formats">
              <ul class="m-0 p-0 pl-4 line-height-3 text-color-secondary">
                <li class="mb-2">DIN 5008 Form A (German)</li>
                <li class="mb-2">DIN 5008 Form B (German)</li>
                <li class="mb-2">DIN 676 Type A (German/Austrian)</li>
                <li class="mb-2">Formats with standard address window positioning</li>
              </ul>
            </AccordionTab>
            
            <!-- Tips Section -->
            <AccordionTab header="Tips for Best Results">
              <ul class="m-0 p-0 pl-4 line-height-3 text-color-secondary">
                <li class="mb-2">Ensure the PDF is not password protected</li>
                <li class="mb-2">Use standard letter formats with properly positioned address windows</li>
                <li class="mb-2">For highest accuracy, use high-quality, non-scanned PDFs</li>
                <li class="mb-2">The address should include ZIP, city and country</li>
                <li>Avoid decorative fonts that might reduce OCR accuracy</li>
              </ul>
            </AccordionTab>
          </Accordion>
        </div>
      </div>
      
      <!-- Right Column: Address Extraction Results -->
      <div class="md:w-1/3 flex justify-content-end">
        <!-- Address Extraction Results (Moved from left column) -->
        <div v-if="extractedAddress" class="card p-4 w-full">
          <div class="flex align-items-center mb-3 relative">
            <h6 class="text-xl font-medium m-0">Address Extraction Results</h6>
            <Tag :value="confidencePercentage" 
              :severity="extractedAddress.confidence >= 0.8 ? 'success' : extractedAddress.confidence >= 0.5 ? 'warning' : 'danger'"
              class="confidence-tag" />
          </div>
          
          <Divider class="my-3" />
          
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
            <div class="col-12 md:col-6">
              <Panel header="ZIP Code Validation" toggleable :class="{'custom-panel-margin': true}">
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
            <div class="col-12 md:col-6">
              <Panel header="Street Validation" toggleable :class="{'custom-panel-margin': true}">
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
        </div>

        <!-- Placeholder message when no address extraction results are available -->
        <div v-if="!extractedAddress" class="card p-4 w-full" style="min-height: 300px;">
          <div class="flex flex-col items-center justify-center h-full space-y-4">
            <i class="pi pi-search-plus text-6xl text-color-secondary"></i>
            <div class="text-center">
              <h6 class="text-xl font-medium mb-2">No Address Data Yet</h6>
              <p class="text-color-secondary mb-2">
                Upload a PDF document to extract address information.
              </p>
              <p class="text-color-secondary">
                The extracted data will appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Fluid>
</template>

<style scoped>
/* Style for extracted text */
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: var(--font-family);
  line-height: 1.5;
}

/* Confidence tag positioning */
.confidence-tag {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

/* Custom styles for validation panels */
.custom-panel-margin {
  margin-bottom: 0.75rem;
}

.validation-icon-success {
  color: #16a34a;
  margin-right: 0.5rem;
}

.validation-icon-error {
  color: #dc2626;
  margin-right: 0.5rem;
}

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
  color: #3b82f6;
  margin-right: 0.5rem;
}

.suggestion-label {
  font-weight: 500;
  margin-right: 0.5rem;
}

/* Custom width class for the extraction results */
.w-85 {
  width: 85%;
}

/* Styles for the address details */
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