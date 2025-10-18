export type GameRoomStatus = 'WAITING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED'
export type GameMode = 'STANDARD' | 'LIGHTNING' | 'EPIC'
export type TurnPhase = 'ECONOMY' | 'DIPLOMACY' | 'MILITARY' | 'TECH' | 'EVENTS'

export interface Player {
  id: string
  username: string
  email: string
  passwordHash: string
  lastPlayedAt?: Date | null
  createdAt: Date
}

export type PlayerCreateInput = {
  username: string
  email: string
  passwordHash: string
  lastPlayedAt?: Date | null
}

export interface GameRoom {
  id: string
  roomCode: string
  name: string
  hostId: string
  minPlayers: number
  maxPlayers: number
  gameMode: GameMode
  victoryThreshold: number
  mapSize: 'SMALL' | 'MEDIUM' | 'LARGE'
  status: GameRoomStatus
  startedAt?: Date | null
  createdAt: Date
  currentTurn: number
}

export interface GameRoomPlayer {
  id: string
  gameRoomId: string
  playerId: string
  isReady: boolean
  joinedAt: Date
}

export interface Territory {
  id: string
  name: string
  resourceYield: ResourceBag
}

export interface Unit {
  id: string
  type: string
  strength: number
}

export interface Technology {
  id: string
  name: string
  status: 'IN_PROGRESS' | 'COMPLETED'
}

export interface DiplomaticRelation {
  id: string
  withNationId: string
  status: 'ALLY' | 'NEUTRAL' | 'HOSTILE'
}

export interface ResourceBag {
  food: number
  industry: number
  science: number
  culture: number
}

export interface Nation {
  id: string
  gameRoomId: string
  playerId: string
  name: string
  resources: ResourceBag
  stability: number
  cohesion: number
  population: bigint
  territories: Territory[]
  units: Unit[]
  technologies: Technology[]
  diplomaticRelations: DiplomaticRelation[]
}

export interface GameStateRecord {
  id: string
  gameRoomId: string
  stateData: GameStateSnapshot
  turn: number
  phase: TurnPhase
  savedAt: Date
}

export interface GameStateHistoryRecord {
  id: string
  gameRoomId: string
  stateData: GameStateSnapshot
  turn: number
  phase: TurnPhase
  createdAt: Date
}

export interface GameEventRecord {
  id: string
  gameRoomId: string
  type: string
  payload: any
  createdAt: Date
}

export interface GameStateSnapshot {
  timestamp: number
  turn: number
  phase: TurnPhase
  nations: SerializedNation[]
  events: Array<{
    id: string
    type: string
    createdAt: number
  }>
}

export interface SerializedNation {
  id: string
  name: string
  playerId: string
  resources: ResourceBag
  stability: number
  cohesion: number
  population: string
  territories: string[]
  units: number
  technologies: number
  diplomaticRelations: Array<{
    withNationId: string
    status: string
  }>
}

export interface CreateRoomDto {
  name: string
  minPlayers?: number
  maxPlayers?: number
  gameMode?: GameMode
  victoryThreshold?: number
  mapSize?: 'SMALL' | 'MEDIUM' | 'LARGE'
}

export interface GameTurnState {
  roomId: string
  currentTurn: number
  phase: TurnPhase
  turnStartTime: number
  turnDuration: number
  playerActions: Map<string, any>
  active: boolean
  paused: boolean
  gameSpeed: number
}
