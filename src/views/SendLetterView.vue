<script setup lang="ts">
import { ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import Card from 'primevue/card'
import FileUpload from 'primevue/fileupload'
import Steps from 'primevue/steps'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'

const toast = useToast()
const activeStep = ref(0)
const uploadedFile = ref<File | null>(null)

const steps = [
  { label: 'Upload Letter', icon: 'pi pi-upload' },
  { label: 'Review Details', icon: 'pi pi-file' },
  { label: 'Confirm & Send', icon: 'pi pi-check' }
]

const handleUpload = (event: any) => {
  const file = event.files[0]
  uploadedFile.value = file
  
  toast.add({
    severity: 'success',
    summary: 'File Uploaded',
    detail: `Successfully uploaded ${file.name}`,
    life: 3000
  })

  // Move to next step
  activeStep.value = 1
}

const handleSend = () => {
  // Here we would handle the actual sending process
  toast.add({
    severity: 'success',
    summary: 'Letter Sent',
    detail: 'Your letter has been queued for processing',
    life: 3000
  })

  // Move to final step
  activeStep.value = 2
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Send a Letter</h1>
        <p class="text-gray-600">Upload your letter in PDF format and we'll handle the delivery.</p>
      </div>

      <!-- Steps -->
      <Steps :model="steps" :activeIndex="activeStep" />

      <!-- Content -->
      <Card class="shadow-sm">
        <template #content>
          <!-- Step 1: Upload -->
          <div v-if="activeStep === 0" class="space-y-4">
            <h3 class="text-lg font-semibold">Upload Your Letter</h3>
            <p class="text-gray-600 mb-4">
              Please upload your letter in PDF format. Make sure the recipient's address is clearly visible
              in the address window area.
            </p>
            <FileUpload
              mode="basic"
              name="letter"
              accept="application/pdf"
              :maxFileSize="10000000"
              @upload="handleUpload"
              :auto="true"
              chooseLabel="Select PDF"
              class="w-full"
            />
            <div class="text-sm text-gray-500">
              <p>Requirements:</p>
              <ul class="list-disc list-inside ml-4 space-y-1">
                <li>PDF format only</li>
                <li>Maximum file size: 10MB</li>
                <li>DIN A4 format</li>
                <li>Address must be in the standard window position</li>
              </ul>
            </div>
          </div>

          <!-- Step 2: Review -->
          <div v-else-if="activeStep === 1" class="space-y-4">
            <h3 class="text-lg font-semibold">Review Details</h3>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-gray-600">File Name</p>
                  <p class="font-medium">{{ uploadedFile?.name }}</p>
                </div>
                <div>
                  <p class="text-sm text-gray-600">File Size</p>
                  <p class="font-medium">{{ Math.round(uploadedFile?.size / 1024) }} KB</p>
                </div>
              </div>
            </div>
            <div class="flex justify-end space-x-3">
              <Button 
                label="Back" 
                severity="secondary" 
                text 
                @click="activeStep = 0"
              />
              <Button 
                label="Send Letter" 
                icon="pi pi-send"
                @click="handleSend"
              />
            </div>
          </div>

          <!-- Step 3: Confirmation -->
          <div v-else class="text-center space-y-4">
            <i class="pi pi-check-circle text-green-500 text-5xl"></i>
            <h3 class="text-lg font-semibold">Letter Sent Successfully</h3>
            <p class="text-gray-600">
              Your letter has been queued for processing. You can track its status in the letters history.
            </p>
            <div class="flex justify-center space-x-3">
              <Button 
                label="Send Another Letter" 
                icon="pi pi-plus"
                @click="activeStep = 0"
              />
              <Button 
                label="View History" 
                icon="pi pi-history"
                severity="secondary"
                text
              />
            </div>
          </div>
        </template>
      </Card>
    </div>
    <Toast />
  </AppLayout>
</template> 