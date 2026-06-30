<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useAccountStore } from '@/stores/account'
import { useSoundStore } from '@/stores/sound'
import { useStatusStore } from '@/stores/status'

/**
 * 监听 Socket 推送, 自动播放音效
 * - 'sound:play' 事件(后端推送)
 * - 'account-log:new' 中提取事件
 */

const statusStore = useStatusStore()
const accountStore = useAccountStore()
const sound = useSoundStore()

const unlockedAt = ref<Record<string, boolean>>({})

function handleSoundPlay(payload: any) {
  if (!payload) return
  const s = String(payload.sound || '').trim()
  if (s) sound.play(s)
}

function handleAccountLog(payload: any) {
  if (!payload) return
  const meta = (payload && payload.meta) || {}
  const event = String(meta.event || '')
  const key = `evt:${event}`
  if (!event) return
  if (unlockedAt.value[key]) return
  unlockedAt.value[key] = true
  // 简单映射
  const map: Record<string, string> = {
    harvest_crop: 'harvest',
    plant_seed: 'plant',
    fertilize: 'fertilize',
    fertilizer_buy: 'fertilize',
    fertilizer_gift_open: 'fertilize',
    sell_success: 'sell',
    steal: 'steal',
    task_claim: 'reward',
    illustrated_rewards: 'reward',
    email_rewards: 'reward',
    vip_daily_gift: 'reward',
    month_card_gift: 'reward',
    daily_share: 'reward',
    mall_free_gifts: 'reward',
    upgrade_land: 'reward',
    unlock_land: 'reward',
  }
  const soundKey = map[event]
  if (soundKey) sound.play(soundKey)
}

onMounted(() => {
  if (accountStore.currentAccountId) {
    statusStore.connectRealtime(accountStore.currentAccountId)
  }
  else {
    statusStore.connectRealtime('all')
  }
  document.addEventListener('sound:play', (e: any) => handleSoundPlay(e.detail))
  document.addEventListener('account-log:new', (e: any) => handleAccountLog(e.detail))
})

onUnmounted(() => {
  document.removeEventListener('sound:play', handleSoundPlay as any)
  document.removeEventListener('account-log:new', handleAccountLog as any)
})
</script>

<template>
  <div class="hidden" />
</template>
