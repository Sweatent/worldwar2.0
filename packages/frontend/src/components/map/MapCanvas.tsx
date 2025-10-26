import { useEffect, useRef } from 'react'
import type { Battle } from '../../types/game'
import { BattleVisualization } from './BattleVisualization'
import { FogOfWarSystem } from './FogOfWarSystem'
import { LayeredMapSystem } from './LayeredMapSystem'
import { UnitMovementSystem } from './UnitMovementSystem'

interface MapCanvasProps {
  onBattleSelected?: (battle: Battle) => void
  currentPlayerId?: string
}

export function MapCanvas({ onBattleSelected, currentPlayerId }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapSystemRef = useRef<LayeredMapSystem>()
  const fogSystemRef = useRef<FogOfWarSystem>()
  const movementSystemRef = useRef<UnitMovementSystem>()
  const battleVisRef = useRef<BattleVisualization>()

  useEffect(() => {
    if (!containerRef.current) return

    const movementSystem = new UnitMovementSystem()
    movementSystemRef.current = movementSystem

    const mapSystem = new LayeredMapSystem(containerRef.current, {
      movementSystem,
    })
    mapSystemRef.current = mapSystem

    const fogSystem = new FogOfWarSystem()
    fogSystemRef.current = fogSystem

    const fogLayer = fogSystem.initializeFog()
    mapSystem.attachOverlayLayer(fogLayer)

    const battleVis = new BattleVisualization((battleTerritoryId) => {
      mapSystem.zoomToTerritory(battleTerritoryId, 2.5)
    })
    battleVisRef.current = battleVis

    if (currentPlayerId) {
      fogSystem.updateVision(currentPlayerId)
    }

    return () => {
      mapSystem.destroy()
      movementSystem.destroy()
      battleVis.destroy()
    }
  }, [currentPlayerId])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-slate-900"
      style={{ touchAction: 'none' }}
    />
  )
}

export { LayeredMapSystem, FogOfWarSystem, UnitMovementSystem, BattleVisualization }
