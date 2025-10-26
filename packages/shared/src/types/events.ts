export type EventCategory = 'economy' | 'military' | 'diplomacy' | 'technology'

export interface GameEvent {
  id: string
  name: string
  description: string
  category: EventCategory
  triggeredAt: string
}
