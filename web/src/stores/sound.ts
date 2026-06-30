import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 音效系统 - 使用 Web Audio API 直接合成音效
 * 不依赖音频文件,减小包体积
 */

const SOUND_DEFS: Record<string, { freq: number; duration: number; type?: OscillatorType; vol?: number; second?: { freq: number; delay: number } }> = {
  harvest: { freq: 660, duration: 0.18, type: 'sine', vol: 0.18, second: { freq: 880, delay: 0.08 } },
  plant: { freq: 440, duration: 0.15, type: 'triangle', vol: 0.16 },
  fertilize: { freq: 523, duration: 0.12, type: 'sine', vol: 0.18, second: { freq: 659, delay: 0.06 } },
  sell: { freq: 587, duration: 0.2, type: 'triangle', vol: 0.18, second: { freq: 880, delay: 0.1 } },
  steal: { freq: 300, duration: 0.1, type: 'square', vol: 0.10, second: { freq: 200, delay: 0.05 } },
  reward: { freq: 523, duration: 0.1, type: 'sine', vol: 0.18, second: { freq: 659, delay: 0.1 } },
  error: { freq: 220, duration: 0.2, type: 'sawtooth', vol: 0.16 },
  unlock: { freq: 660, duration: 0.15, type: 'sine', vol: 0.20, second: { freq: 880, delay: 0.15 } },
  report: { freq: 440, duration: 0.2, type: 'sine', vol: 0.18, second: { freq: 554, delay: 0.2 } },
  holiday: { freq: 523, duration: 0.2, type: 'triangle', vol: 0.18, second: { freq: 659, delay: 0.2 } },
}

export const useSoundStore = defineStore('sound', () => {
  const enabled = ref(true)
  const volume = ref(0.5) // 0 - 1
  let audioCtx: AudioContext | null = null

  function ensureCtx() {
    if (audioCtx) {
      return audioCtx
    }
    try {
      const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return null
      audioCtx = new Ctx()
      return audioCtx
    } catch {
      return null
    }
  }

  function play(soundKey: string) {
    if (!enabled.value) return
    const def = SOUND_DEFS[soundKey]
    if (!def) return
    const ctx = ensureCtx()
    if (!ctx) return

    // 浏览器要求用户交互后才能播放
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const baseVol = (def.vol ?? 0.18) * Math.max(0, Math.min(1, volume.value))
    const oscType: OscillatorType = def.type || 'sine'

    function tone(freq: number, startTime: number, duration: number) {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = oscType
      osc.frequency.setValueAtTime(freq, startTime)
      // ADSR-like envelope to avoid click
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(baseVol, startTime + 0.01)
      gain.gain.linearRampToValueAtTime(0, startTime + duration)
      osc.connect(gain)
      gain.connect(ctx!.destination)
      osc.start(startTime)
      osc.stop(startTime + duration + 0.02)
    }

    tone(def.freq, now, def.duration)
    if (def.second) {
      tone(def.second.freq, now + def.second.delay, def.duration)
    }
  }

  function setEnabled(v: boolean) {
    enabled.value = v
  }

  function setVolume(v: number) {
    volume.value = Math.max(0, Math.min(1, v))
  }

  return {
    enabled,
    volume,
    play,
    setEnabled,
    setVolume,
  }
})
