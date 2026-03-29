// Simple sound feedback system with graceful fallback

const soundBank: Record<string, string> = {
  territory_select: '',
  turn_end: '',
  time_warning: '',
}

let audioCtx: AudioContext | null = null

function ensureCtx() {
  try {
    if (typeof window === 'undefined') return null
    // @ts-ignore
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return null
    if (!audioCtx) audioCtx = new Ctx()
    return audioCtx
  } catch {
    return null
  }
}

export function playSound(name: keyof typeof soundBank | string) {
  try {
    const src = soundBank[name as string]
    if (src) {
      const audio = new Audio(src)
      void audio.play()
      return
    }
    // Beep fallback
    const ctx = ensureCtx()
    if (ctx) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(880, ctx.currentTime)
      g.gain.setValueAtTime(0.001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15)
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + 0.16)
    }
  } catch {
    // noop
  }
}
