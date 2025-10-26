export class PerformanceMonitor {
  private fpsHistory: number[] = []
  private lastFrameTime: number = performance.now()
  private frameCount: number = 0
  private currentFPS: number = 0
  private memoryUsage: number = 0

  update() {
    this.frameCount++
    const now = performance.now()
    const delta = now - this.lastFrameTime

    if (delta >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / delta)
      this.fpsHistory.push(this.currentFPS)

      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift()
      }

      this.frameCount = 0
      this.lastFrameTime = now

      if ('memory' in performance && (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory) {
        const memory = (performance as Performance & { memory: { usedJSHeapSize: number } }).memory
        this.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024)
      }
    }
  }

  getFPS(): number {
    return this.currentFPS
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.fpsHistory.length)
  }

  getMemoryUsage(): number {
    return this.memoryUsage
  }

  getStats() {
    return {
      currentFPS: this.currentFPS,
      averageFPS: this.getAverageFPS(),
      memoryUsageMB: this.memoryUsage,
      minFPS: Math.min(...this.fpsHistory),
      maxFPS: Math.max(...this.fpsHistory),
    }
  }
}
