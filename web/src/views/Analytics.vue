<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/api'
import { useAccountStore } from '@/stores/account'
import { usePlantBlacklistStore } from '@/stores/plant-blacklist'
import { useSettingStore } from '@/stores/setting'
import { useStatusStore } from '@/stores/status'
import { useToastStore } from '@/stores/toast'

const accountStore = useAccountStore()
const plantBlacklistStore = usePlantBlacklistStore()
const settingStore = useSettingStore()
const toast = useToastStore()
const statusStore = useStatusStore()
const { currentAccountId } = storeToRefs(accountStore)
const { blacklist } = storeToRefs(plantBlacklistStore)
const { settings } = storeToRefs(settingStore)
const { status } = storeToRefs(statusStore)

function formatNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null)
    return '0'
  const n = Number(num)
  if (Number.isNaN(n))
    return '0'
  return n.toLocaleString('zh-CN')
}

const loading = ref(false)
const list = ref<any[]>([])
const sortKey = ref('exp')
const imageErrors = ref<Record<string | number, boolean>>({})
const batchLoading = ref(false)

const activeTab = ref('strategy')

const strategyLevel = ref(1)

watch(() => status.value?.status?.level, (newLevel) => {
  if (newLevel && Number(newLevel) > 0) {
    strategyLevel.value = Number(newLevel)
  }
}, { immediate: true })

const strategies = [
  {
    key: 'max_exp',
    label: '经验/时',
    metric: 'expPerHour',
    color: 'purple',
    icon: '📈',
    unit: 'EXP',
    desc: '每小时经验收益最高',
  },
  {
    key: 'max_profit',
    label: '利润/时',
    metric: 'profitPerHour',
    color: 'amber',
    icon: '💰',
    unit: '金币',
    desc: '每小时净利润最高',
  },
  {
    key: 'max_fert_exp',
    label: '普肥经验/时',
    metric: 'normalFertilizerExpPerHour',
    color: 'blue',
    icon: '🧪',
    unit: 'EXP',
    desc: '使用普通化肥后经验最高',
  },
  {
    key: 'max_fert_profit',
    label: '普肥利润/时',
    metric: 'normalFertilizerProfitPerHour',
    color: 'green',
    icon: '🐷',
    unit: '金币',
    desc: '使用普通化肥后利润最高',
  },
  {
    key: 'level',
    label: '最高等级',
    metric: 'level',
    color: 'rose',
    icon: '⭐',
    unit: 'Lv',
    desc: '等级最高的作物',
  },
]

const strategyLabelMap: Record<string, string> = {
  preferred: '优先种植种子',
  level: '最高等级作物',
  max_exp: '最大经验/时',
  max_fert_exp: '最大普通肥经验/时',
  max_profit: '最大净利润/时',
  max_fert_profit: '最大普通肥净利润/时',
  bag_priority: '背包种子优先',
}

const currentStrategy = computed(() => settings.value?.plantingStrategy || 'max_exp')
const currentStrategyLabel = computed(() => strategyLabelMap[currentStrategy.value] || currentStrategy.value)
const preferredSeedId = computed(() => settings.value?.preferredSeedId || 0)

const currentStrategyBestPlant = computed(() => {
  if (currentStrategy.value === 'preferred' && preferredSeedId.value > 0) {
    const found = list.value.find((item: any) => item.seedId === preferredSeedId.value)
    if (found)
      return found
  }
  if (currentStrategy.value === 'bag_priority') {
    return null
  }
  return getStrategyBestPlant(currentStrategy.value)
})

function getStrategyBestPlant(strategyKey: string) {
  const strategy = strategies.find(s => s.key === strategyKey)
  if (!strategy)
    return null

  const metric = strategy.metric
  const filtered = list.value.filter((item) => {
    const level = item.level
    if (level === null || level === undefined)
      return true
    return Number(level) <= strategyLevel.value
  })

  if (filtered.length === 0)
    return null

  if (strategyKey === 'level') {
    return [...filtered].sort((a, b) => {
      const av = a.level ?? -1
      const bv = b.level ?? -1
      return bv - av
    })[0]
  }

  return [...filtered].sort((a, b) => {
    const av = Number(a[metric])
    const bv = Number(b[metric])
    if (!Number.isFinite(av) && !Number.isFinite(bv))
      return 0
    if (!Number.isFinite(av))
      return 1
    if (!Number.isFinite(bv))
      return -1
    return bv - av
  })[0]
}

function getStrategyAvailableCount() {
  return list.value.filter((item) => {
    const level = item.level
    if (level === null || level === undefined)
      return true
    return Number(level) <= strategyLevel.value
  }).length
}

async function loadAnalytics() {
  if (!currentAccountId.value)
    return
  loading.value = true
  try {
    const res = await api.get(`/api/analytics`, {
      params: { sort: sortKey.value },
      headers: { 'x-account-id': currentAccountId.value },
    })
    const data = res.data.data
    if (Array.isArray(data)) {
      list.value = data
    }
    else {
      list.value = []
    }
  }
  catch (e) {
    console.error(e)
    list.value = []
  }
  finally {
    loading.value = false
  }
}

async function handleAddAllToBlacklist() {
  if (batchLoading.value)
    return
  batchLoading.value = true
  try {
    const allSeedIds = list.value.map((item: any) => item.seedId)
    await plantBlacklistStore.addAllToBlacklist(allSeedIds)
    toast.success(`已将 ${allSeedIds.length} 种作物加入偷菜黑名单`)
  }
  finally {
    batchLoading.value = false
  }
}

async function handleClearBlacklist() {
  if (batchLoading.value)
    return
  batchLoading.value = true
  try {
    await plantBlacklistStore.clearBlacklist()
    toast.success('已清空偷菜黑名单')
  }
  finally {
    batchLoading.value = false
  }
}

onMounted(() => {
  loadAnalytics()
  plantBlacklistStore.fetchBlacklist()
  if (currentAccountId.value) {
    settingStore.fetchSettings(currentAccountId.value)
  }
})

watch([currentAccountId, sortKey], () => {
  loadAnalytics()
  if (currentAccountId.value) {
    settingStore.fetchSettings(currentAccountId.value)
  }
})

function formatLv(level: any) {
  if (level === null || level === undefined || level === '' || Number(level) < 0)
    return '未知'
  return String(level)
}

function getSeedNameById(seedId: number) {
  const item = list.value.find((i: any) => i.seedId === seedId)
  return item?.name || `蔬菜ID:${seedId}`
}
</script>

<template>
  <div class="flex flex-col gap-6 pt-6">
    <!-- Tabs -->
    <div class="farm-card-enhanced animate-stagger-1 animate-fade-in-up p-2">
      <div class="flex gap-2">
        <button
          class="relative flex-1 overflow-hidden rounded-2xl px-4 py-3 text-sm font-bold font-display transition-all duration-300"
          :class="activeTab === 'strategy'
            ? 'text-white shadow-lg'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
          :style="activeTab === 'strategy'
            ? { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }
            : {}"
          @click="activeTab = 'strategy'"
        >
          <div v-if="activeTab === 'strategy'" class="absolute inset-0 opacity-30">
            <div class="absolute left-0 right-0 top-0 h-1/2 rounded-t-2xl from-white/40 to-transparent bg-gradient-to-b" />
          </div>
          <div class="relative flex items-center justify-center gap-2">
            <span class="text-xl" :class="activeTab === 'strategy' ? 'animate-wiggle' : ''">📊</span>
            <span>种植策略</span>
          </div>
        </button>
        <button
          class="relative flex-1 overflow-hidden rounded-2xl px-4 py-3 text-sm font-bold font-display transition-all duration-300"
          :class="activeTab === 'blacklist'
            ? 'text-white shadow-lg'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
          :style="activeTab === 'blacklist'
            ? { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' }
            : {}"
          @click="activeTab = 'blacklist'"
        >
          <div v-if="activeTab === 'blacklist'" class="absolute inset-0 opacity-30">
            <div class="absolute left-0 right-0 top-0 h-1/2 rounded-t-2xl from-white/40 to-transparent bg-gradient-to-b" />
          </div>
          <div class="relative flex items-center justify-center gap-2">
            <span class="text-xl" :class="activeTab === 'blacklist' ? 'animate-wiggle' : ''">🚫</span>
            <span>黑名单</span>
            <span
              v-if="blacklist.length"
              class="relative ml-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-extrabold"
              :class="activeTab === 'blacklist' ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'"
            >
              {{ blacklist.length }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <div>
      <div v-if="activeTab === 'strategy'" class="flex flex-col gap-6">
        <!-- Current Strategy Card -->
        <div class="farm-card-enhanced animate-stagger-2 animate-fade-in-up p-6">
          <div class="mb-4 flex items-center gap-3">
            <div class="h-12 w-12 flex items-center justify-center rounded-2xl" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)">
              <span class="title-wheat text-2xl">🎯</span>
            </div>
            <div>
              <h3 class="text-lg font-bold font-display" style="color: var(--theme-text)">
                当前策略
              </h3>
              <p class="text-xs" style="color: color-mix(in srgb, var(--theme-text) 50%, transparent)">
                与设置页种植策略同步
              </p>
            </div>
          </div>

          <div class="decorative-divider mb-4" />

          <div class="rounded-2xl p-4" style="background: linear-gradient(135deg, color-mix(in srgb, #3b82f6 10%, transparent) 0%, color-mix(in srgb, #8b5cf6 10%, transparent) 100%)">
            <div class="mb-3 flex items-center gap-2">
              <div class="status-dot-online" />
              <span class="font-bold" style="color: var(--theme-text)">{{ currentStrategyLabel }}</span>
            </div>

            <div v-if="currentStrategy === 'bag_priority'" class="rounded-xl p-3 text-sm" style="background: color-mix(in srgb, #f59e0b 15%, transparent); color: #d97706">
              <span class="font-bold">💡 背包种子优先策略</span>
              <p class="mt-1 text-xs opacity-80">
                优先使用背包中的种子，按背包优先级排序，用完后回退到商店购买。具体种植内容取决于背包中实际持有的种子。
              </p>
            </div>
            <div v-else-if="currentStrategyBestPlant" class="flex items-center gap-4">
              <div class="relative h-16 w-16 flex shrink-0 items-center justify-center overflow-hidden rounded-2xl" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 3px solid rgba(34, 197, 94, 0.2)">
                <img
                  v-if="currentStrategyBestPlant.image && !imageErrors[currentStrategyBestPlant.seedId]"
                  :src="currentStrategyBestPlant.image"
                  class="h-12 w-12 object-contain"
                  loading="lazy"
                  @error="imageErrors[currentStrategyBestPlant.seedId] = true"
                >
                <span v-else class="text-3xl">🌱</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-lg font-extrabold" style="color: var(--theme-text)">
                  {{ currentStrategyBestPlant.name }}
                </div>
                <div class="mt-1 flex items-center gap-2">
                  <span class="level-badge text-xs">
                    Lv{{ formatLv(currentStrategyBestPlant.level) }}
                  </span>
                  <span class="text-xs font-bold" style="color: color-mix(in srgb, var(--theme-text) 50%, transparent)">
                    {{ currentStrategyBestPlant.seasons }}季作物
                  </span>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span v-if="currentStrategyBestPlant.expPerHour" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style="background: color-mix(in srgb, #8b5cf6 15%, transparent); color: #7c3aed">
                    ⚡ {{ formatNumber(currentStrategyBestPlant.expPerHour) }}/时
                  </span>
                  <span v-if="currentStrategyBestPlant.profitPerHour" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" style="background: color-mix(in srgb, #f59e0b 15%, transparent); color: #d97706">
                    💰 {{ formatNumber(currentStrategyBestPlant.profitPerHour) }}/时
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="py-4 text-center" style="color: color-mix(in srgb, var(--theme-text) 40%, transparent)">
              <span class="text-4xl opacity-50">🌱</span>
              <p class="mt-2 text-sm">
                暂无可种植作物
              </p>
            </div>
          </div>
        </div>

        <!-- Strategy Comparison Card -->
        <div class="farm-card-enhanced animate-stagger-3 animate-fade-in-up p-6">
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <div class="h-12 w-12 flex items-center justify-center rounded-2xl" style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)">
                <span class="title-wheat text-2xl">📊</span>
              </div>
              <div>
                <h3 class="text-lg font-bold font-display" style="color: var(--theme-text)">
                  策略对比
                </h3>
                <p class="text-xs" style="color: color-mix(in srgb, var(--theme-text) 50%, transparent)">
                  各策略下可种植的最优作物
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold" style="color: color-mix(in srgb, var(--theme-text) 60%, transparent)">参考等级:</span>
              <div class="relative">
                <input
                  v-model.number="strategyLevel"
                  type="number"
                  min="1"
                  max="100"
                  class="w-20 farm-input rounded-2xl px-4 py-2 text-center text-lg font-extrabold outline-none transition-all"
                  style="border: 3px solid rgba(139, 105, 20, 0.15); background: var(--theme-bg); color: var(--theme-text)"
                >
              </div>
            </div>
          </div>

          <div class="decorative-divider mb-6" />

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:grid-cols-2 xl:grid-cols-5">
            <div
              v-for="(strategy, index) in strategies"
              :key="strategy.key"
              class="farm-card-enhanced cursor-pointer p-4 transition-all duration-300"
              :class="[
                currentStrategy === strategy.key ? 'ring-2 ring-blue-400 scale-105' : 'hover:scale-102',
                `animate-fade-in-up animate-stagger-${index + 1}`,
              ]"
              :style="currentStrategy === strategy.key ? { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' } : {}"
            >
              <div class="mb-3 flex items-center gap-2.5">
                <div
                  class="relative h-10 w-10 flex shrink-0 items-center justify-center rounded-xl text-white"
                  :style="{ background: `linear-gradient(135deg, var(--strategy-${strategy.color}-from), var(--strategy-${strategy.color}-to))` }"
                >
                  <span class="text-lg" :class="currentStrategy === strategy.key ? 'animate-sparkle' : ''">{{ strategy.icon }}</span>
                  <div v-if="currentStrategy === strategy.key" class="animate-online-pulse absolute h-3 w-3 rounded-full bg-green-500 -right-1 -top-1" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-extrabold" :style="{ color: `var(--strategy-${strategy.color}-text)` }">
                    {{ strategy.label }}
                  </div>
                  <div v-if="currentStrategy === strategy.key" class="flex items-center gap-1 text-[10px] text-blue-500 font-bold">
                    <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                    当前策略
                  </div>
                </div>
              </div>

              <div v-if="getStrategyBestPlant(strategy.key)" class="space-y-3">
                <div class="flex items-center gap-2.5">
                  <div class="h-11 w-11 flex shrink-0 items-center justify-center overflow-hidden rounded-xl" :style="{ background: `color-mix(in srgb, var(--strategy-${strategy.color}-from), transparent 85%)`, border: '2px solid rgba(0,0,0,0.05)' }">
                    <img
                      v-if="getStrategyBestPlant(strategy.key)?.image && !imageErrors[getStrategyBestPlant(strategy.key)?.seedId]"
                      :src="getStrategyBestPlant(strategy.key)?.image"
                      class="h-8 w-8 object-contain"
                      loading="lazy"
                      @error="imageErrors[getStrategyBestPlant(strategy.key)?.seedId] = true"
                    >
                    <span v-else class="text-lg opacity-50">🌱</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-bold" style="color: var(--theme-text)">
                      {{ getStrategyBestPlant(strategy.key)?.name }}
                    </div>
                    <div class="text-xs font-medium" style="color: color-mix(in srgb, var(--theme-text) 50%, transparent)">
                      Lv{{ formatLv(getStrategyBestPlant(strategy.key)?.level) }}
                    </div>
                  </div>
                </div>

                <div class="rounded-xl p-3" style="background: color-mix(in srgb, var(--theme-primary) 6%, transparent)">
                  <div class="flex items-baseline justify-between">
                    <span class="text-xs font-bold" style="color: color-mix(in srgb, var(--theme-text) 50%, transparent)">{{ strategy.unit }}/时</span>
                    <span class="asset-number text-lg font-extrabold" :style="{ color: `var(--strategy-${strategy.color}-text)` }">
                      {{ formatNumber(getStrategyBestPlant(strategy.key)?.[strategy.metric]) }}
                    </span>
                  </div>
                </div>
              </div>
              <div v-else class="py-4 text-center">
                <span class="text-3xl opacity-30">🌱</span>
                <p class="mt-1 text-xs font-medium" style="color: color-mix(in srgb, var(--theme-text) 40%, transparent)">
                  暂无可种植作物
                </p>
              </div>
            </div>
          </div>

          <div class="decorative-divider my-6" />

          <div class="flex items-center justify-center gap-2 text-sm font-bold" style="color: color-mix(in srgb, var(--theme-text) 50%, transparent)">
            <span class="text-xl">💡</span>
            <span>可种植 <span class="asset-number text-base" style="color: var(--theme-primary)">{{ getStrategyAvailableCount() }}</span> / {{ formatNumber(list.length) }} 种作物</span>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'blacklist'" class="farm-card-enhanced animate-stagger-2 animate-fade-in-up p-6">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="h-12 w-12 flex items-center justify-center rounded-2xl" style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)">
              <span class="title-wheat text-2xl">🚫</span>
            </div>
            <div>
              <h3 class="text-lg font-bold font-display" style="color: var(--theme-text)">
                偷菜黑名单
              </h3>
              <p class="text-xs" style="color: color-mix(in srgb, var(--theme-text) 50%, transparent)">
                加入黑名单的蔬菜在自动偷菜时会被跳过
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="flex cartoon-btn items-center gap-1.5 rounded-2xl px-4 py-2 text-sm text-white font-bold transition"
              style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
              :disabled="batchLoading || list.length === 0"
              @click="handleAddAllToBlacklist"
            >
              <span v-if="batchLoading" class="animate-spin">⏳</span>
              <span v-else>➕</span>
              一键全部加入
            </button>
            <button
              v-if="blacklist.length > 0"
              class="flex cartoon-btn items-center gap-1.5 rounded-2xl px-4 py-2 text-sm text-white font-bold transition"
              style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
              :disabled="batchLoading"
              @click="handleClearBlacklist"
            >
              🗑️
              清空
            </button>
          </div>
        </div>

        <div class="decorative-divider mb-6" />

        <div v-if="blacklist.length === 0" class="py-16 text-center">
          <span class="text-6xl opacity-30">📭</span>
          <p class="mt-4 text-lg font-bold" style="color: color-mix(in srgb, var(--theme-text) 40%, transparent)">
            暂无黑名单蔬菜
          </p>
          <p class="mt-1 text-sm" style="color: color-mix(in srgb, var(--theme-text) 30%, transparent)">
            黑名单中的作物在自动偷菜时会被自动跳过
          </p>
        </div>
        <div v-else class="grid grid-cols-1 gap-3 lg:grid-cols-3 sm:grid-cols-2">
          <div
            v-for="(seedId, index) in blacklist"
            :key="seedId"
            class="flex animate-fade-in-up items-center justify-between rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            :class="`animate-stagger-${Math.min(index + 1, 7)}`"
            style="background: color-mix(in srgb, var(--theme-primary) 5%, transparent); border: 2px solid rgba(0,0,0,0.05)"
          >
            <div class="flex items-center gap-3">
              <div class="relative h-12 w-12 flex shrink-0 items-center justify-center overflow-hidden rounded-xl" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid rgba(239, 68, 68, 0.15)">
                <img
                  v-if="list.find(i => i.seedId === seedId)?.image"
                  :src="list.find(i => i.seedId === seedId)?.image"
                  class="h-9 w-9 object-contain"
                  loading="lazy"
                >
                <span v-else class="text-2xl opacity-50">🌱</span>
                <div class="absolute h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold -right-1 -top-1">
                  ✕
                </div>
              </div>
              <div class="min-w-0">
                <div class="truncate text-sm font-extrabold" style="color: var(--theme-text)">
                  {{ getSeedNameById(seedId) }}
                </div>
                <div class="text-xs font-medium" style="color: color-mix(in srgb, var(--theme-text) 40%, transparent)">
                  ID: {{ seedId }}
                </div>
              </div>
            </div>
            <button
              class="cartoon-btn rounded-xl px-3 py-1.5 text-xs text-white font-bold transition"
              style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
              @click="plantBlacklistStore.removeFromBlacklist(seedId)"
            >
              移出
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
