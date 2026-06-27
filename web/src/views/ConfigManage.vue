<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/api'
import FruitModal from '@/components/FruitModal.vue'
import ItemModal from '@/components/ItemModal.vue'
import SeedModal from '@/components/SeedModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

// ============ Tab ============
const activeTab = ref<'seeds' | 'fruits' | 'items'>('seeds')

// ============ 通用状态 ============
const loading = ref(false)
const imageErrors = ref<Record<string | number, boolean>>({})
const searchKeyword = ref('')

// ============ 种子 ============
const seedList = ref<any[]>([])
const seedSort = ref('name')
const seedSeasonFilter = ref('')
const showSeedModal = ref(false)

const seedSortOptions = [
  { value: 'name', label: '名称' },
  { value: 'seedId', label: '种子ID' },
  { value: 'price', label: '价格' },
  { value: 'requiredLevel', label: '等级' },
  { value: 'growTime', label: '生长时间' },
]

const filteredSeeds = computed(() => {
  let list = seedList.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter((s: any) =>
      s.name?.toLowerCase().includes(kw)
      || String(s.seedId).includes(kw)
      || String(s.plantId || '').includes(kw),
    )
  }
  if (seedSeasonFilter.value) {
    const seasons = Number(seedSeasonFilter.value)
    list = list.filter((s: any) => s.seasons === seasons)
  }
  const sortKey = seedSort.value
  return [...list].sort((a: any, b: any) => {
    const va = a[sortKey] ?? ''
    const vb = b[sortKey] ?? ''
    if (typeof va === 'number' && typeof vb === 'number')
      return va - vb
    return String(va).localeCompare(String(vb))
  })
})

// ============ 果实 ============
const fruitList = ref<any[]>([])
const fruitSort = ref('name')
const fruitRarityFilter = ref('')
const showFruitModal = ref(false)

const fruitSortOptions = [
  { value: 'name', label: '名称' },
  { value: 'id', label: '果实ID' },
  { value: 'price', label: '售价' },
]

const filteredFruits = computed(() => {
  let list = fruitList.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter((f: any) =>
      f.name?.toLowerCase().includes(kw)
      || String(f.id).includes(kw)
      || String(f.plantId || '').includes(kw),
    )
  }
  if (fruitRarityFilter.value !== '') {
    const r = Number(fruitRarityFilter.value)
    list = list.filter((f: any) => f.rarity === r)
  }
  const sortKey = fruitSort.value
  return [...list].sort((a: any, b: any) => {
    const va = a[sortKey] ?? ''
    const vb = b[sortKey] ?? ''
    if (typeof va === 'number' && typeof vb === 'number')
      return va - vb
    return String(va).localeCompare(String(vb))
  })
})

// ============ 道具 ============
const itemList = ref<any[]>([])
const itemSort = ref('name')
const itemTypeFilter = ref('')
const itemRarityFilter = ref('')
const showItemModal = ref(false)

const itemSortOptions = [
  { value: 'name', label: '名称' },
  { value: 'id', label: '物品ID' },
  { value: 'price', label: '价格' },
  { value: 'type', label: '类型' },
]

const itemTypeOptions = [
  { value: '', label: '全部类型' },
  { value: '1', label: '特殊道具' },
  { value: '2', label: '货币' },
  { value: '3', label: '经验' },
  { value: '4', label: '农场工具' },
  { value: '7', label: '化肥' },
  { value: '8', label: '宠物' },
  { value: '9', label: '宠物食品' },
  { value: '10', label: '头像框' },
  { value: '11', label: '礼品盒' },
  { value: '12', label: '收藏点' },
  { value: '13', label: '活跃点' },
  { value: '14', label: '解锁卡' },
  { value: '15', label: '高级货币' },
  { value: '16', label: '自选礼包' },
  { value: '17', label: '变异果实' },
  { value: '18', label: '装饰' },
  { value: '19', label: '印章' },
  { value: '23', label: '特殊' },
]

const itemTypeLabelMap: Record<number, string> = {
  1: '特殊道具',
  2: '货币',
  3: '经验',
  4: '农场工具',
  5: '种子',
  6: '果实',
  7: '化肥',
  8: '宠物',
  9: '宠物食品',
  10: '头像框',
  11: '礼品盒',
  12: '收藏点',
  13: '活跃点',
  14: '解锁卡',
  15: '高级货币',
  16: '自选礼包',
  17: '变异果实',
  18: '装饰',
  19: '印章',
  23: '特殊',
}

const rarityLabelMap: Record<number, string> = {
  0: '普通',
  1: '优秀',
  2: '精良',
  3: '稀有',
  4: '史诗',
  5: '传说',
}

const rarityFilterOptions = [
  { value: '', label: '全部稀有度' },
  { value: '0', label: '普通' },
  { value: '1', label: '优秀' },
  { value: '2', label: '精良' },
  { value: '3', label: '稀有' },
  { value: '4', label: '史诗' },
  { value: '5', label: '传说' },
]

const filteredItems = computed(() => {
  let list = itemList.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter((i: any) =>
      i.name?.toLowerCase().includes(kw)
      || String(i.id).includes(kw),
    )
  }
  if (itemTypeFilter.value) {
    const t = Number(itemTypeFilter.value)
    list = list.filter((i: any) => i.type === t)
  }
  if (itemRarityFilter.value !== '') {
    const r = Number(itemRarityFilter.value)
    list = list.filter((i: any) => i.rarity === r)
  }
  const sortKey = itemSort.value
  return [...list].sort((a: any, b: any) => {
    const va = a[sortKey] ?? ''
    const vb = b[sortKey] ?? ''
    if (typeof va === 'number' && typeof vb === 'number')
      return va - vb
    return String(va).localeCompare(String(vb))
  })
})

// ============ 数据加载 ============
async function loadSeeds() {
  loading.value = true
  try {
    const { data } = await api.get('/api/config/seeds')
    if (data?.ok)
      seedList.value = data.data || []
  }
  catch { /* ignore */ }
  finally { loading.value = false }
}

async function loadFruits() {
  loading.value = true
  try {
    const { data } = await api.get('/api/config/fruits')
    if (data?.ok)
      fruitList.value = data.data || []
  }
  catch { /* ignore */ }
  finally { loading.value = false }
}

async function loadItems() {
  loading.value = true
  try {
    const { data } = await api.get('/api/config/items')
    if (data?.ok)
      itemList.value = data.data || []
  }
  catch { /* ignore */ }
  finally { loading.value = false }
}

function loadCurrentTab() {
  if (activeTab.value === 'seeds')
    loadSeeds()
  else if (activeTab.value === 'fruits')
    loadFruits()
  else if (activeTab.value === 'items')
    loadItems()
}

function switchTab(tab: 'seeds' | 'fruits' | 'items') {
  if (activeTab.value === tab)
    return
  activeTab.value = tab
  searchKeyword.value = ''
  seedSeasonFilter.value = ''
  fruitRarityFilter.value = ''
  itemTypeFilter.value = ''
  itemRarityFilter.value = ''
  loadCurrentTab()
}

onMounted(() => {
  loadCurrentTab()
})

// ============ 录入成功回调 ============
function handleSeedSaved() {
  toast.success('种子录入成功！')
  loadSeeds()
}

function handleFruitSaved() {
  toast.success('果实录入成功！')
  loadFruits()
}

function handleItemSaved() {
  toast.success('道具录入成功！')
  loadItems()
}

// ============ 编辑状态 ============
const editSeedData = ref<any>(null)
const editFruitData = ref<any>(null)
const editItemData = ref<any>(null)

// ============ 删除确认 ============
const confirmVisible = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmAction: (() => Promise<void>) | null = null

function showConfirm(title: string, message: string, action: () => Promise<void>) {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmAction = action
  confirmVisible.value = true
}

async function executeConfirm() {
  if (confirmAction)
    await confirmAction()
  confirmVisible.value = false
}

// ============ 删除操作 ============
async function handleDeleteSeed(seedId: number, name: string) {
  showConfirm('删除种子', `确定要删除种子「${name}」(ID:${seedId}) 吗？关联的植物和果实也会一并删除。`, async () => {
    try {
      const { data } = await api.delete(`/api/config/seed/${seedId}`)
      if (data?.ok) {
        toast.success(`已删除种子「${name}」`)
        loadSeeds()
      }
      else {
        toast.error(`删除失败: ${data.error}`)
      }
    }
    catch (e: any) {
      toast.error(`删除失败: ${e.response?.data?.error || e.message}`)
    }
  })
}

async function handleDeleteFruit(fruitId: number, name: string) {
  showConfirm('删除果实', `确定要删除果实「${name}」(ID:${fruitId}) 吗？`, async () => {
    try {
      const { data } = await api.delete(`/api/config/fruit/${fruitId}`)
      if (data?.ok) {
        toast.success(`已删除果实「${name}」`)
        loadFruits()
      }
      else {
        toast.error(`删除失败: ${data.error}`)
      }
    }
    catch (e: any) {
      toast.error(`删除失败: ${e.response?.data?.error || e.message}`)
    }
  })
}

async function handleDeleteItem(itemId: number, name: string) {
  showConfirm('删除道具', `确定要删除道具「${name}」(ID:${itemId}) 吗？`, async () => {
    try {
      const { data } = await api.delete(`/api/config/item/${itemId}`)
      if (data?.ok) {
        toast.success(`已删除道具「${name}」`)
        loadItems()
      }
      else {
        toast.error(`删除失败: ${data.error}`)
      }
    }
    catch (e: any) {
      toast.error(`删除失败: ${e.response?.data?.error || e.message}`)
    }
  })
}

// ============ 黑名单 ============
async function handleToggleBlacklist(seedId: number) {
  const seed = seedList.value.find((s: any) => s.seedId === seedId)
  const name = seed?.name || `种子${seedId}`
  showConfirm('加入黑名单', `确定要将「${name}」加入偷菜黑名单吗？加入后自动偷菜时会跳过该作物。`, async () => {
    try {
      const { data } = await api.post('/api/plant-blacklist', { seedId })
      if (data?.ok) {
        toast.success(data.message || '操作成功')
      }
      else {
        toast.error(data.error || '操作失败')
      }
    }
    catch (e: any) {
      toast.error(e.response?.data?.error || e.message)
    }
  })
}

// ============ 工具函数 ============
function formatGrowTime(seconds: number): string {
  if (!seconds || seconds <= 0)
    return '-'
  if (seconds < 60)
    return `${seconds}秒`
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}分`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}时${mins}分` : `${hours}时`
}

function formatPrice(price: number, priceId?: number): string {
  if (priceId === 1005)
    return `${price} 金豆`
  if (priceId === 1004)
    return `${price} 钻石`
  return `${price} 金币`
}
</script>

<template>
  <div class="space-y-5">
    <!-- Tab 切换 -->
    <div class="farm-card-enhanced p-2">
      <div class="flex gap-2">
        <button
          class="config-tab flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300"
          :class="activeTab === 'seeds'
            ? 'config-tab-active seed-tab-active'
            : 'config-tab-inactive'"
          @click="switchTab('seeds')"
        >
          <span class="tab-icon text-lg">🌱</span>
          <span>种子</span>
          <span v-if="seedList.length" class="tab-badge ml-1 rounded-full px-2 py-0.5 text-xs font-bold" :class="activeTab === 'seeds' ? 'tab-badge-active' : 'tab-badge-inactive'">
            {{ seedList.length }}
          </span>
        </button>
        <button
          class="config-tab flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300"
          :class="activeTab === 'fruits'
            ? 'config-tab-active fruit-tab-active'
            : 'config-tab-inactive'"
          @click="switchTab('fruits')"
        >
          <span class="tab-icon text-lg">🍎</span>
          <span>果实</span>
          <span v-if="fruitList.length" class="tab-badge ml-1 rounded-full px-2 py-0.5 text-xs font-bold" :class="activeTab === 'fruits' ? 'tab-badge-active' : 'tab-badge-inactive'">
            {{ fruitList.length }}
          </span>
        </button>
        <button
          class="config-tab flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300"
          :class="activeTab === 'items'
            ? 'config-tab-active item-tab-active'
            : 'config-tab-inactive'"
          @click="switchTab('items')"
        >
          <span class="tab-icon text-lg">🎒</span>
          <span>道具</span>
          <span v-if="itemList.length" class="tab-badge ml-1 rounded-full px-2 py-0.5 text-xs font-bold" :class="activeTab === 'items' ? 'tab-badge-active' : 'tab-badge-inactive'">
            {{ itemList.length }}
          </span>
        </button>
      </div>
    </div>

    <div class="farm-card-enhanced">
      <!-- 搜索 + 筛选 + 录入按钮 -->
      <div class="config-toolbar flex flex-wrap items-center gap-3 p-4">
        <div class="section-title flex items-center gap-2">
          <span class="title-icon">🔧</span>
          <span class="title-text">快捷操作</span>
          <div class="title-divider" />
        </div>
        <button
          v-show="activeTab === 'seeds'"
          class="config-add-btn flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300"
          @click="showSeedModal = true"
        >
          <span>➕</span>
          录入种子
        </button>
        <button
          v-show="activeTab === 'items'"
          class="config-add-btn config-add-btn-blue flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300"
          @click="showItemModal = true"
        >
          <span>➕</span>
          录入道具
        </button>
        <div class="config-search relative w-56 shrink-0">
          <span class="search-icon absolute left-3.5 top-1/2 text-base -translate-y-1/2">🔍</span>
          <input
            v-model="searchKeyword"
            type="text"
            :placeholder="activeTab === 'seeds' ? '搜索种子...' : activeTab === 'fruits' ? '搜索果实...' : '搜索道具...'"
            class="config-search-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all duration-300"
          >
        </div>
        <!-- 种子筛选 -->
        <BaseSelect
          v-show="activeTab === 'seeds'"
          v-model="seedSeasonFilter"
          :options="[
            { value: '', label: '全部季节' },
            { value: '1', label: '单季' },
            { value: '2', label: '双季' },
          ]"
          class="w-40"
        />
        <BaseSelect
          v-show="activeTab === 'seeds'"
          v-model="seedSort"
          :options="seedSortOptions"
          class="w-40"
        />
        <!-- 果实筛选 -->
        <BaseSelect
          v-show="activeTab === 'fruits'"
          v-model="fruitRarityFilter"
          :options="rarityFilterOptions"
          class="w-40"
        />
        <BaseSelect
          v-show="activeTab === 'fruits'"
          v-model="fruitSort"
          :options="fruitSortOptions"
          class="w-40"
        />
        <!-- 道具筛选 -->
        <BaseSelect
          v-show="activeTab === 'items'"
          v-model="itemTypeFilter"
          :options="itemTypeOptions"
          class="w-40"
        />
        <BaseSelect
          v-show="activeTab === 'items'"
          v-model="itemRarityFilter"
          :options="rarityFilterOptions"
          class="w-40"
        />
        <BaseSelect
          v-show="activeTab === 'items'"
          v-model="itemSort"
          :options="itemSortOptions"
          class="w-40"
        />
        <span class="shrink-0 text-xs text-gray-400">
          {{ activeTab === 'seeds' ? filteredSeeds.length : activeTab === 'fruits' ? filteredFruits.length : filteredItems.length }} 条
        </span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-16">
        <div class="i-svg-spinners-90-ring-with-bg text-4xl text-green-500" />
      </div>

      <!-- ============ 种子列表 ============ -->
      <div v-else-if="activeTab === 'seeds'" class="p-4">
        <div v-if="filteredSeeds.length === 0" class="py-16 text-center text-gray-400">
          {{ searchKeyword ? '没有匹配的种子' : '暂无种子数据' }}
        </div>
        <div v-else class="config-table-wrap hidden overflow-hidden rounded-2xl sm:block">
          <div class="overflow-x-auto">
            <table class="config-table w-full whitespace-nowrap text-left text-sm">
              <thead class="config-table-head">
                <tr>
                  <th class="sticky left-0 z-10 px-4 py-3 font-bold">
                    🌱 种子
                  </th>
                  <th class="px-4 py-3 font-bold">
                    种子ID
                  </th>
                  <th class="px-4 py-3 font-bold">
                    等级
                  </th>
                  <th class="px-4 py-3 font-bold">
                    季节
                  </th>
                  <th class="px-4 py-3 font-bold">
                    生长时间
                  </th>
                  <th class="px-4 py-3 font-bold">
                    收获数
                  </th>
                  <th class="px-4 py-3 font-bold">
                    经验
                  </th>
                  <th class="px-4 py-3 font-bold">
                    价格
                  </th>
                  <th class="px-4 py-3 text-center font-bold">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody class="config-table-body">
                <tr v-for="(item, index) in filteredSeeds" :key="item.seedId" class="config-table-row group" :class="index % 2 === 0 ? 'row-even' : 'row-odd'">
                  <td class="row-sticky-cell sticky left-0 px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="config-item-icon relative h-11 w-11 flex shrink-0 items-center justify-center overflow-hidden rounded-xl">
                        <img
                          v-if="item.image && !imageErrors[item.seedId]"
                          :src="item.image"
                          class="h-9 w-9 object-contain"
                          loading="lazy"
                          @error="imageErrors[item.seedId] = true"
                        >
                        <div v-else class="i-carbon-sprout text-xl text-gray-400" />
                      </div>
                      <span class="text-gray-900 font-bold dark:text-gray-100">{{ item.name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {{ item.seedId }}
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    Lv.{{ item.requiredLevel }}
                  </td>
                  <td class="px-4 py-2">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="item.seasons === 2
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'"
                    >
                      {{ item.seasons === 2 ? '双季' : '单季' }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {{ formatGrowTime(item.growTime) }}
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {{ item.harvestCount || '-' }}
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {{ item.exp || '-' }}
                  </td>
                  <td class="px-4 py-2 text-amber-600 font-medium dark:text-amber-400">
                    {{ formatPrice(item.price, item.priceId) }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <button
                        class="config-action-btn config-action-btn-warning rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-300"
                        title="加入/移出黑名单"
                        @click="handleToggleBlacklist(item.seedId)"
                      >
                        🚫
                      </button>
                      <button
                        class="config-action-btn config-action-btn-primary rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-300"
                        title="编辑"
                        @click="editSeedData = { ...item }"
                      >
                        ✏️
                      </button>
                      <button
                        class="config-action-btn config-action-btn-danger rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-300"
                        title="删除"
                        @click="handleDeleteSeed(item.seedId, item.name)"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- 移动端卡片 -->
        <div class="block sm:hidden space-y-3">
          <div v-for="item in filteredSeeds" :key="item.seedId" class="border border-gray-200 rounded-xl bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center gap-3">
              <div class="relative h-12 w-12 flex shrink-0 items-center justify-center overflow-hidden border border-gray-200 rounded-lg bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
                <img
                  v-if="item.image && !imageErrors[item.seedId]"
                  :src="item.image"
                  class="h-10 w-10 object-contain"
                  loading="lazy"
                  @error="imageErrors[item.seedId] = true"
                >
                <div v-else class="i-carbon-sprout text-xl text-gray-400" />
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-gray-900 font-bold dark:text-gray-100">{{ item.name }}</span>
                  <span
                    class="rounded-full px-1.5 py-0.5 text-xs"
                    :class="item.seasons === 2 ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'"
                  >
                    {{ item.seasons === 2 ? '双季' : '单季' }}
                  </span>
                </div>
                <div class="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>ID:{{ item.seedId }}</span>
                  <span>Lv.{{ item.requiredLevel }}</span>
                  <span>{{ formatGrowTime(item.growTime) }}</span>
                  <span class="text-amber-600">{{ formatPrice(item.price, item.priceId) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 果实列表 ============ -->
      <div v-else-if="activeTab === 'fruits'" class="p-4">
        <div v-if="filteredFruits.length === 0" class="py-16 text-center text-gray-400">
          {{ searchKeyword ? '没有匹配的果实' : '暂无果实数据' }}
        </div>
        <div v-else class="hidden farm-card overflow-hidden border border-gray-200 rounded-2xl shadow-sm sm:block dark:border-gray-700">
          <div class="overflow-x-auto">
            <table class="w-full whitespace-nowrap text-left text-sm">
              <thead class="border-b bg-gray-50 text-xs text-gray-500 uppercase dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
                <tr>
                  <th class="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:bg-gray-800">
                    果实
                  </th>
                  <th class="px-4 py-3 font-medium">
                    果实ID
                  </th>
                  <th class="px-4 py-3 font-medium">
                    关联植物
                  </th>
                  <th class="px-4 py-3 font-medium">
                    种子ID
                  </th>
                  <th class="px-4 py-3 font-medium">
                    售价
                  </th>
                  <th class="px-4 py-3 font-medium">
                    等级
                  </th>
                  <th class="px-4 py-3 font-medium">
                    稀有度
                  </th>
                  <th class="px-4 py-3 text-center font-medium">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="item in filteredFruits" :key="item.id" class="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="sticky left-0 bg-white px-4 py-2 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:bg-gray-800 dark:group-hover:bg-gray-700/50">
                    <div class="flex items-center gap-3">
                      <div class="relative h-10 w-10 flex shrink-0 items-center justify-center overflow-hidden border border-gray-200 rounded-lg bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
                        <img
                          v-if="item.image && !imageErrors[item.id]"
                          :src="item.image"
                          class="h-8 w-8 object-contain"
                          loading="lazy"
                          @error="imageErrors[item.id] = true"
                        >
                        <div v-else class="i-carbon-crop-growth text-xl text-gray-400" />
                      </div>
                      <span class="text-gray-900 font-bold dark:text-gray-100">{{ item.name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {{ item.id }}
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {{ item.plantName || '-' }}
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {{ item.seedId || '-' }}
                  </td>
                  <td class="px-4 py-2 text-amber-600 font-medium dark:text-amber-400">
                    {{ formatPrice(item.price, item.priceId) }}
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    Lv.{{ item.level }}
                  </td>
                  <td class="px-4 py-2">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="item.rarity >= 3 ? 'bg-purple-100 text-purple-600' : item.rarity >= 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'"
                    >
                      {{ rarityLabelMap[item.rarity] || '普通' }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <button
                        class="rounded-lg px-2 py-1 text-xs text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        title="编辑"
                        @click="editFruitData = { ...item }"
                      >
                        ✏️
                      </button>
                      <button
                        class="rounded-lg px-2 py-1 text-xs text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        title="删除"
                        @click="handleDeleteFruit(item.id, item.name)"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- 移动端卡片 -->
        <div class="block sm:hidden space-y-3">
          <div v-for="item in filteredFruits" :key="item.id" class="border border-gray-200 rounded-xl bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center gap-3">
              <div class="relative h-12 w-12 flex shrink-0 items-center justify-center overflow-hidden border border-gray-200 rounded-lg bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
                <img
                  v-if="item.image && !imageErrors[item.id]"
                  :src="item.image"
                  class="h-10 w-10 object-contain"
                  loading="lazy"
                  @error="imageErrors[item.id] = true"
                >
                <div v-else class="i-carbon-crop-growth text-xl text-gray-400" />
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-gray-900 font-bold dark:text-gray-100">{{ item.name }}</span>
                  <span
                    class="rounded-full px-1.5 py-0.5 text-xs"
                    :class="item.rarity >= 3 ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'"
                  >
                    {{ rarityLabelMap[item.rarity] || '普通' }}
                  </span>
                </div>
                <div class="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>ID:{{ item.id }}</span>
                  <span v-if="item.plantName">{{ item.plantName }}</span>
                  <span class="text-amber-600">{{ formatPrice(item.price, item.priceId) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 道具列表 ============ -->
      <div v-else-if="activeTab === 'items'" class="p-4">
        <div v-if="filteredItems.length === 0" class="py-16 text-center text-gray-400">
          {{ searchKeyword || itemTypeFilter ? '没有匹配的道具' : '暂无道具数据' }}
        </div>
        <div v-else class="hidden farm-card overflow-hidden border border-gray-200 rounded-2xl shadow-sm sm:block dark:border-gray-700">
          <div class="overflow-x-auto">
            <table class="w-full whitespace-nowrap text-left text-sm">
              <thead class="border-b bg-gray-50 text-xs text-gray-500 uppercase dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
                <tr>
                  <th class="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:bg-gray-800">
                    道具
                  </th>
                  <th class="px-4 py-3 font-medium">
                    物品ID
                  </th>
                  <th class="px-4 py-3 font-medium">
                    类型
                  </th>
                  <th class="px-4 py-3 font-medium">
                    价格
                  </th>
                  <th class="px-4 py-3 font-medium">
                    可使用
                  </th>
                  <th class="px-4 py-3 font-medium">
                    等级
                  </th>
                  <th class="px-4 py-3 font-medium">
                    稀有度
                  </th>
                  <th class="px-4 py-3 font-medium">
                    描述
                  </th>
                  <th class="px-4 py-3 text-center font-medium">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="item in filteredItems" :key="item.id" class="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="sticky left-0 bg-white px-4 py-2 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:bg-gray-800 dark:group-hover:bg-gray-700/50">
                    <div class="flex items-center gap-3">
                      <div class="relative h-10 w-10 flex shrink-0 items-center justify-center overflow-hidden border border-gray-200 rounded-lg bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
                        <img
                          v-if="item.image && !imageErrors[item.id]"
                          :src="item.image"
                          class="h-8 w-8 object-contain"
                          loading="lazy"
                          @error="imageErrors[item.id] = true"
                        >
                        <div v-else class="i-carbon-box text-xl text-gray-400" />
                      </div>
                      <span class="text-gray-900 font-bold dark:text-gray-100">{{ item.name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {{ item.id }}
                  </td>
                  <td class="px-4 py-2">
                    <span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-400">
                      {{ itemTypeLabelMap[item.type] || `类型${item.type}` }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-amber-600 font-medium dark:text-amber-400">
                    {{ item.price > 0 ? formatPrice(item.price, item.priceId) : '-' }}
                  </td>
                  <td class="px-4 py-2">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="item.canUse ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'"
                    >
                      {{ item.canUse ? '是' : '否' }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {{ item.level > 0 ? `Lv.${item.level}` : '-' }}
                  </td>
                  <td class="px-4 py-2">
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="item.rarity >= 3 ? 'bg-purple-100 text-purple-600' : item.rarity >= 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'"
                    >
                      {{ rarityLabelMap[item.rarity] || '普通' }}
                    </span>
                  </td>
                  <td class="max-w-[200px] truncate px-4 py-2 text-xs text-gray-400">
                    {{ item.desc || item.effectDesc || '-' }}
                  </td>
                  <td class="px-4 py-2 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <button
                        class="rounded-lg px-2 py-1 text-xs text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        title="编辑"
                        @click="editItemData = { ...item }"
                      >
                        ✏️
                      </button>
                      <button
                        class="rounded-lg px-2 py-1 text-xs text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        title="删除"
                        @click="handleDeleteItem(item.id, item.name)"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- 移动端卡片 -->
        <div class="block sm:hidden space-y-3">
          <div v-for="item in filteredItems" :key="item.id" class="border border-gray-200 rounded-xl bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center gap-3">
              <div class="relative h-12 w-12 flex shrink-0 items-center justify-center overflow-hidden border border-gray-200 rounded-lg bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
                <img
                  v-if="item.image && !imageErrors[item.id]"
                  :src="item.image"
                  class="h-10 w-10 object-contain"
                  loading="lazy"
                  @error="imageErrors[item.id] = true"
                >
                <div v-else class="i-carbon-box text-xl text-gray-400" />
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-gray-900 font-bold dark:text-gray-100">{{ item.name }}</span>
                  <span class="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600">
                    {{ itemTypeLabelMap[item.type] || `类型${item.type}` }}
                  </span>
                </div>
                <div class="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>ID:{{ item.id }}</span>
                  <span v-if="item.price > 0" class="text-amber-600">{{ formatPrice(item.price, item.priceId) }}</span>
                  <span v-if="item.canUse" class="text-green-600">可使用</span>
                </div>
                <div v-if="item.desc || item.effectDesc" class="mt-1 truncate text-xs text-gray-400">
                  {{ item.desc || item.effectDesc }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 弹窗 -->
    <SeedModal
      :show="showSeedModal || !!editSeedData"
      :edit-data="editSeedData"
      @close="showSeedModal = false; editSeedData = null"
      @saved="handleSeedSaved(); editSeedData = null"
    />
    <FruitModal
      :show="showFruitModal || !!editFruitData"
      :edit-data="editFruitData"
      @close="showFruitModal = false; editFruitData = null"
      @saved="handleFruitSaved(); editFruitData = null"
    />
    <ItemModal
      :show="showItemModal || !!editItemData"
      :edit-data="editItemData"
      @close="showItemModal = false; editItemData = null"
      @saved="handleItemSaved(); editItemData = null"
    />

    <!-- 删除确认 -->
    <div v-if="confirmVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="confirm-modal mx-4 max-w-sm w-full">
        <div class="confirm-icon-wrap">
          <span class="confirm-icon">⚠️</span>
        </div>
        <h3 class="confirm-title">
          {{ confirmTitle }}
        </h3>
        <p class="confirm-message">
          {{ confirmMessage }}
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            class="confirm-btn confirm-btn-cancel"
            @click="confirmVisible = false"
          >
            取消
          </button>
          <button
            class="confirm-btn confirm-btn-danger"
            @click="executeConfirm"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="postcss">
/* Tab 选项卡样式 */
.config-tab {
  position: relative;
  font-family: 'Nunito', sans-serif;
}

.config-tab-inactive {
  color: #6b7280;
  background: rgba(0, 0, 0, 0.03);
}

.dark .config-tab-inactive {
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.03);
}

.config-tab-inactive:hover {
  color: #374151;
  background: rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.dark .config-tab-inactive:hover {
  color: #e5e7eb;
  background: rgba(255, 255, 255, 0.06);
}

.config-tab-active {
  color: white;
  transform: translateY(-2px);
}

.seed-tab-active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow:
    0 4px 0 #15803d,
    0 6px 20px rgba(34, 197, 94, 0.4),
    0 0 20px rgba(34, 197, 94, 0.3) inset;
}

.fruit-tab-active {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  box-shadow:
    0 4px 0 #c2410c,
    0 6px 20px rgba(249, 115, 22, 0.4),
    0 0 20px rgba(249, 115, 22, 0.3) inset;
}

.item-tab-active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow:
    0 4px 0 #1d4ed8,
    0 6px 20px rgba(59, 130, 246, 0.4),
    0 0 20px rgba(59, 130, 246, 0.3) inset;
}

.tab-icon {
  display: inline-block;
  animation: tab-icon-bounce 2s ease-in-out infinite;
}

@keyframes tab-icon-bounce {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.15) rotate(-5deg);
  }
  50% {
    transform: scale(1) rotate(0deg);
  }
  75% {
    transform: scale(1.1) rotate(5deg);
  }
}

.tab-badge {
  transition: all 0.3s ease;
}

.tab-badge-inactive {
  background: rgba(0, 0, 0, 0.08);
  color: #6b7280;
}

.dark .tab-badge-inactive {
  background: rgba(255, 255, 255, 0.1);
  color: #9ca3af;
}

.tab-badge-active {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

/* 工具栏样式 */
.config-toolbar {
  background: linear-gradient(180deg, rgba(139, 105, 20, 0.04) 0%, transparent 100%);
  border-bottom: 2px solid rgba(139, 105, 20, 0.08);
}

.dark .config-toolbar {
  background: linear-gradient(180deg, rgba(109, 191, 91, 0.06) 0%, transparent 100%);
  border-bottom: 2px solid rgba(109, 191, 91, 0.1);
}

.section-title {
  margin-right: 8px;
}

.title-icon {
  font-size: 18px;
  animation: wheat-sway 3s ease-in-out infinite;
  display: inline-block;
  transform-origin: bottom center;
}

.title-text {
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 16px;
  color: #8b6914;
  letter-spacing: 0.02em;
}

.dark .title-text {
  color: #6dbf5b;
}

.title-divider {
  width: 2px;
  height: 20px;
  background: linear-gradient(180deg, transparent 0%, rgba(139, 105, 20, 0.3) 50%, transparent 100%);
  margin-left: 4px;
}

.dark .title-divider {
  background: linear-gradient(180deg, transparent 0%, rgba(109, 191, 91, 0.3) 50%, transparent 100%);
}

/* 添加按钮 */
.config-add-btn {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-bottom: 4px solid rgba(0, 0, 0, 0.2);
  box-shadow:
    0 2px 0 rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(34, 197, 94, 0.25);
}

.config-add-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 4px 0 rgba(0, 0, 0, 0.15),
    0 6px 20px rgba(34, 197, 94, 0.35);
}

.config-add-btn:active {
  transform: translateY(2px);
  border-bottom-width: 2px;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.15),
    0 2px 6px rgba(34, 197, 94, 0.2);
}

.config-add-btn-blue {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow:
    0 2px 0 rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(59, 130, 246, 0.25);
}

.config-add-btn-blue:hover {
  box-shadow:
    0 4px 0 rgba(0, 0, 0, 0.15),
    0 6px 20px rgba(59, 130, 246, 0.35);
}

/* 搜索框 */
.config-search-input {
  border: 2px solid rgba(139, 105, 20, 0.15);
  background: linear-gradient(145deg, #ffffff 0%, #fefcf5 100%);
  color: #374151;
}

.dark .config-search-input {
  border: 2px solid rgba(109, 191, 91, 0.2);
  background: linear-gradient(145deg, rgba(45, 55, 45, 0.98) 0%, rgba(30, 40, 30, 0.95) 100%);
  color: #e5e7eb;
}

.config-search-input:focus {
  border-color: var(--theme-primary);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--theme-primary) 15%, transparent),
    0 0 16px color-mix(in srgb, var(--theme-primary) 30%, transparent);
  transform: translateY(-1px);
}

.search-icon {
  transition: transform 0.3s ease;
}

.config-search:focus-within .search-icon {
  transform: translateY(-50%) scale(1.15);
  filter: drop-shadow(0 0 4px var(--theme-primary));
}

/* 表格美化 */
.config-table-wrap {
  background: linear-gradient(145deg, #ffffff 0%, #fefcf5 100%);
  border: 2px solid rgba(139, 105, 20, 0.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 4px 16px rgba(139, 105, 20, 0.1);
}

.dark .config-table-wrap {
  background: linear-gradient(145deg, rgba(45, 55, 45, 0.98) 0%, rgba(30, 40, 30, 0.95) 100%);
  border: 2px solid rgba(109, 191, 91, 0.15);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 4px 16px rgba(0, 0, 0, 0.3);
}

.config-table-head {
  background: linear-gradient(180deg, rgba(139, 105, 20, 0.08) 0%, rgba(139, 105, 20, 0.04) 100%);
  border-bottom: 2px solid rgba(139, 105, 20, 0.15);
}

.dark .config-table-head {
  background: linear-gradient(180deg, rgba(109, 191, 91, 0.1) 0%, rgba(109, 191, 91, 0.05) 100%);
  border-bottom: 2px solid rgba(109, 191, 91, 0.2);
}

.config-table-head th {
  color: #8b6914;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-weight: normal;
  letter-spacing: 0.03em;
  font-size: 13px;
}

.dark .config-table-head th {
  color: #6dbf5b;
}

.config-table-body {
  border: none;
}

.config-table-row {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.row-even {
  background: rgba(139, 105, 20, 0.02);
}

.dark .row-even {
  background: rgba(109, 191, 91, 0.02);
}

.row-odd {
  background: transparent;
}

.config-table-row:hover {
  background: color-mix(in srgb, var(--theme-primary) 8%, transparent);
  transform: scale(1.002);
  box-shadow: 0 2px 12px rgba(139, 105, 20, 0.1);
}

.dark .config-table-row:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.row-sticky-cell {
  background: inherit;
}

.config-item-icon {
  background: linear-gradient(145deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid rgba(217, 119, 6, 0.2);
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.15);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.config-table-row:hover .config-item-icon {
  transform: scale(1.1) rotate(-3deg);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
}

/* 操作按钮 */
.config-action-btn {
  position: relative;
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-bottom: 3px solid rgba(0, 0, 0, 0.12);
  background: white;
}

.dark .config-action-btn {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.config-action-btn:hover {
  transform: translateY(-2px) scale(1.05);
}

.config-action-btn:active {
  transform: translateY(1px) scale(0.98);
  border-bottom-width: 2px;
}

.config-action-btn-primary {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.2);
  border-bottom-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.config-action-btn-primary:hover {
  background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%);
  box-shadow:
    0 4px 16px rgba(59, 130, 246, 0.3),
    0 0 12px rgba(59, 130, 246, 0.2);
}

.dark .config-action-btn-primary {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.25) 100%);
  color: #93c5fd;
}

.config-action-btn-warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border-color: rgba(245, 158, 11, 0.2);
  border-bottom-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
}

.config-action-btn-warning:hover {
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
  box-shadow:
    0 4px 16px rgba(245, 158, 11, 0.3),
    0 0 12px rgba(245, 158, 11, 0.2);
}

.dark .config-action-btn-warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.25) 100%);
  color: #fcd34d;
}

.config-action-btn-danger {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.2);
  border-bottom-color: rgba(239, 68, 68, 0.3);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
}

.config-action-btn-danger:hover {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  box-shadow:
    0 4px 16px rgba(239, 68, 68, 0.3),
    0 0 12px rgba(239, 68, 68, 0.2);
}

.dark .config-action-btn-danger {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.25) 100%);
  color: #fca5a5;
}

/* 确认弹窗 */
.confirm-modal {
  position: relative;
  background: linear-gradient(145deg, #ffffff 0%, #fefcf5 100%);
  border-radius: 24px;
  padding: 32px 28px 28px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.8) inset,
    0 10px 0 rgba(139, 105, 20, 0.15),
    0 16px 48px rgba(0, 0, 0, 0.25);
  border: 3px solid rgba(139, 105, 20, 0.15);
  animation: confirm-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dark .confirm-modal {
  background: linear-gradient(145deg, rgba(45, 55, 45, 0.98) 0%, rgba(30, 40, 30, 0.95) 100%);
  border-color: rgba(109, 191, 91, 0.2);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.05) inset,
    0 10px 0 rgba(0, 0, 0, 0.3),
    0 16px 48px rgba(0, 0, 0, 0.5);
}

@keyframes confirm-pop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  60% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.confirm-icon-wrap {
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 4px solid white;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: icon-bounce 2s ease-in-out infinite;
}

.dark .confirm-icon-wrap {
  border-color: rgba(30, 40, 30, 0.95);
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.3) 100%);
}

@keyframes icon-bounce {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-6px);
  }
}

.confirm-icon {
  font-size: 28px;
}

.confirm-title {
  text-align: center;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 20px;
  color: #8b6914;
  margin-top: 16px;
  letter-spacing: 0.03em;
}

.dark .confirm-title {
  color: #6dbf5b;
}

.confirm-message {
  text-align: center;
  font-size: 14px;
  color: #6b7280;
  margin-top: 12px;
  line-height: 1.6;
}

.dark .confirm-message {
  color: #9ca3af;
}

.confirm-btn {
  padding: 10px 24px;
  border-radius: 14px;
  font-weight: 700;
  font-size: 14px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-bottom: 4px solid rgba(0, 0, 0, 0.15);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.confirm-btn:hover {
  transform: translateY(-2px);
}

.confirm-btn:active {
  transform: translateY(2px);
  border-bottom-width: 2px;
}

.confirm-btn-cancel {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  color: #4b5563;
  box-shadow:
    0 2px 0 rgba(0, 0, 0, 0.1),
    0 4px 12px rgba(0, 0, 0, 0.08);
}

.confirm-btn-cancel:hover {
  box-shadow:
    0 4px 0 rgba(0, 0, 0, 0.1),
    0 6px 20px rgba(0, 0, 0, 0.12);
}

.dark .confirm-btn-cancel {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  color: #d1d5db;
}

.confirm-btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow:
    0 2px 0 #991b1b,
    0 4px 12px rgba(239, 68, 68, 0.35);
}

.confirm-btn-danger:hover {
  box-shadow:
    0 4px 0 #991b1b,
    0 6px 24px rgba(239, 68, 68, 0.45),
    0 0 20px rgba(239, 68, 68, 0.3);
}

@keyframes wheat-sway {
  0%,
  100% {
    transform: rotate(-5deg);
  }
  50% {
    transform: rotate(5deg);
  }
}
</style>
