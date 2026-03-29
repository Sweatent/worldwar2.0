// Zustand-like game store for the WW2 strategy game
// Note: This implementation avoids external dependencies to keep the repo self-contained.
// It provides a minimal API similar to Zustand for local usage.

export type ID = string | number

export interface Player {
  id: ID
  name: string
}

export interface Resources {
  food: number
  wood: number
  ore: number
  energy: number
  oil: number
  uranium: number
}

export interface Nation {
  id: ID
  name: string
  resources: Resources
}

export interface Territory {
  id: ID
  name: string
  type: string
  polygon?: number[]
  ownerId?: ID
}

export interface Achievement {
  id: ID
  name: string
  description: string
  rarity: 1 | 2 | 3 | 4 | 5
}

export interface GameEvent {
  id: ID
  type: string
  timestamp: number
  payload?: Record<string, unknown>
}

export type GamePhase = 'ECONOMY' | 'DIPLOMACY' | 'MILITARY' | 'TECH' | 'EVENTS'

export interface GameState {
  currentTurn: number
  phase: GamePhase
}

export interface GameRoom {
  id: ID
  code: string
  name: string
}

export interface GameStore {
  // 玩家信息
  player: Player | null
  setPlayer: (player: Player) => void

  // 当前房间
  currentRoom: GameRoom | null
  setCurrentRoom: (room: GameRoom) => void

  // 游戏状态
  gameState: GameState | null
  setGameState: (state: GameState) => void

  // 当前选中
  selectedNation: Nation | null
  selectedTerritory: Territory | null
  selectNation: (nation: Nation) => void
  selectTerritory: (territory: Territory) => void

  // UI状态
  isMapLoading: boolean
  isPaused: boolean
  gameSpeed: number
  setGameSpeed: (speed: number) => void

  // 心理学追踪
  playTime: number // 总游戏时长（秒）
  achievements: Achievement[]
  recentEvents: GameEvent[]
  addRecentEvent: (event: GameEvent) => void
}

// A very small reactive store implementation using subscriptions
// This mimics a subset of Zustand API: a hook returning the whole state object.
// For simplicity, selector support is not implemented, but can be added later.

export type Subscriber = () => void

const listeners = new Set<Subscriber>()

function notify() {
  listeners.forEach((l) => {
    try { l() } catch { /* noop */ }
  })
}

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function savePersisted<T>(key: string, value: T) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

const PERSIST_KEY = 'ww2-game-storage'

const persisted = loadPersisted<{ player: Player | null; playTime: number }>(
  PERSIST_KEY,
  { player: null, playTime: 0 }
)

const state: GameStore = {
  player: persisted.player ?? null,
  setPlayer: (player) => {
    state.player = player
    persistPartial()
    notify()
  },

  currentRoom: null,
  setCurrentRoom: (room) => {
    state.currentRoom = room
    notify()
  },

  gameState: { currentTurn: 1, phase: 'ECONOMY' },
  setGameState: (gs) => {
    state.gameState = gs
    notify()
  },

  selectedNation: null,
  selectedTerritory: null,
  selectNation: (nation) => {
    state.selectedNation = nation
    notify()
  },
  selectTerritory: (territory) => {
    state.selectedTerritory = territory
    notify()
  },

  isMapLoading: true,
  isPaused: false,
  gameSpeed: 1,
  setGameSpeed: (speed) => {
    state.gameSpeed = Math.max(0.25, Math.min(5, speed))
    notify()
  },

  playTime: persisted.playTime ?? 0,
  achievements: [],
  recentEvents: [],
  addRecentEvent: (event) => {
    state.recentEvents = [event, ...state.recentEvents].slice(0, 10)
    notify()
  },
}

function persistPartial() {
  savePersisted(PERSIST_KEY, {
    player: state.player,
    playTime: state.playTime,
  })
}

// A React-like subscription API (doesn't import React to keep self-contained)
// Consumers can subscribe via subscribe() and manually trigger re-renders in a framework.
export function subscribe(listener: Subscriber) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getState(): GameStore {
  return state
}

// React hook wrapper for convenience (optional for frameworks)
// This uses a very light shim around the subscribe/getState to work without external deps.
// If React is present, consumers can use this hook. If not, they can directly use getState/subscribe.
export function useGameStore(): GameStore {
  // Lazy require React only when actually used to avoid hard dependency at repo level
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React: any = require('react')
  const [_, setTick] = React.useState(0)
  React.useEffect(() => {
    const unsub = subscribe(() => setTick((t) => t + 1))
    return () => unsub()
  }, [])
  return getState()
}

// Utility helpers frequently used by UI components
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(Math.floor(n))
}

export function formatTime(total: number): string {
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export function getRarityStars(rarity: number): string {
  const r = Math.max(1, Math.min(5, Math.floor(rarity)))
  return '★'.repeat(r) + '☆'.repeat(5 - r)
}
