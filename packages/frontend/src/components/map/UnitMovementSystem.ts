import * as PIXI from 'pixi.js'
import type { MilitaryUnit, PathNode, Point, Territory, TerrainType } from '../../types/game'
import { UNIT_DEFINITIONS } from '../../types/game'

interface UnitMovement {
  unitId: string
  path: PathNode[]
  progress: number
  sprite: PIXI.Sprite
}

export class UnitMovementSystem {
  private movingUnits: Map<string, UnitMovement> = new Map()
  private unitSprites: Map<string, PIXI.Sprite> = new Map()
  private eventEmitter: EventEmitter = new EventEmitter()

  calculatePath(
    from: Territory,
    to: Territory,
    unit: MilitaryUnit,
    territories: Territory[]
  ): PathNode[] {
    const openSet: PathNode[] = [{ territory: from, g: 0, h: 0, f: 0, parent: null }]
    const closedSet: Set<string> = new Set()

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f)
      const current = openSet.shift()!

      if (current.territory.id === to.id) {
        return this.reconstructPath(current)
      }

      closedSet.add(current.territory.id)

      const neighbors = this.getNeighbors(current.territory, territories)
      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor.id)) continue

        const movementCost = this.getMovementCost(unit, neighbor.type)
        const g = current.g + movementCost
        const h = this.heuristic(neighbor, to)
        const f = g + h

        const existingNode = openSet.find((n) => n.territory.id === neighbor.id)
        if (!existingNode || g < existingNode.g) {
          openSet.push({
            territory: neighbor,
            g,
            h,
            f,
            parent: current,
          })
        }
      }
    }

    return []
  }

  private reconstructPath(node: PathNode): PathNode[] {
    const path: PathNode[] = []
    let current: PathNode | null = node

    while (current !== null) {
      path.unshift(current)
      current = current.parent
    }

    return path
  }

  private getNeighbors(territory: Territory, territories: Territory[]): Territory[] {
    return territory.neighbors
      .map((neighborId) => territories.find((t) => t.id === neighborId))
      .filter((t): t is Territory => t !== undefined)
  }

  private heuristic(from: Territory, to: Territory): number {
    const dx = to.position.x - from.position.x
    const dy = to.position.y - from.position.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  private getMovementCost(unit: MilitaryUnit, terrain: TerrainType): number {
    const unitDef = UNIT_DEFINITIONS[unit.type]
    const terrainModifier = unitDef.terrain?.[terrain] || 1.0

    return 10 / terrainModifier
  }

  async animateUnitMovement(unitId: string, path: PathNode[]): Promise<void> {
    const sprite = await this.getUnitSprite(unitId)

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i].territory
      const to = path[i + 1].territory

      await this.tweenPosition(sprite, from.position, to.position, 1000)

      this.emitMovementProgress(unitId, to.id, i / path.length)
    }

    this.emitMovementComplete(unitId, path[path.length - 1].territory.id)
  }

  private async getUnitSprite(unitId: string): Promise<PIXI.Sprite> {
    let sprite = this.unitSprites.get(unitId)
    if (!sprite) {
      sprite = new PIXI.Sprite()
      this.unitSprites.set(unitId, sprite)
    }
    return sprite
  }

  private tweenPosition(
    sprite: PIXI.Sprite,
    from: Point,
    to: Point,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const deltaX = to.x - from.x
      const deltaY = to.y - from.y

      const ticker = new PIXI.Ticker()
      ticker.add(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        const eased =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2

        sprite.x = from.x + deltaX * eased
        sprite.y = from.y + deltaY * eased

        if (progress >= 1) {
          ticker.stop()
          ticker.destroy()
          resolve()
        }
      })
      ticker.start()
    })
  }

  renderMovementPath(path: PathNode[], layer: PIXI.Container): PIXI.Graphics {
    const pathGraphics = new PIXI.Graphics()
    pathGraphics.lineStyle(3, 0x00ff00, 0.6)

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i].territory.position
      const to = path[i + 1].territory.position

      this.drawDashedLine(pathGraphics, from, to, 10, 5)
    }

    if (path.length > 0) {
      const last = path[path.length - 1].territory.position
      this.drawArrow(pathGraphics, last)
    }

    layer.addChild(pathGraphics)
    return pathGraphics
  }

  private drawDashedLine(
    graphics: PIXI.Graphics,
    from: Point,
    to: Point,
    dashLength: number,
    gapLength: number
  ) {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const segmentLength = dashLength + gapLength
    const segments = Math.floor(distance / segmentLength)

    const unitX = dx / distance
    const unitY = dy / distance

    for (let i = 0; i < segments; i++) {
      const startX = from.x + unitX * i * segmentLength
      const startY = from.y + unitY * i * segmentLength
      const endX = startX + unitX * dashLength
      const endY = startY + unitY * dashLength

      graphics.moveTo(startX, startY)
      graphics.lineTo(endX, endY)
    }
  }

  private drawArrow(graphics: PIXI.Graphics, position: Point) {
    const arrowSize = 15
    graphics.beginFill(0x00ff00, 0.8)
    graphics.drawPolygon([
      position.x,
      position.y - arrowSize,
      position.x - arrowSize / 2,
      position.y + arrowSize / 2,
      position.x + arrowSize / 2,
      position.y + arrowSize / 2,
    ])
    graphics.endFill()
  }

  private emitMovementProgress(unitId: string, territoryId: string, progress: number) {
    this.eventEmitter.emit('movement:progress', {
      unitId,
      territoryId,
      progress,
    })
  }

  private emitMovementComplete(unitId: string, territoryId: string) {
    this.eventEmitter.emit('movement:complete', {
      unitId,
      territoryId,
    })
  }

  on(event: string, callback: (data: unknown) => void) {
    this.eventEmitter.on(event, callback)
  }

  off(event: string, callback: (data: unknown) => void) {
    this.eventEmitter.off(event, callback)
  }

  destroy() {
    this.movingUnits.clear()
    this.unitSprites.clear()
  }
}

class EventEmitter {
  private events: Map<string, Set<(data: unknown) => void>> = new Map()

  on(event: string, callback: (data: unknown) => void) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback)
  }

  off(event: string, callback: (data: unknown) => void) {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  emit(event: string, data: unknown) {
    const callbacks = this.events.get(event)
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data)
      }
    }
  }
}
