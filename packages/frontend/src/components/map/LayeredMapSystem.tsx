import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { useGameStore } from '../../store/gameStore'
import type {
  Battle,
  MilitaryUnit,
  Movement,
  Nation,
  Point,
  Region,
  Territory,
} from '../../types/game'
import { TerrainType, UnitType } from '../../types/game'
import { SpritePool } from '../../utils/SpritePool'
import { boundsIntersect } from '../../utils/culling'
import type { UnitMovementSystem } from './UnitMovementSystem'

type ZoomLevel = 'STRATEGIC' | 'REGIONAL' | 'TACTICAL'

interface LayeredMapSystemOptions {
  movementSystem?: UnitMovementSystem
}

export class LayeredMapSystem {
  private app: PIXI.Application
  private viewport: Viewport
  private layers: Record<'strategic' | 'regional' | 'tactical', PIXI.Container>
  private overlayLayers: PIXI.Container[] = []
  private currentZoomLevel: ZoomLevel = 'STRATEGIC'
  private spritePool: SpritePool
  private cullingTicker: PIXI.Ticker
  private movementSystem?: UnitMovementSystem
  private activeRegionId: string | null = null
  private activeBattleId: string | null = null

  constructor(container: HTMLElement, options: LayeredMapSystemOptions = {}) {
    this.spritePool = new SpritePool(256)
    this.movementSystem = options.movementSystem

    this.app = new PIXI.Application({
      width: container.clientWidth || window.innerWidth,
      height: container.clientHeight || window.innerHeight,
      backgroundColor: 0x0f172a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    container.appendChild(this.app.view as HTMLCanvasElement)

    this.viewport = new Viewport({
      screenWidth: container.clientWidth || window.innerWidth,
      screenHeight: container.clientHeight || window.innerHeight,
      worldWidth: 6000,
      worldHeight: 4000,
      events: this.app.renderer.events,
    })

    this.viewport.drag().pinch().wheel().decelerate().clampZoom({ minScale: 0.2, maxScale: 3.5 })

    this.app.stage.addChild(this.viewport)

    this.layers = {
      strategic: new PIXI.Container(),
      regional: new PIXI.Container(),
      tactical: new PIXI.Container(),
    }

    this.initializeLayers()
    this.setupZoomHandlers()
    this.setupResizeHandler(container)

    this.cullingTicker = new PIXI.Ticker()
    this.cullingTicker.add(() => this.updateVisibleObjects())
    this.cullingTicker.start()
  }

  getViewport(): Viewport {
    return this.viewport
  }

  attachOverlayLayer(layer: PIXI.Container) {
    this.overlayLayers.push(layer)
    this.viewport.addChild(layer)
  }

  setActiveRegion(regionId: string) {
    this.activeRegionId = regionId
    if (this.currentZoomLevel === 'REGIONAL') {
      const region = this.getActiveRegion()
      if (region) {
        this.renderRegionalLayer(region)
      }
    }
  }

  setActiveBattle(battleId: string) {
    this.activeBattleId = battleId
    if (this.currentZoomLevel === 'TACTICAL') {
      const battle = this.getActiveBattle()
      if (battle) {
        this.renderTacticalLayer(battle)
      }
    }
  }

  zoomToBattle(battleId: string, scale: number = 2.5) {
    const battle = this.findBattleById(battleId)
    if (!battle) return

    this.zoomToTerritory(battle.territoryId, scale)
    this.setActiveBattle(battleId)
  }

  zoomToTerritory(territoryId: string, zoomLevel: number = 2) {
    const territory = useGameStore
      .getState()
      .gameState?.territories.find((t) => t.id === territoryId)
    if (!territory) return

    this.viewport.animate({
      position: territory.position,
      scale: zoomLevel,
      time: 650,
      ease: 'easeInOutQuad',
    })
  }

  destroy() {
    this.cullingTicker.stop()
    this.cullingTicker.destroy()

    this.spritePool.clear()
    this.viewport.destroy()
    this.app.destroy(true, { children: true, texture: true, baseTexture: true })
  }

  private initializeLayers() {
    this.layers.strategic.name = 'strategic-layer'
    this.layers.regional.name = 'regional-layer'
    this.layers.regional.visible = false
    this.layers.tactical.name = 'tactical-layer'
    this.layers.tactical.visible = false

    this.viewport.addChild(this.layers.strategic)
    this.viewport.addChild(this.layers.regional)
    this.viewport.addChild(this.layers.tactical)

    this.renderStrategicLayer()
    this.cacheStrategicLayer()
  }

  private renderStrategicLayer() {
    this.layers.strategic.removeChildren()

    const nations = useGameStore.getState().gameState?.nations || []

    for (const nation of nations) {
      const nationGraphics = new PIXI.Graphics()
      nationGraphics.beginFill(nation.color, 0.55)

      for (const territory of nation.territories) {
        if (territory.polygon.length >= 6) {
          nationGraphics.drawPolygon(territory.polygon)
        }
      }

      nationGraphics.endFill()

      nationGraphics.lineStyle(3, 0xffffff, 0.8)
      const boundary = this.getNationBoundary(nation)
      if (boundary.length >= 6) {
        nationGraphics.drawPolygon(boundary)
      }

      this.layers.strategic.addChild(nationGraphics)

      this.addNationFlag(nation, this.layers.strategic)
      this.addCityIcons(nation.territories, this.layers.strategic)
      this.addArmyGroupIcons(nation, this.layers.strategic)
    }

    this.addResourceIcons(this.layers.strategic)
  }

  private renderRegionalLayer(region: Region) {
    this.layers.regional.removeChildren()

    for (const territory of region.territories) {
      const terrainGraphics = this.renderTerrainDetails(territory)
      this.layers.regional.addChild(terrainGraphics)

      this.renderMovementPaths(territory.activeMovements, terrainGraphics)
    }
  }

  renderTacticalLayer(battle: Battle) {
    this.layers.tactical.removeChildren()

    this.renderDetailedTerrain(battle.territory, this.layers.tactical)

    for (const unit of battle.attackerUnits) {
      this.renderDetailedUnit(unit, 'ATTACKER', this.layers.tactical)
    }

    for (const unit of battle.defenderUnits) {
      this.renderDetailedUnit(unit, 'DEFENDER', this.layers.tactical)
    }

    if (battle.status === 'ACTIVE') {
      this.renderBattleEffects(battle, this.layers.tactical)
    }
  }

  private renderDetailedTerrain(territory: Territory, layer: PIXI.Container) {
    const graphics = new PIXI.Graphics()
    const baseColor = this.getTerrainColor(territory.type)

    graphics.beginFill(baseColor, 0.9)
    graphics.drawPolygon(territory.polygon)
    graphics.endFill()

    graphics.lineStyle(2, 0xffffff, 0.35)
    graphics.drawPolygon(territory.polygon)

    const decorationCount = 4
    const icon = this.getTerrainIcon(territory.type)
    for (let i = 0; i < decorationCount; i++) {
      const text = new PIXI.Text(icon, {
        fontSize: 22,
        alpha: 0.75,
      })
      text.x = territory.position.x + (Math.random() - 0.5) * 120
      text.y = territory.position.y + (Math.random() - 0.5) * 120
      graphics.addChild(text)
    }

    layer.addChild(graphics)
  }

  private renderDetailedUnit(
    unit: MilitaryUnit,
    side: 'ATTACKER' | 'DEFENDER',
    layer: PIXI.Container
  ) {
    const container = new PIXI.Container()
    const color = side === 'ATTACKER' ? 0xdc2626 : 0x2563eb

    const background = new PIXI.Graphics()
    background.beginFill(color, 0.85)
    background.drawRoundedRect(-24, -18, 48, 36, 6)
    background.endFill()
    background.lineStyle(2, 0xffffff, 0.8)
    background.drawRoundedRect(-24, -18, 48, 36, 6)

    const icon = this.getUnitIcon(unit.type)
    const iconText = new PIXI.Text(icon, { fontSize: 20 })
    iconText.anchor.set(0.5)

    const strengthText = new PIXI.Text(Math.round(unit.strength).toString(), {
      fontSize: 12,
      fill: 0xffffff,
      fontWeight: 'bold',
    })
    strengthText.anchor.set(0.5)
    strengthText.y = 16

    container.addChild(background)
    container.addChild(iconText)
    container.addChild(strengthText)

    container.x = unit.position.x
    container.y = unit.position.y
    container.alpha = Math.max(0.4, unit.strength / 100)

    layer.addChild(container)
  }

  private renderBattleEffects(battle: Battle, layer: PIXI.Container) {
    const effectLayer = new PIXI.Container()

    for (let i = 0; i < 4; i++) {
      const explosion = new PIXI.Graphics()
      explosion.beginFill(0xff8c00, 0.65)
      explosion.drawCircle(0, 0, 12 + Math.random() * 10)
      explosion.endFill()
      explosion.x = battle.territory.position.x + (Math.random() - 0.5) * 120
      explosion.y = battle.territory.position.y + (Math.random() - 0.5) * 120

      const ticker = new PIXI.Ticker()
      ticker.add(() => {
        explosion.alpha -= 0.02
        explosion.scale.x += 0.02
        explosion.scale.y += 0.02
        if (explosion.alpha <= 0) {
          ticker.stop()
          ticker.destroy()
          effectLayer.removeChild(explosion)
          explosion.destroy()
        }
      })
      ticker.start()
      effectLayer.addChild(explosion)
    }

    layer.addChild(effectLayer)
  }

  private renderMovementPaths(movements: Movement[] | undefined, territoryLayer: PIXI.Container) {
    if (!movements || movements.length === 0 || !this.movementSystem) return

    const pathLayer = new PIXI.Container()
    for (const movement of movements) {
      if (!movement.path || movement.path.length === 0) continue
      this.movementSystem.renderMovementPath(movement.path, pathLayer)
    }
    territoryLayer.addChild(pathLayer)
  }

  private addNationFlag(nation: Nation, layer: PIXI.Container) {
    if (nation.territories.length === 0) return
    const centroid = this.calculateCentroid(nation.territories)
    const text = new PIXI.Text(nation.flag || '🏴', {
      fontSize: 48,
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowDistance: 2,
    })
    text.x = centroid.x - text.width / 2
    text.y = centroid.y - text.height / 2
    layer.addChild(text)
  }

  private addCityIcons(territories: Territory[], layer: PIXI.Container) {
    for (const territory of territories) {
      if (!territory.cities) continue
      for (const city of territory.cities) {
        const icon = new PIXI.Text(city.isCapital ? '⭐' : '🏙️', { fontSize: 20 })
        icon.x = city.position.x - icon.width / 2
        icon.y = city.position.y - icon.height / 2
        layer.addChild(icon)
      }
    }
  }

  private addArmyGroupIcons(nation: Nation, layer: PIXI.Container) {
    const unitsByTerritory = new Map<string, number>()
    for (const unit of nation.units) {
      const count = unitsByTerritory.get(unit.territoryId) ?? 0
      unitsByTerritory.set(unit.territoryId, count + 1)
    }

    for (const [territoryId, count] of unitsByTerritory) {
      const territory = nation.territories.find((t) => t.id === territoryId)
      if (!territory) continue

      const groupContainer = new PIXI.Container()
      groupContainer.x = territory.position.x
      groupContainer.y = territory.position.y

      const circle = new PIXI.Graphics()
      circle.beginFill(0x991b1b, 0.85)
      circle.drawCircle(0, 0, 16)
      circle.endFill()
      circle.lineStyle(2, 0xffffff)
      circle.drawCircle(0, 0, 16)

      const text = new PIXI.Text(count.toString(), {
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: 'bold',
      })
      text.anchor.set(0.5)

      groupContainer.addChild(circle)
      groupContainer.addChild(text)
      layer.addChild(groupContainer)
    }
  }

  private addResourceIcons(layer: PIXI.Container) {
    const territories = useGameStore.getState().gameState?.territories || []
    for (const territory of territories) {
      const iconContainer = new PIXI.Container()
      iconContainer.x = territory.position.x + 24
      iconContainer.y = territory.position.y - 24

      if (territory.resources.oil > 50) {
        const oil = new PIXI.Text('🛢️', { fontSize: 16 })
        oil.x = 0
        oil.y = 0
        iconContainer.addChild(oil)
      }
      if (territory.resources.rare > 30) {
        const rare = new PIXI.Text('💎', { fontSize: 16 })
        rare.x = 20
        rare.y = 0
        iconContainer.addChild(rare)
      }

      if (iconContainer.children.length > 0) {
        layer.addChild(iconContainer)
      }
    }
  }

  private getTerrainColor(terrain: TerrainType): number {
    switch (terrain) {
      case TerrainType.MOUNTAIN:
        return 0x8b7355
      case TerrainType.FOREST:
        return 0x1b5e20
      case TerrainType.DESERT:
        return 0xd39c4c
      case TerrainType.JUNGLE:
        return 0x14532d
      case TerrainType.WATER:
        return 0x2563eb
      case TerrainType.URBAN:
        return 0x4b5563
      case TerrainType.PLAINS:
      default:
        return 0x84cc16
    }
  }

  private getTerrainIcon(terrain: TerrainType): string {
    switch (terrain) {
      case TerrainType.MOUNTAIN:
        return '⛰️'
      case TerrainType.FOREST:
        return '🌲'
      case TerrainType.DESERT:
        return '🏜️'
      case TerrainType.JUNGLE:
        return '🌴'
      case TerrainType.WATER:
        return '🌊'
      case TerrainType.URBAN:
        return '🏢'
      case TerrainType.PLAINS:
      default:
        return '🌾'
    }
  }

  private getUnitIcon(unitType: UnitType): string {
    const map: Record<UnitType, string> = {
      [UnitType.INFANTRY]: '🪖',
      [UnitType.MECHANIZED_INFANTRY]: '🚙',
      [UnitType.TANK]: '🛡️',
      [UnitType.ARTILLERY]: '💣',
      [UnitType.AIRCRAFT]: '✈️',
      [UnitType.RECONNAISSANCE]: '🔭',
      [UnitType.ANTI_AIR]: '🎯',
    }
    return map[unitType] ?? '⚔️'
  }

  private getNationBoundary(nation: Nation): number[] {
    if (nation.territories.length === 0) return []
    const points: Point[] = []
    for (const territory of nation.territories) {
      for (let i = 0; i < territory.polygon.length; i += 2) {
        points.push({ x: territory.polygon[i], y: territory.polygon[i + 1] })
      }
    }
    if (points.length < 3) return []

    const hull = this.convexHull(points)
    const polygon: number[] = []
    for (const point of hull) {
      polygon.push(point.x, point.y)
    }
    return polygon
  }

  private convexHull(points: Point[]): Point[] {
    if (points.length <= 1) return points

    const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
    const lower: Point[] = []
    for (const p of sorted) {
      while (lower.length >= 2 && this.cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop()
      }
      lower.push(p)
    }

    const upper: Point[] = []
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i]
      while (upper.length >= 2 && this.cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop()
      }
      upper.push(p)
    }

    upper.pop()
    lower.pop()
    return lower.concat(upper)
  }

  private cross(o: Point, a: Point, b: Point): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  }

  private calculateCentroid(territories: Territory[]): Point {
    if (territories.length === 0) return { x: 0, y: 0 }
    const sum = territories.reduce(
      (acc, territory) => ({
        x: acc.x + territory.position.x,
        y: acc.y + territory.position.y,
      }),
      { x: 0, y: 0 }
    )
    return {
      x: sum.x / territories.length,
      y: sum.y / territories.length,
    }
  }

  private setupZoomHandlers() {
    this.viewport.on('zoomed', () => {
      const zoomLevel = this.viewport.scale.x
      const newLevel: ZoomLevel = zoomLevel < 0.5 ? 'STRATEGIC' : zoomLevel < 2 ? 'REGIONAL' : 'TACTICAL'
      if (newLevel !== this.currentZoomLevel) {
        this.switchLayer(newLevel)
      }
    })
  }

  private async switchLayer(newLevel: ZoomLevel) {
    const currentLayer = this.layers[this.currentZoomLevel.toLowerCase() as keyof typeof this.layers]
    const targetLayer = this.layers[newLevel.toLowerCase() as keyof typeof this.layers]

    await this.fadeOut(currentLayer)
    currentLayer.visible = false

    targetLayer.visible = true
    await this.fadeIn(targetLayer)

    this.currentZoomLevel = newLevel
    this.loadLayerContent(newLevel)
  }

  private loadLayerContent(level: ZoomLevel) {
    switch (level) {
      case 'STRATEGIC':
        this.renderStrategicLayer()
        this.cacheStrategicLayer(true)
        break
      case 'REGIONAL':
        this.layers.regional.cacheAsBitmap = false
        const region = this.getActiveRegion()
        if (region) {
          this.renderRegionalLayer(region)
        }
        break
      case 'TACTICAL':
        this.layers.tactical.cacheAsBitmap = false
        const battle = this.getActiveBattle()
        if (battle) {
          this.renderTacticalLayer(battle)
        }
        break
    }
  }

  private cacheStrategicLayer(force: boolean = false) {
    if (force) {
      this.layers.strategic.cacheAsBitmap = false
    }
    this.layers.strategic.cacheAsBitmap = true
  }

  private async fadeOut(layer: PIXI.Container) {
    return new Promise<void>((resolve) => {
      const ticker = new PIXI.Ticker()
      ticker.add(() => {
        layer.alpha = Math.max(0, layer.alpha - 0.12)
        if (layer.alpha <= 0) {
          ticker.stop()
          ticker.destroy()
          resolve()
        }
      })
      ticker.start()
    })
  }

  private async fadeIn(layer: PIXI.Container) {
    layer.alpha = 0
    return new Promise<void>((resolve) => {
      const ticker = new PIXI.Ticker()
      ticker.add(() => {
        layer.alpha = Math.min(1, layer.alpha + 0.12)
        if (layer.alpha >= 1) {
          ticker.stop()
          ticker.destroy()
          resolve()
        }
      })
      ticker.start()
    })
  }

  private setupResizeHandler(container: HTMLElement) {
    const resize = () => {
      const width = container.clientWidth || window.innerWidth
      const height = container.clientHeight || window.innerHeight
      this.app.renderer.resize(width, height)
      this.viewport.resize(width, height)
    }

    window.addEventListener('resize', resize)
  }

  private updateVisibleObjects() {
    const bounds = this.viewport.getVisibleBounds()
    this.cullLayer(this.layers.strategic, bounds)
    this.cullLayer(this.layers.regional, bounds)
    this.cullLayer(this.layers.tactical, bounds)
    for (const overlay of this.overlayLayers) {
      this.cullLayer(overlay, bounds)
    }
  }

  private cullLayer(layer: PIXI.Container, viewportBounds: PIXI.Rectangle) {
    if (!layer.visible) return
    for (const child of layer.children) {
      const childBounds = child.getBounds(true)
      child.visible = boundsIntersect(viewportBounds, childBounds)
    }
  }

  private getActiveRegion(): Region | null {
    const state = useGameStore.getState().gameState
    if (!state?.regions || state.regions.length === 0) return null
    if (this.activeRegionId) {
      return state.regions.find((region) => region.id === this.activeRegionId) ?? state.regions[0]
    }
    return state.regions[0]
  }

  private getActiveBattle(): Battle | null {
    if (!this.activeBattleId) return this.findFirstActiveBattle()
    return this.findBattleById(this.activeBattleId) ?? this.findFirstActiveBattle()
  }

  private findBattleById(battleId: string): Battle | null {
    const battles = useGameStore.getState().gameState?.battles || []
    return battles.find((battle) => battle.id === battleId) ?? null
  }

  private findFirstActiveBattle(): Battle | null {
    const battles = useGameStore.getState().gameState?.battles || []
    return battles.find((battle) => battle.status === 'ACTIVE') ?? battles[0] ?? null
  }
}
