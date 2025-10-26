import * as PIXI from 'pixi.js'
import { useGameStore } from '../../store/gameStore'
import type { MilitaryUnit, Nation } from '../../types/game'
import { UnitType } from '../../types/game'

export enum VisionLevel {
  UNEXPLORED = 0,
  EXPLORED = 1,
  VISIBLE = 2,
}

interface TerritoryVision {
  level: VisionLevel
  sprite: PIXI.Graphics
}

export class FogOfWarSystem {
  private fogLayer: PIXI.Container = new PIXI.Container()
  private visionMap: Map<string, TerritoryVision> = new Map()

  initializeFog(): PIXI.Container {
    this.fogLayer.removeChildren()
    this.fogLayer.name = 'fog_of_war'

    const territories = useGameStore.getState().gameState?.territories || []

    for (const territory of territories) {
      const fog = new PIXI.Graphics()
      fog.beginFill(0x000000, 0.8)
      fog.drawPolygon(territory.polygon)
      fog.endFill()

      fog.name = `fog_${territory.id}`
      this.fogLayer.addChild(fog)

      this.visionMap.set(territory.id, {
        level: VisionLevel.UNEXPLORED,
        sprite: fog,
      })
    }

    return this.fogLayer
  }

  updateVision(nationId: string) {
    const nation = this.findNation(nationId)
    if (!nation) return

    for (const [territoryId, vision] of this.visionMap.entries()) {
      if (vision.level === VisionLevel.VISIBLE) {
        this.setVisionLevel(territoryId, VisionLevel.EXPLORED)
      }
    }

    for (const territory of nation.territories) {
      this.setVisionLevel(territory.id, VisionLevel.VISIBLE)

      const neighbors = this.getNeighbors(territory.id)
      for (const neighborId of neighbors) {
        const currentLevel = this.visionMap.get(neighborId)?.level
        if (currentLevel === undefined) continue

        if (currentLevel === VisionLevel.UNEXPLORED) {
          this.setVisionLevel(neighborId, VisionLevel.EXPLORED)
        } else {
          this.setVisionLevel(neighborId, VisionLevel.VISIBLE)
        }
      }
    }

    for (const unit of nation.units) {
      const visionRange = this.getUnitVisionRange(unit)
      const territoriesInRange = this.getTerritoriesInRange(unit.territoryId, visionRange)

      for (const territoryId of territoriesInRange) {
        this.setVisionLevel(territoryId, VisionLevel.VISIBLE)
      }
    }
  }

  private findNation(nationId: string): Nation | undefined {
    return useGameStore.getState().gameState?.nations.find((n) => n.id === nationId)
  }

  private setVisionLevel(territoryId: string, level: VisionLevel) {
    const vision = this.visionMap.get(territoryId)
    if (!vision) return

    vision.level = level

    switch (level) {
      case VisionLevel.UNEXPLORED:
        vision.sprite.alpha = 0.9
        vision.sprite.tint = 0x000000
        break
      case VisionLevel.EXPLORED:
        vision.sprite.alpha = 0.5
        vision.sprite.tint = 0x666666
        break
      case VisionLevel.VISIBLE:
        vision.sprite.alpha = 0
        break
    }
  }

  private getNeighbors(territoryId: string): string[] {
    const territories = useGameStore.getState().gameState?.territories || []
    const territory = territories.find((t) => t.id === territoryId)
    return territory?.neighbors ?? []
  }

  private getTerritoriesInRange(territoryId: string, range: number): string[] {
    const territories = useGameStore.getState().gameState?.territories || []
    const visited = new Set<string>()
    const queue: { id: string; depth: number }[] = [{ id: territoryId, depth: 0 }]
    const results: string[] = []

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      results.push(id)

      if (depth >= range) continue

      const neighbors = territories.find((t) => t.id === id)?.neighbors || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ id: neighbor, depth: depth + 1 })
        }
      }
    }

    return results
  }

  private getUnitVisionRange(unit: MilitaryUnit): number {
    const visionRanges: Partial<Record<UnitType, number>> = {
      INFANTRY: 1,
      MECHANIZED_INFANTRY: 2,
      TANK: 2,
      ARTILLERY: 1,
      AIRCRAFT: 5,
      RECONNAISSANCE: 4,
      ANTI_AIR: 1,
    }
    return visionRanges[unit.type] ?? 1
  }

  getFogLayer(): PIXI.Container {
    return this.fogLayer
  }
}
