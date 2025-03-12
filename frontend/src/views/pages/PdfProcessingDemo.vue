<script setup lang="ts">
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import PdfUploader from '../../components/PdfUploader.vue';
import type { AddressExtraction } from '../../services/api';

const extractedAddress = ref<AddressExtraction | null>(null);
const uploadedLetterId = ref<string | null>(null);
const toast = useToast();

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

const handleUploadSuccess = (result: { id: string, addressExtraction?: AddressExtraction }) => {
  console.log('🎉 PdfProcessingDemo received upload success:', result);
  uploadedLetterId.value = result.id;
  
  if (result.addressExtraction) {
    extractedAddress.value = result.addressExtraction;
  }
};

const handleUploadError = (error: any) => {
  console.error('🛑 PdfProcessingDemo upload error:', error);
  uploadedLetterId.value = null;
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
                <li class="mb-2">The address components are parsed (name, street, postal code, city)</li>
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
                <li class="mb-2">The address should include postal code, city and country</li>
                <li>Avoid decorative fonts that might reduce OCR accuracy</li>
              </ul>
            </AccordionTab>
          </Accordion>
        </div>
      </div>
      
      <!-- Right Column: Address Extraction Results -->
      <div class="md:w-1/3 flex justify-content-end">
        <!-- Address Extraction Results (Moved from left column) -->
        <div v-if="extractedAddress" class="card p-4 w-85 ml-auto">
          <div class="flex align-items-center mb-3 relative">
            <h6 class="text-xl font-medium m-0">Address Extraction Results</h6>
            <Tag :value="confidencePercentage" 
              :severity="extractedAddress.confidence >= 0.8 ? 'success' : extractedAddress.confidence >= 0.5 ? 'warning' : 'danger'"
              class="confidence-tag" />
          </div>
          
          <Divider class="my-3" />
          
          <div class="mb-4">
            <span class="block font-medium mb-2">Extracted Text:</span>
            <div class="p-3 border-1 border-round surface-ground">
              <pre class="m-0 font-medium text-color">{{ extractedAddress.rawText }}</pre>
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
        <div v-if="!extractedAddress" class="card p-4 flex flex-column align-items-center justify-content-center" style="min-height: 300px;">
          <i class="pi pi-search-plus text-6xl mb-4 text-color-secondary"></i>
          <h6 class="text-xl font-medium mb-2 text-center">No Address Data Yet</h6>
          <p class="text-color-secondary text-center">
            Upload a PDF document to extract address information. The extracted data will appear here.
          </p>
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
</style> 