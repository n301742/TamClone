<script setup lang="ts">
import { ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

interface Letter {
  id: string
  fileName: string
  recipient: string
  sentDate: string
  status: 'processing' | 'in_transit' | 'delivered' | 'failed'
  trackingNumber?: string
}

type Status = Letter['status']

// Sample data - replace with actual API call
const letters = ref<Letter[]>([
  {
    id: '1',
    fileName: 'Invoice_2024_001.pdf',
    recipient: 'John Doe',
    sentDate: '2024-02-24',
    status: 'delivered',
    trackingNumber: 'TR123456789'
  },
  {
    id: '2',
    fileName: 'Contract_2024_002.pdf',
    recipient: 'Jane Smith',
    sentDate: '2024-02-23',
    status: 'in_transit',
    trackingNumber: 'TR123456790'
  },
  {
    id: '3',
    fileName: 'Report_2024_003.pdf',
    recipient: 'Bob Johnson',
    sentDate: '2024-02-22',
    status: 'processing'
  }
])

const statusSeverity: Record<Status, string> = {
  processing: 'info',
  in_transit: 'warning',
  delivered: 'success',
  failed: 'danger'
}

const statusLabels: Record<Status, string> = {
  processing: 'Processing',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  failed: 'Failed'
}

const handleView = (letter: Letter) => {
  // Implement view details functionality
  console.log('View letter:', letter)
}

const handleTrack = (letter: Letter) => {
  // Implement tracking functionality
  console.log('Track letter:', letter)
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Letters History</h1>
          <p class="text-gray-600">Track and manage your sent letters.</p>
        </div>
      </div>

      <!-- Letters Table -->
      <DataTable 
        :value="letters" 
        :paginator="true" 
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        class="p-datatable-sm shadow-sm bg-white rounded-lg"
        stripedRows
        responsiveLayout="scroll"
      >
        <Column field="fileName" header="File Name" sortable>
          <template #body="slotProps: { data: Letter }">
            <div class="flex items-center">
              <i class="pi pi-file-pdf text-red-500 mr-2"></i>
              {{ slotProps.data.fileName }}
            </div>
          </template>
        </Column>
        <Column field="recipient" header="Recipient" sortable></Column>
        <Column field="sentDate" header="Sent Date" sortable>
          <template #body="slotProps: { data: Letter }">
            {{ new Date(slotProps.data.sentDate).toLocaleDateString() }}
          </template>
        </Column>
        <Column field="status" header="Status" sortable>
          <template #body="slotProps: { data: Letter }">
            <Tag 
              :value="statusLabels[slotProps.data.status]" 
              :severity="statusSeverity[slotProps.data.status]"
            />
          </template>
        </Column>
        <Column field="trackingNumber" header="Tracking Number">
          <template #body="slotProps: { data: Letter }">
            {{ slotProps.data.trackingNumber || 'N/A' }}
          </template>
        </Column>
        <Column header="Actions" :exportable="false" style="min-width: 8rem">
          <template #body="slotProps: { data: Letter }">
            <div class="flex gap-2">
              <Button 
                icon="pi pi-eye" 
                text 
                rounded 
                @click="handleView(slotProps.data)"
                tooltip="View Details"
              />
              <Button 
                v-if="slotProps.data.trackingNumber"
                icon="pi pi-map-marker" 
                text 
                rounded 
                @click="handleTrack(slotProps.data)"
                tooltip="Track Letter"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </AppLayout>
</template> 