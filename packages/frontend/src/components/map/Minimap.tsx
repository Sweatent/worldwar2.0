// Simple minimap rendering onto a canvas

// eslint-disable-next-line @typescript-eslint/no-var-requires
const React: any = require('react')
import { useGameStore } from '../../store/gameStore'
import { playSound } from '../../lib/sound'

export function Minimap() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const { gameState, selectedTerritory } = useGameStore()

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawMinimap(ctx, gameState)
  }, [gameState])

  const handleClick = (e: any) => handleMinimapClick(e, canvasRef.current)

  return React.createElement(
    'div',
    { className: 'fixed bottom-4 right-4 bg-gray-900/90 rounded-lg p-2 backdrop-blur-sm' },
    React.createElement('canvas', {
      ref: canvasRef,
      width: 200,
      height: 150,
      className: 'rounded cursor-pointer',
      onClick: handleClick,
    })
  )
}

function drawMinimap(ctx: CanvasRenderingContext2D, _gameState: any) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  ctx.clearRect(0, 0, w, h)
  // Background ocean
  ctx.fillStyle = '#203040'
  ctx.fillRect(0, 0, w, h)

  // Very rough land patches
  ctx.fillStyle = '#4b7a3c'
  for (let i = 0; i < 5; i++) {
    const x = (i * 37) % (w - 40)
    const y = (i * 23) % (h - 25)
    const rw = 30 + (i * 9) % 60
    const rh = 20 + (i * 7) % 40
    ctx.fillRect(x, y, rw, rh)
  }

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1)
}

function handleMinimapClick(e: any, canvas: HTMLCanvasElement | null) {
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  // Here we would translate minimap click to main viewport center.
  playSound('territory_select')
  // eslint-disable-next-line no-console
  console.log('Minimap click at', x, y)
}
