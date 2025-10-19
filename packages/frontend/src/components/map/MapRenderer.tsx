/* Pixi.js strategic map renderer (viewport, zoom, pan, click interactions) */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const React: any = require('react')
import { useGameStore, Territory } from '../../store/gameStore'
import { playSound } from '../../lib/sound'

export function MapRenderer() {
  const canvasRef = React.useRef<HTMLDivElement | null>(null)
  const appRef = React.useRef<any>(null)
  const viewportRef = React.useRef<any>(null)

  React.useEffect(() => {
    let destroyed = false
    let app: any
    let viewport: any

    async function boot() {
      if (!canvasRef.current) return
      try {
        const PIXIModule: any = await import('pixi.js')
        const ViewportModule: any = await import('pixi-viewport')
        const PIXI = PIXIModule
        const { Viewport } = ViewportModule

        app = new PIXI.Application({
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0x1a1a2e,
          antialias: true,
          resolution: (window.devicePixelRatio || 1),
          autoDensity: true,
        })

        if (!canvasRef.current) return
        canvasRef.current.appendChild(app.view as any)
        appRef.current = app

        viewport = new Viewport({
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          worldWidth: 5000,
          worldHeight: 3000,
          interaction: app.renderer.plugins?.interaction,
        })
        app.stage.addChild(viewport)
        viewportRef.current = viewport

        // Enable interactions
        viewport.drag().pinch().wheel().decelerate().clamp({ direction: 'all' })

        // Initialize layers and render
        initializeMapLayers(viewport, PIXI)

        const handleResize = () => {
          app.renderer.resize(window.innerWidth, window.innerHeight)
          viewport.resize(window.innerWidth, window.innerHeight)
        }
        window.addEventListener('resize', handleResize)

        // Cleanup
        const cleanup = () => {
          window.removeEventListener('resize', handleResize)
          try { app.destroy(true, { children: true }) } catch {}
        }

        if (destroyed) cleanup()
        return cleanup
      } catch (e) {
        // If pixi isn't available, fail gracefully and render nothing
        // eslint-disable-next-line no-console
        console.warn('Pixi.js unavailable, MapRenderer running in placeholder mode.', e)
      }
    }

    const disposerPromise = boot()

    return () => {
      destroyed = true
      if (app && typeof app.destroy === 'function') {
        try { app.destroy(true, { children: true }) } catch {}
      }
    }
  }, [])

  return React.createElement('div', { ref: canvasRef, className: 'absolute inset-0' })
}

function initializeMapLayers(viewport: any, PIXI: any) {
  const terrainLayer = new PIXI.Container()
  terrainLayer.name = 'terrain'
  viewport.addChild(terrainLayer)

  const borderLayer = new PIXI.Container()
  borderLayer.name = 'borders'
  viewport.addChild(borderLayer)

  const unitsLayer = new PIXI.Container()
  unitsLayer.name = 'units'
  viewport.addChild(unitsLayer)

  const uiLayer = new PIXI.Container()
  uiLayer.name = 'ui'
  viewport.addChild(uiLayer)

  renderTerrain(terrainLayer, PIXI)
}

function renderTerrain(layer: any, PIXI: any) {
  const territories = generateTerritoriesData()
  territories.forEach((territory) => {
    const graphics = new PIXI.Graphics()
    const color = getTerrainColor(territory.type)
    graphics.beginFill(color, 0.8)
    graphics.drawPolygon(territory.polygon)
    graphics.endFill()
    graphics.lineStyle(2, 0xffffff, 0.3)
    graphics.drawPolygon(territory.polygon)

    graphics.interactive = true
    graphics.buttonMode = true
    graphics.on('pointerdown', () => handleTerritoryClick(territory))
    graphics.on('pointerover', () => { graphics.alpha = 1 })
    graphics.on('pointerout', () => { graphics.alpha = 0.8 })

    layer.addChild(graphics)
  })
}

function generateTerritoriesData(): Territory[] & any[] {
  // Simple demo data: grid-like rectangles with different terrain types
  const types = ['PLAINS', 'MOUNTAINS', 'FOREST', 'DESERT', 'SWAMP', 'TUNDRA', 'COASTAL', 'ISLAND']
  const res: any[] = []
  const cellW = 200
  const cellH = 150
  let id = 1
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 8; x++) {
      const px = 50 + x * (cellW + 8)
      const py = 50 + y * (cellH + 8)
      res.push({
        id: `${id++}`,
        name: `T-${x}-${y}`,
        type: types[(x + y) % types.length],
        polygon: [px, py, px + cellW, py, px + cellW, py + cellH, px, py + cellH],
      })
    }
  }
  return res as any
}

function getTerrainColor(type: string): number {
  const colors: Record<string, number> = {
    PLAINS: 0x7cb342,
    MOUNTAINS: 0x8d6e63,
    FOREST: 0x558b2f,
    DESERT: 0xfdd835,
    SWAMP: 0x4e342e,
    TUNDRA: 0xe1f5fe,
    COASTAL: 0x4fc3f7,
    ISLAND: 0x26c6da,
  }
  return colors[type] || 0x666666
}

function handleTerritoryClick(territory: Territory & any) {
  try {
    const store = require('../../store/gameStore')
    const api = store.getState ? store.getState() : store.useGameStore()
    api.selectTerritory(territory)
  } catch {
    // ignore
  }
  highlightTerritory(territory.id)
  playSound('territory_select')
}

function highlightTerritory(_id: string | number) {
  // In a full implementation, we'd locate the Graphics by id and animate a glow.
  // Here kept as a placeholder to satisfy interaction feedback requirement.
}
