// Resources data structure
export interface Resources {
  // Basic resources
  food: number
  wood: number
  ore: number
  energy: number
  
  // Strategic resources
  rubber: number
  rareMetals: number
  oil: number
  uranium: number
  
  // Special resources
  money: number
  researchPoints: number
  manpower: number  // Manpower (troops/labor)
}

// Game configuration
export interface GameConfig {
  minPlayers: number
  maxPlayers: number
  victoryThreshold: number
  turnDuration?: number
  gameSpeed: number
}

// Real-time game state for Redis
export interface RealtimeGameState {
  currentTurn: number
  phase: string
  activePlayerIds: string[]
  lastUpdateAt: number
}

// Player session for Redis
export interface PlayerSession {
  socketId: string
  currentRoomId: string | null
  lastActiveAt: number
  isOnline: boolean
}

// Leaderboard entry
export interface LeaderboardEntry {
  nationId: string
  score: number
  name: string
}

// Game action for message queue
export interface GameAction {
  type: string
  playerId: string
  data: any
  timestamp: number
}

// Tech effect configuration
export interface TechEffect {
  type: 'MILITARY' | 'ECONOMIC' | 'DIPLOMATIC' | 'SOCIAL'
  target: string
  value: number | string
  description: string
}

// Event option
export interface EventOption {
  id: string
  label: string
  consequences: Record<string, any>
  requirements?: Record<string, any>
}

// Diplomatic modifier
export interface DiplomaticModifier {
  source: string
  value: number
  expiresAt?: number
}

// General trait
export interface GeneralTrait {
  id: string
  name: string
  description: string
  effects: Record<string, number>
}

// Achievement condition
export interface AchievementCondition {
  type: string
  requirements: Record<string, any>
}

// Building effect
export interface BuildingEffect {
  resourceProduction?: Partial<Resources>
  militaryBonus?: number
  stabilityBonus?: number
  other?: Record<string, any>
}

// Policy configuration
export interface PolicyConfig {
  economicPolicy: 'FREE_MARKET' | 'PLANNED' | 'MIXED'
  conscription: 'VOLUNTEER' | 'LIMITED' | 'MASS'
  freedomLevel: number // 0-100
  propaganda: boolean
}

// Map configuration
export interface MapConfig {
  width: number
  height: number
  seed: string
  territoriesCount: number
}

// Battle result
export interface BattleResult {
  winnerId: string
  loserId: string
  attackerLosses: number
  defenderLosses: number
  territoryChanged: boolean
}

// Redis cache keys
export const RedisCacheKeys = {
  gameRoomState: (roomId: string) => `game:room:${roomId}:state`,
  playerSession: (playerId: string) => `player:session:${playerId}`,
  roomPlayers: (roomId: string) => `game:room:${roomId}:players`,
  leaderboardMilitary: (roomId: string) => `leaderboard:military:${roomId}`,
  leaderboardEconomy: (roomId: string) => `leaderboard:economy:${roomId}`,
  gameActions: (roomId: string) => `game:room:${roomId}:actions`,
  gameEventsChannel: (roomId: string) => `game:room:${roomId}:events`,
} as const

// Cache TTL configurations (in seconds)
export const CacheTTL = {
  GAME_STATE: 3600, // 1 hour after game ends
  PLAYER_SESSION: 604800, // 7 days
  LEADERBOARD: 300, // 5 minutes
  ACTIONS_QUEUE: 60, // 1 minute
} as const
