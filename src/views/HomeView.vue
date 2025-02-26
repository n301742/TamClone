<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Chart from 'primevue/chart'

const router = useRouter()

// Sample data for the chart
const chartData = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June'],
  datasets: [
    {
      label: 'Letters Sent',
      data: [12, 19, 13, 15, 12, 13],
      borderColor: '#4F46E5',
      tension: 0.4
    }
  ]
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 5
      }
    }
  }
}

// Sample statistics
const stats = [
  { label: 'Letters Sent', value: '84', icon: 'pi pi-envelope', color: 'bg-blue-100 text-blue-700' },
  { label: 'In Transit', value: '12', icon: 'pi pi-clock', color: 'bg-yellow-100 text-yellow-700' },
  { label: 'Delivered', value: '72', icon: 'pi pi-check-circle', color: 'bg-green-100 text-green-700' }
]

// Quick actions
const quickActions = [
  { label: 'Send New Letter', icon: 'pi pi-plus', action: () => router.push('/send') },
  { label: 'View History', icon: 'pi pi-history', action: () => router.push('/history') },
  { label: 'Settings', icon: 'pi pi-cog', action: () => router.push('/settings') }
]
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Welcome Section -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Welcome back!</h1>
          <p class="text-gray-600">Here's what's happening with your letters.</p>
        </div>
        <Button label="Send New Letter" icon="pi pi-plus" @click="router.push('/send')" />
      </div>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card v-for="stat in stats" :key="stat.label" class="shadow-sm">
          <template #content>
            <div class="flex items-center space-x-4">
              <div :class="['p-3 rounded-lg', stat.color]">
                <i :class="[stat.icon, 'text-xl']"></i>
              </div>
              <div>
                <h3 class="text-2xl font-semibold">{{ stat.value }}</h3>
                <p class="text-gray-600">{{ stat.label }}</p>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Chart -->
      <Card class="shadow-sm">
        <template #title>
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Letters Overview</h3>
            <Button label="View Details" link @click="router.push('/history')" />
          </div>
        </template>
        <template #content>
          <div class="h-[300px]">
            <Chart type="line" :data="chartData" :options="chartOptions" />
          </div>
        </template>
      </Card>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card v-for="action in quickActions" :key="action.label" class="shadow-sm cursor-pointer hover:shadow-md transition-shadow" @click="action.action">
          <template #content>
            <div class="flex items-center space-x-4">
              <i :class="[action.icon, 'text-xl text-primary-600']"></i>
              <span class="font-medium">{{ action.label }}</span>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </AppLayout>
</template> 