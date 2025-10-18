export interface GameSummary {
  id: string
  name: string
  status: 'waiting' | 'in-progress' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface GameSettings {
  maxPlayers: number
  minPlayers: number
  tickRate: number
}
