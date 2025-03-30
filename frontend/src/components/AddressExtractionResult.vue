<script setup lang="ts">
import { computed } from 'vue';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import Button from 'primevue/button';
import Card from 'primevue/card';
import type { AddressExtraction } from '../services/api';

// Component props
const props = defineProps<{
  extractedAddress: AddressExtraction | null;
  isScannedPdfDetected: boolean;
  scannedPdfError: any | null;
}>();

// Define events
const emit = defineEmits<{
  (e: 'parse-name', name: string): void;
}>();

// Format confidence as percentage
const formattedConfidence = computed(() => {
  if (!props.extractedAddress || typeof props.extractedAddress.confidence !== 'number') {
    return '0%';
  }
  return `${Math.round(props.extractedAddress.confidence * 100)}%`;
});

// Determine validation icon class based on validation result
const zipValidationIconClass = computed(() => {
  if (!props.extractedAddress?.zipValidationDetails) return 'pi pi-question-circle text-gray-500';
  return props.extractedAddress.zipValidationDetails.matchFound 
    ? 'pi pi-check-circle text-green-500' 
    : 'pi pi-times-circle text-red-500';
});

const streetValidationIconClass = computed(() => {
  if (!props.extractedAddress?.streetValidationDetails) return 'pi pi-question-circle text-gray-500';
  return props.extractedAddress.streetValidationDetails.matchFound 
    ? 'pi pi-check-circle text-green-500' 
    : 'pi pi-times-circle text-red-500';
});

// Helper function to extract name from address
const extractAddressName = () => {
  const address = props.extractedAddress;
  if (!address) return '';
  
  // Combine all name parts that may be available
  const nameParts = [
    address.academicTitle,
    address.firstName,
    address.lastName
  ].filter(Boolean);
  
  if (nameParts.length > 0) {
    return nameParts.join(' ');
  }
  
  // Fallback if no structured name parts are available
  return address.name || '';
};

// Extract and parse postal code
const extractPostalCode = (rawText: string | undefined): string => {
  if (!rawText) return '';
  
  // Simple regex to extract postal codes (5 digits for German postal codes)
  const postalCodeMatch = rawText.match(/\b\d{5}\b/);
  return postalCodeMatch ? postalCodeMatch[0] : '';
};

// Function to trigger name parsing
const parseNameComponents = () => {
  const nameValue = extractAddressName();
  if (nameValue) {
    emit('parse-name', nameValue);
  }
};
</script>

<template>
  <div class="address-extraction-result">
    <!-- Show address extraction results if available -->
    <div v-if="extractedAddress">
      <Panel header="Extracted Address Information" class="mb-3">
        <template #icons>
          <Tag v-if="extractedAddress" :value="formattedConfidence" severity="info" />
        </template>
        
        <div class="p-2">
          <Card class="mb-3">
            <template #content>
              <table class="address-table">
                <tbody>
                  <tr>
                    <td class="address-label">Name:</td>
                  </tr>
                  <tr>
                    <td class="address-value">
                      <div class="flex align-items-center" style="gap: 0.5rem;">
                        <span>{{ extractAddressName() }}</span>
                        <Button
                          v-if="extractedAddress.name && (!extractedAddress.firstName || !extractedAddress.lastName)"
                          icon="pi pi-user-edit"
                          class="p-button-rounded p-button-text p-button-sm"
                          @click="parseNameComponents"
                          title="Parse name components"
                        />
                      </div>
                    </td>
                  </tr>
                  
                  <tr v-if="extractedAddress.street">
                    <td class="address-label">Street:</td>
                  </tr>
                  <tr v-if="extractedAddress.street">
                    <td class="address-value">
                      <div class="flex align-items-center" style="gap: 0.5rem;">
                        <span>{{ extractedAddress.street }}</span>
                        <i :class="streetValidationIconClass" title="Street validation"></i>
                      </div>
                    </td>
                  </tr>
                  
                  <tr v-if="extractedAddress.city">
                    <td class="address-label">City:</td>
                  </tr>
                  <tr v-if="extractedAddress.city">
                    <td class="address-value">{{ extractedAddress.city }}</td>
                  </tr>
                  
                  <tr v-if="extractedAddress.postalCode">
                    <td class="address-label">ZIP Code:</td>
                  </tr>
                  <tr v-if="extractedAddress.postalCode">
                    <td class="address-value">
                      <div class="flex align-items-center" style="gap: 0.5rem;">
                        <span>{{ extractedAddress.postalCode }}</span>
                        <i :class="zipValidationIconClass" title="ZIP validation"></i>
                      </div>
                    </td>
                  </tr>
                  
                  <tr v-if="extractedAddress.country">
                    <td class="address-label">Country:</td>
                  </tr>
                  <tr v-if="extractedAddress.country">
                    <td class="address-value">{{ extractedAddress.country }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
          </Card>
          
          <!-- Validation suggestions -->
          <div v-if="extractedAddress.zipValidationDetails && !extractedAddress.zipValidationDetails.matchFound" class="mb-3">
            <Message severity="warn" :closable="false">
              <span class="font-semibold">ZIP Code validation failed:</span>
              <div v-if="extractedAddress.zipValidationDetails.suggestedCity">
                <div>Suggestion:</div>
                <ul class="m-0 pl-4">
                  <li>{{ extractedAddress.zipValidationDetails.suggestedCity }}</li>
                </ul>
              </div>
            </Message>
          </div>
          
          <div v-if="extractedAddress.streetValidationDetails && !extractedAddress.streetValidationDetails.matchFound" class="mb-3">
            <Message severity="warn" :closable="false">
              <span class="font-semibold">Street validation failed:</span>
              <div v-if="extractedAddress.streetValidationDetails.suggestedStreet">
                <div>Suggestion:</div>
                <ul class="m-0 pl-4">
                  <li>{{ extractedAddress.streetValidationDetails.suggestedStreet }}</li>
                </ul>
              </div>
            </Message>
          </div>
        </div>
      </Panel>
    </div>
    
    <!-- Show a message for scanned PDFs -->
    <div v-else-if="isScannedPdfDetected">
      <Message severity="warn" class="mb-3" :closable="false">
        <div class="flex flex-column gap-2">
          <span class="font-semibold">Scanned PDF Detected</span>
          <p class="m-0">This appears to be a scanned document. Address extraction might be limited.</p>
          <p class="m-0" v-if="scannedPdfError?.message">{{ scannedPdfError.message }}</p>
        </div>
      </Message>
    </div>
    
    <!-- Empty state when no extraction is available -->
    <div v-else>
      <Panel header="Address Information" class="mb-3">
        <div class="p-3 text-center text-gray-500">
          <i class="pi pi-file-pdf text-4xl mb-3"></i>
          <p class="m-0">Upload a document to extract address information.</p>
        </div>
      </Panel>
    </div>
  </div>
</template>

<style scoped>
.address-extraction-result {
  height: 100%;
}

/* Add some hover effects for interactive elements */
button.p-button-text:hover {
  background-color: var(--surface-hover);
}

/* Address table styling */
.address-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.5rem;
}

.address-label {
  font-weight: bold;
  color: var(--text-color);
  padding: 0.5rem 0 0 0;
  font-size: 1.1rem;
}

.address-value {
  padding: 0 0 1rem 0;
}
</style> 