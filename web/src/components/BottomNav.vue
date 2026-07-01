<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { menuRoutes } from '@/router/menu'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()
const appStore = useAppStore()

/** 角色 */
const isAdminPanelUser = computed(() => userStore.isAdminPanelUser)
const isLogin = computed(() => userStore.isLoggedIn)

const visibleItems = computed(() => {
  return menuRoutes
    .filter(item => !item.adminOnly || isAdminPanelUser.value)
    .filter(item => appStore.isBottomNavVisible(item.path, true))
})

function isActive(path: string) {
  if (!path)
    return route.path === '/' || route.path === ''
  return route.path === `/${path}` || route.path.startsWith(`/${path}/`)
}
</script>

<template>
  <nav
    v-if="isLogin"
    class="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/20 bg-white/10 px-2 pt-2 pb-3 backdrop-blur-md transition-colors duration-300 md:hidden dark:border-gray-700/50 dark:bg-gray-900/50"
    aria-label="主导航"
  >
    <RouterLink
      v-for="(item) in visibleItems"
      :key="item.path || 'home'"
      :to="item.path ? `/${item.path}` : '/'"
      class="relative flex flex-col items-center justify-center px-2 py-1 text-gray-600 transition-all duration-200 hover:text-[color:var(--theme-primary)] dark:text-gray-300"
      :class="isActive(item.path) ? 'text-[color:var(--theme-primary)] bottom-nav-item-active' : ''"
    >
      <div :class="[item.icon, 'mb-1 text-2xl leading-none bottom-nav-icon', isActive(item.path) ? 'bottom-nav-icon-active' : '']" />
      <span class="text-xs font-medium">{{ item.label }}</span>
      <div
        v-if="isActive(item.path)"
        class="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[color:var(--theme-primary)] shadow-[0_0_8px_var(--theme-primary)]"
      />
    </RouterLink>
  </nav>
</template>
