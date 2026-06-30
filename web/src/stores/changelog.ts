import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

/**
 * 版本更新弹窗（changelog）的全局状态
 *
 * - `showModal`     是否显示弹窗
 * - `open()` / `close()`  手动打开 / 关闭
 * - `checkForNewVersion()` 首次访问时若发现新版本，自动弹一次
 *
 * `lastSeenVersion` 持久化在 localStorage，记录用户最后一次确认的版本。
 * 当后端 changelog 的 `version` 与之不同，即视为有新版本。
 */
export const useChangelogStore = defineStore('changelog', () => {
  const showModal = ref(false)
  const lastSeenVersion = useStorage<string>('changelog:last_seen_version', '')

  function open() {
    showModal.value = true
  }

  function close() {
    showModal.value = false
  }

  /**
   * 标记当前版本为已读
   * 由 ChangelogModal 在关闭时调用，确保自动弹窗只会出现一次
   */
  function markSeen(version?: string) {
    if (version)
      lastSeenVersion.value = version
  }

  /**
   * 检查是否有新版本，若有则自动打开弹窗
   * - 拉取失败时静默不弹
   * - 后端 version 为空时不弹
   * - 首次访问（lastSeen 为空）时弹一次，之后相同版本不再弹
   */
  async function checkForNewVersion() {
    try {
      const res = await api.get('/api/changelog', { skipErrorToast: true } as any)
      const data = res.data?.data
      if (!data || !data.version)
        return
      const current = String(data.version)
      if (!lastSeenVersion.value) {
        // 首次访问，弹一次
        lastSeenVersion.value = current
        showModal.value = true
        return
      }
      if (current !== lastSeenVersion.value) {
        showModal.value = true
      }
    }
    catch {
      // 静默失败
    }
  }

  return {
    showModal,
    lastSeenVersion,
    open,
    close,
    markSeen,
    checkForNewVersion,
  }
})
