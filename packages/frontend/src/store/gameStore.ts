import { useSyncExternalStore } from 'react'
import type { Battle, GameState, Movement, Nation, Territory } from '../types/game'

export interface GameStoreState {
  gameState: GameState | null
}

export type GameStoreSelector<T> = (state: GameStoreState) => T

const state: GameStoreState = {
  gameState: null,
}

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): GameStoreState {
  return state
}

function setState(partial: Partial<GameStoreState>) {
  Object.assign(state, partial)
  emit()
}

export function initializeGameState(initialState: GameState) {
  setState({ gameState: initialState })
}

export function updateNations(nations: Nation[]) {
  if (!state.gameState) return
  setState({
    gameState: { ...state.gameState, nations },
  })
}

export function updateTerritories(territories: Territory[]) {
  if (!state.gameState) return
  setState({
    gameState: { ...state.gameState, territories },
  })
}

export function updateBattles(battles: Battle[]) {
  if (!state.gameState) return
  setState({
    gameState: { ...state.gameState, battles },
  })
}

export function updateMovements(movements: Movement[]) {
  if (!state.gameState) return
  setState({
    gameState: { ...state.gameState, movements },
  })
}

function defaultSelector<T>(store: GameStoreState): T {
  return store as unknown as T
}

function equalityCheck<T>(a: T, b: T): boolean {
  return Object.is(a, b)
}

function useGameStore<T = GameStoreState>(
  selector: GameStoreSelector<T> = defaultSelector,
  compare: (a: T, b: T) => boolean = equalityCheck
) {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
    compare
  )
}

useGameStore.getState = () => getSnapshot()
useGameStore.setState = setState

export { useGameStore }
