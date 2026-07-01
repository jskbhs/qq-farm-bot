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
    class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 transition-colors duration-300 md:hidden"
    aria-label="主导航"
  >
    <div
      class="pointer-events-auto flex w-full max-w-md items-center justify-around rounded-2xl border border-white/30 bg-white/20 px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-black/30 dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
    >
      <RouterLink
        v-for="item in visibleItems"
        :key="item.path || 'home'"
        :to="item.path ? `/${item.path}` : '/'"
        class="relative flex flex-col items-center justify-center rounded-xl px-2 py-1 text-gray-600 transition-all duration-200 hover:text-[color:var(--theme-primary)] dark:text-gray-300"
        :class="isActive(item.path) ? 'text-[color:var(--theme-primary)] bottom-nav-item-active' : ''"
      >
        <div
          :key="`${item.path}-${isActive(item.path) ? 'a' : 'i'}`"
          :class="[item.icon, 'mb-1 text-2xl leading-none bottom-nav-icon', isActive(item.path) ? 'bottom-nav-icon-bounce' : '']"
        />
        <span class="text-xs font-medium">{{ item.label }}</span>
        <div
          v-if="isActive(item.path)"
          class="bottom-nav-indicator"
        />
      </RouterLink>
    </div>
  </nav>
</template>
