// Turn tracker with countdown and phase indicator

// eslint-disable-next-line @typescript-eslint/no-var-requires
const React: any = require('react')
import { useGameStore, formatTime } from '../../store/gameStore'
import { motion } from '../../lib/motion'
import { playSound } from '../../lib/sound'

export function TurnTracker() {
  const { gameState, gameSpeed, isPaused } = useGameStore()
  const [timeLeft, setTimeLeft] = React.useState(120)

  React.useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          playSound('turn_end')
          return 120
        }
        return prev - 1
      })
    }, 1000 / (gameSpeed || 1))
    return () => clearInterval(interval)
  }, [gameSpeed, isPaused])

  React.useEffect(() => {
    if (timeLeft === 10) playSound('time_warning')
  }, [timeLeft])

  return (
    React.createElement('div', { className: 'fixed top-4 right-4 bg-gray-900/90 rounded-lg p-4 backdrop-blur-sm min-w-[200px]' },
      React.createElement('div', { className: 'text-center mb-3' },
        React.createElement('div', { className: 'text-gray-400 text-xs' }, '回合'),
        React.createElement('div', { className: 'text-white text-2xl font-bold' }, gameState?.currentTurn || 1),
      ),
      React.createElement('div', { className: 'mb-3' },
        React.createElement(PhaseIndicator as any, { phase: gameState?.phase || 'ECONOMY' })
      ),
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'text-gray-400 text-xs mb-1' }, '剩余时间'),
        React.createElement(motion.div as any, {
          className: `text-3xl font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`,
          animate: timeLeft <= 10 ? { scale: [1, 1.1, 1] } : {},
          transition: { repeat: Infinity, duration: 1 },
        }, formatTime(timeLeft)),
        React.createElement('div', { className: 'mt-2 h-2 bg-gray-700 rounded-full overflow-hidden' },
          React.createElement(motion.div as any, {
            className: `h-full ${timeLeft <= 10 ? 'bg-red-500' : 'bg-blue-500'}`,
            initial: { width: '100%' },
            animate: { width: `${(timeLeft / 120) * 100}%` },
            transition: { duration: 0.3 },
          })
        )
      ),
      React.createElement(GameSpeedControl)
    )
  )
}

function PhaseIndicator({ phase }: any) {
  const phases: any = {
    ECONOMY: { icon: '💰', label: '经济阶段', color: 'text-green-400' },
    DIPLOMACY: { icon: '🤝', label: '外交阶段', color: 'text-blue-400' },
    MILITARY: { icon: '⚔️', label: '军事阶段', color: 'text-red-400' },
    TECH: { icon: '🔬', label: '科技阶段', color: 'text-purple-400' },
    EVENTS: { icon: '📰', label: '事件阶段', color: 'text-yellow-400' },
  }
  const current = phases[phase] || phases.ECONOMY
  return React.createElement(motion.div as any, {
    key: phase,
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    className: `text-center p-2 rounded ${current.color} bg-white/10`,
  }, React.createElement('div', { className: 'text-2xl mb-1' }, current.icon), React.createElement('div', { className: 'text-xs' }, current.label))
}

function GameSpeedControl() {
  const { gameSpeed, setGameSpeed } = useGameStore()
  const { isPaused } = useGameStore()
  const togglePause = () => setGameSpeed(isPaused ? Math.max(1, gameSpeed) : 0.25)

  return React.createElement('div', { className: 'mt-3 flex items-center justify-center gap-2' },
    React.createElement('button', { className: 'px-2 py-1 bg-gray-800 rounded text-white', onClick: () => setGameSpeed(Math.max(0.25, gameSpeed - 0.25)) }, '−'),
    React.createElement('div', { className: 'text-gray-300 text-xs' }, `x${gameSpeed.toFixed(2)}`),
    React.createElement('button', { className: 'px-2 py-1 bg-gray-800 rounded text-white', onClick: () => setGameSpeed(Math.min(5, gameSpeed + 0.25)) }, '+'),
    React.createElement('button', { className: 'px-2 py-1 bg-gray-700 rounded text-white', onClick: togglePause }, '⏯')
  )
}
