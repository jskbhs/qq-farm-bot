<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/api'
import { useAccountStore } from '@/stores/account'
import { useToastStore } from '@/stores/toast'

const accountStore = useAccountStore()
const toast = useToastStore()

const loading = ref(false)
const data = ref<any>(null)

async function fetch() {
  loading.value = true
  try {
    const res = await api.get('/api/achievements/me')
    if (res.data.ok) {
      data.value = res.data.data
    } else {
      toast.error(res.data.error || '加载失败')
    }
  } catch (e: any) {
    toast.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const progress = computed(() => {
  if (!data.value) return 0
  const total = data.value.total || 1
  return Math.round((data.value.achievements.length / total) * 100)
})

const categories = computed(() => {
  if (!data.value || !data.value.all) return []
  const grouped: Record<string, any[]> = {}
  for (const a of data.value.all) {
    const cat = a.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat]!.push(a)
  }
  return Object.entries(grouped).map(([cat, items]) => ({ category: cat, items }))
})

const categoryMeta: Record<string, { name: string; icon: string; color: string }> = {
  farming: { name: '种植', icon: '🌱', color: '#10b981' },
  steal: { name: '偷菜', icon: '🥷', color: '#8b5cf6' },
  fertilize: { name: '化肥', icon: '🧪', color: '#f59e0b' },
  streak: { name: '连续', icon: '📅', color: '#06b6d4' },
  social: { name: '社交', icon: '🤝', color: '#ec4899' },
  special: { name: '特殊', icon: '✨', color: '#a855f7' },
}

function isUnlocked(id: string) {
  if (!data.value) return false
  return data.value.achievements.some((a: any) => a.id === id)
}

function unlockedRecord(id: string) {
  if (!data.value) return null
  return data.value.achievements.find((a: any) => a.id === id)
}

function formatNumber(n: number) {
  return (n || 0).toLocaleString('zh-CN')
}

function formatDate(t: number) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(() => {
  accountStore.fetchAccounts()
  fetch()
})
</script>

<template>
  <div class="h-full overflow-y-auto p-4 pb-24">
    <div class="mx-auto max-w-4xl space-y-4">
      <!-- 顶部 -->
      <div class="farm-card-enhanced p-5">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h1 class="text-2xl font-black flex items-center gap-2">
              <span class="i-carbon-star-filled text-3xl" style="color: var(--theme-primary)" />
              成就系统
            </h1>
            <p class="text-sm opacity-70 mt-1">解锁成就,赢取专属奖励</p>
          </div>
          <div class="text-right">
            <div class="text-xs opacity-70">解锁进度</div>
            <div class="text-2xl font-black" style="color: var(--theme-primary)">
              {{ data?.achievements?.length || 0 }}<span class="text-base opacity-60">/{{ data?.total || 0 }}</span>
            </div>
            <div class="text-xs opacity-60">{{ progress }}%</div>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="h-2 rounded-full overflow-hidden" style="background: color-mix(in srgb, var(--theme-primary) 10%, transparent)">
          <div class="h-full transition-all" :style="{ width: progress + '%', background: 'var(--theme-gradient)' }" />
        </div>

        <!-- 统计 -->
        <div v-if="data" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div class="rounded-xl p-3" style="background: color-mix(in srgb, #06b6d4 10%, transparent)">
            <div class="text-xs opacity-70">连续天数</div>
            <div class="text-xl font-black mt-0.5" style="color: #06b6d4">📅 {{ data.consecutiveDays || 0 }}</div>
          </div>
          <div class="rounded-xl p-3" style="background: color-mix(in srgb, #10b981 10%, transparent)">
            <div class="text-xs opacity-70">累计收菜</div>
            <div class="text-xl font-black mt-0.5" style="color: #10b981">🌾 {{ formatNumber(data.totalHarvest) }}</div>
          </div>
          <div class="rounded-xl p-3" style="background: color-mix(in srgb, #8b5cf6 10%, transparent)">
            <div class="text-xs opacity-70">累计偷菜</div>
            <div class="text-xl font-black mt-0.5" style="color: #8b5cf6">🥷 {{ formatNumber(data.totalSteal) }}</div>
          </div>
          <div class="rounded-xl p-3" style="background: color-mix(in srgb, #fbbf24 10%, transparent)">
            <div class="text-xs opacity-70">累计金币</div>
            <div class="text-xl font-black mt-0.5" style="color: #fbbf24">💰 {{ formatNumber(data.totalGold) }}</div>
          </div>
        </div>
      </div>

      <!-- 分类成就 -->
      <div v-for="cat in categories" :key="cat.category" class="farm-card-enhanced p-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-2xl">{{ categoryMeta[cat.category]?.icon || '⭐' }}</span>
          <h2 class="text-lg font-black" :style="{ color: categoryMeta[cat.category]?.color }">
            {{ categoryMeta[cat.category]?.name || cat.category }}
          </h2>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div
            v-for="item in cat.items"
            :key="item.id"
            class="relative rounded-xl p-3 transition-all hover:scale-[1.02]"
            :class="isUnlocked(item.id) ? '' : 'opacity-60'"
            :style="{
              background: isUnlocked(item.id)
                ? `color-mix(in srgb, ${categoryMeta[cat.category]?.color} 12%, transparent)`
                : 'color-mix(in srgb, var(--theme-text) 5%, transparent)',
              border: isUnlocked(item.id)
                ? `1px solid color-mix(in srgb, ${categoryMeta[cat.category]?.color} 30%, transparent)`
                : '1px solid color-mix(in srgb, var(--theme-text) 8%, transparent)',
            }"
          >
            <!-- 头部:大图标 + 锁定状态 -->
            <div class="flex items-start gap-2 mb-1.5">
              <div
                class="h-10 w-10 flex shrink-0 items-center justify-center rounded-lg text-2xl"
                :style="{
                  background: isUnlocked(item.id)
                    ? `color-mix(in srgb, ${categoryMeta[cat.category]?.color} 20%, transparent)`
                    : 'color-mix(in srgb, var(--theme-text) 8%, transparent)',
                  filter: isUnlocked(item.id) ? 'none' : 'grayscale(1)',
                }"
              >
                <span>{{ item.icon || '🏅' }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-sm truncate" :title="item.name">{{ item.name }}</div>
                <div class="flex items-center gap-1 mt-0.5">
                  <span
                    class="rounded px-1 py-0 text-[9px] font-bold"
                    :style="{
                      background: isUnlocked(item.id)
                        ? `color-mix(in srgb, ${categoryMeta[cat.category]?.color} 20%, transparent)`
                        : 'color-mix(in srgb, var(--theme-text) 8%, transparent)',
                      color: isUnlocked(item.id)
                        ? categoryMeta[cat.category]?.color
                        : 'color-mix(in srgb, var(--theme-text) 60%, transparent)',
                    }"
                  >
                    {{ categoryMeta[cat.category]?.name || cat.category }}
                  </span>
                  <div v-if="!isUnlocked(item.id)" class="i-carbon-locked text-xs opacity-60" />
                  <div v-else class="i-carbon-checkmark text-xs" :style="{ color: categoryMeta[cat.category]?.color }" />
                </div>
              </div>
            </div>

            <div class="text-xs opacity-70 line-clamp-2 min-h-[2lh]">{{ item.description }}</div>
            <div v-if="isUnlocked(item.id)" class="text-xs mt-1.5 font-bold" :style="{ color: categoryMeta[cat.category]?.color }">
              ✓ {{ formatDate(unlockedRecord(item.id)?.unlockedAt) }}
            </div>
            <div v-else-if="item.hidden" class="text-xs opacity-50 mt-1">???</div>
            <div v-if="item.reward" class="mt-1.5 flex flex-wrap gap-1">
              <span v-if="item.reward.theme" class="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style="background: var(--theme-primary); color: white">
                🎨 解锁主题
              </span>
              <span v-if="item.reward.title" class="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style="background: #fbbf24; color: white">
                🏅 {{ item.reward.title }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="farm-card-enhanced p-8 text-center opacity-60">
        <div class="i-carbon-circle-dash animate-spin text-2xl mx-auto" />
        <p class="mt-2 text-sm">加载中...</p>
      </div>
    </div>
  </div>
</template>
