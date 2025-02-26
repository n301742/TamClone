<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import type { MenuItem } from 'primevue/menuitem'
import Menubar from 'primevue/menubar'
import Sidebar from 'primevue/sidebar'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const isSidebarVisible = ref(false)

interface NavItem {
  label: string
  icon?: string
  command?: () => void
  class?: string
  separator?: boolean
}

const navigationItems = computed<NavItem[]>(() => [
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    command: () => router.push('/'),
    class: route.path === '/' ? 'bg-primary-50 text-primary-700' : ''
  },
  {
    label: 'Send Letter',
    icon: 'pi pi-envelope',
    command: () => router.push('/send'),
    class: route.path === '/send' ? 'bg-primary-50 text-primary-700' : ''
  },
  {
    label: 'Letters History',
    icon: 'pi pi-history',
    command: () => router.push('/history'),
    class: route.path === '/history' ? 'bg-primary-50 text-primary-700' : ''
  },
  {
    label: '',
    separator: true
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    command: () => router.push('/settings'),
    class: route.path === '/settings' ? 'bg-primary-50 text-primary-700' : ''
  }
])

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const handleNavigation = (item: NavItem) => {
  if (item.command) {
    item.command()
  }
}
</script>

<template>
  <div class="layout-wrapper">
    <!-- Top Navigation -->
    <header class="layout-topbar">
      <Menubar>
        <template #start>
          <Button 
            icon="pi pi-bars" 
            rounded
            text
            aria-label="Menu"
            @click="isSidebarVisible = true"
            class="md:hidden"
          />
          <div class="flex items-center gap-2 ml-2">
            <img src="/images/logo.svg" alt="BriefButler" class="h-8 w-auto" />
            <span class="text-xl font-semibold text-primary-900">BriefButler</span>
          </div>
        </template>
        <template #end>
          <div class="flex items-center gap-3">
            <Avatar 
              :image="authStore.user?.picture" 
              :label="authStore.user?.name?.charAt(0)" 
              shape="circle"
              class="bg-primary-100 text-primary-700"
            />
            <span class="hidden md:inline-block text-sm text-gray-700">
              {{ authStore.user?.name }}
            </span>
            <Button 
              icon="pi pi-sign-out" 
              rounded
              text
              aria-label="Sign Out"
              @click="handleLogout"
              v-tooltip.bottom="'Sign Out'"
            />
          </div>
        </template>
      </Menubar>
    </header>

    <div class="layout-container">
      <!-- Desktop Sidebar -->
      <aside class="layout-sidebar-desktop">
        <nav class="sidebar-nav">
          <div v-for="(item, i) in navigationItems" :key="i">
            <template v-if="item.separator">
              <div class="menu-separator" />
            </template>
            <template v-else>
              <Button 
                v-ripple
                :text="true"
                :class="['menu-item', item.class]"
                :icon="item.icon"
                :label="item.label"
                @click="handleNavigation(item)"
              />
            </template>
          </div>
        </nav>
      </aside>

      <!-- Mobile Sidebar -->
      <Sidebar 
        v-model:visible="isSidebarVisible"
        :modal="true"
        :dismissable="true"
        :showCloseIcon="true"
        position="left"
        class="sidebar-mobile"
      >
        <div class="mobile-menu-header">
          <img src="/images/logo.svg" alt="BriefButler" class="h-8 w-auto" />
          <span class="text-xl font-semibold text-primary-900">BriefButler</span>
        </div>
        <nav class="mobile-menu-content">
          <div v-for="(item, i) in navigationItems" :key="i">
            <template v-if="item.separator">
              <div class="menu-separator" />
            </template>
            <template v-else>
              <Button 
                v-ripple
                :text="true"
                :class="['menu-item', item.class]"
                :icon="item.icon"
                :label="item.label"
                @click="() => {
                  handleNavigation(item)
                  isSidebarVisible = false
                }"
              />
            </template>
          </div>
        </nav>
      </Sidebar>

      <!-- Main Content -->
      <main class="layout-main">
        <div class="layout-content">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-wrapper {
  @apply min-h-screen bg-gray-50;
}

.layout-topbar {
  @apply fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200;
  height: 4rem;
}

.layout-container {
  @apply flex pt-16 min-h-screen;
}

.layout-sidebar-desktop {
  @apply hidden md:block fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 z-40;
}

.sidebar-nav {
  @apply p-3 h-full overflow-y-auto;
}

.menu-separator {
  @apply my-3 border-t border-gray-200;
}

.menu-item {
  @apply w-full justify-start mb-1 hover:bg-gray-50;
}

.sidebar-mobile {
  @apply md:hidden;
}

.sidebar-mobile :deep(.p-sidebar) {
  @apply w-64;
}

.mobile-menu-header {
  @apply flex items-center gap-2 p-3 border-b border-gray-200;
}

.mobile-menu-content {
  @apply p-3;
}

.layout-main {
  @apply flex-1 md:ml-64 w-full;
}

.layout-content {
  @apply p-6;
}

:deep(.p-menubar) {
  @apply border-none rounded-none px-4;
  height: 4rem;
}

:deep(.p-button.p-button-text) {
  @apply px-3 py-2;
}

:deep(.p-button.p-button-text .p-button-icon) {
  @apply mr-2;
}

:deep(.p-sidebar-header) {
  @apply hidden;
}

:deep(.p-sidebar) {
  @apply z-50;
}

/* Additional fixes for sidebar */
.layout-main {
  position: relative;
  min-height: calc(100vh - 4rem);
}

.layout-sidebar-desktop {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Ensure content doesn't get cut off under the sidebar */
@media (min-width: 768px) {
  .layout-main {
    margin-left: 16rem;
    width: calc(100% - 16rem);
  }
}
</style> 