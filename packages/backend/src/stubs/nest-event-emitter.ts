import { EventEmitter } from 'events'

export class EventEmitter2 {
  private readonly emitter = new EventEmitter()

  on(event: string | symbol, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener)
  }

  emit(event: string | symbol, payload?: any) {
    this.emitter.emit(event, payload)
  }

  removeAllListeners() {
    this.emitter.removeAllListeners()
  }
}
