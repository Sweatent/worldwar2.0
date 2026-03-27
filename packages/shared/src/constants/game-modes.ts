// Shared game modes configuration
// Note: duration is stored as a human-readable range string like "30-45"

export type GameModeId = 'LIGHTNING' | 'STANDARD' | 'EPIC'

export type GameMode = {
  id: GameModeId
  name: string
  duration: string // minutes range, e.g., "30-45"
  turnDuration: number // seconds per turn
  techTreeSimplified: boolean
  mapSize: 'SMALL' | 'MEDIUM' | 'LARGE'
  startingResources: number // multiplier
  eventFrequency: number
  description: string
}

export const GAME_MODES: Record<GameModeId, GameMode> = {
  LIGHTNING: {
    id: 'LIGHTNING',
    name: '闪电战',
    duration: '30-45',
    turnDuration: 60,
    techTreeSimplified: true,
    mapSize: 'SMALL',
    startingResources: 2.0,
    eventFrequency: 0.5,
    description: '快节奏对战，快速决策，30-45分钟完成一局',
  },
  STANDARD: {
    id: 'STANDARD',
    name: '标准模式',
    duration: '60-120',
    turnDuration: 120,
    techTreeSimplified: false,
    mapSize: 'MEDIUM',
    startingResources: 1.0,
    eventFrequency: 1.0,
    description: '平衡的游戏体验，完整的策略深度',
  },
  EPIC: {
    id: 'EPIC',
    name: '史诗模式',
    duration: '180-240',
    turnDuration: 300,
    techTreeSimplified: false,
    mapSize: 'LARGE',
    startingResources: 0.8,
    eventFrequency: 1.5,
    description: '完整的世界大战体验，深度策略和外交博弈',
  },
} as const

export type GameModesMap = typeof GAME_MODES
