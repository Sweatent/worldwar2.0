// Resource dashboard with basic psychology-driven feedback

// eslint-disable-next-line @typescript-eslint/no-var-requires
const React: any = require('react')
import { useGameStore, formatNumber, Resources } from '../../store/gameStore'
import { motion, AnimatePresence } from '../../lib/motion'

export function ResourceDashboard() {
  const { selectedNation } = useGameStore()
  if (!selectedNation) return null as any

  const resources = selectedNation.resources as Resources

  return (
    React.createElement('div', { className: 'fixed top-4 left-4 bg-gray-900/90 rounded-lg p-4 backdrop-blur-sm' },
      React.createElement('h3', { className: 'text-white font-bold mb-2' }, '资源概况'),
      React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
        React.createElement(ResourceItem, { icon: '🌾', label: '食物', value: resources.food, change: calculateChange('food') }),
        React.createElement(ResourceItem, { icon: '🪵', label: '木材', value: resources.wood, change: calculateChange('wood') }),
        React.createElement(ResourceItem, { icon: '⛏️', label: '矿石', value: resources.ore, change: calculateChange('ore') }),
        React.createElement(ResourceItem, { icon: '⚡', label: '能源', value: resources.energy, change: calculateChange('energy') }),
        React.createElement(ResourceItem, { icon: '🛢️', label: '石油', value: resources.oil, change: calculateChange('oil'), isStrategic: true }),
        React.createElement(ResourceItem, { icon: '☢️', label: '铀', value: resources.uranium, change: calculateChange('uranium'), isStrategic: true }),
      ),
      React.createElement(ResourceWarnings, { resources })
    )
  )
}

function ResourceItem({ icon, label, value, change, isStrategic = false }: any) {
  const isIncreasing = change > 0
  return (
    React.createElement(motion.div as any, { className: `p-2 rounded ${isStrategic ? 'bg-yellow-900/30' : 'bg-gray-800'}`, whileHover: { scale: 1.05 } },
      React.createElement('div', { className: 'flex items-center gap-2' },
        React.createElement('span', { className: 'text-2xl' }, icon),
        React.createElement('div', { className: 'flex-1' },
          React.createElement('div', { className: 'text-xs text-gray-400' }, label),
          React.createElement('div', { className: 'flex items-center gap-1' },
            React.createElement('span', { className: 'text-white font-bold' }, formatNumber(value)),
            React.createElement(AnimatePresence as any, null,
              change !== 0 && React.createElement(motion.span as any, {
                initial: { opacity: 0, y: -10 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0 },
                className: `text-xs ${isIncreasing ? 'text-green-400' : 'text-red-400'}`,
              }, `${isIncreasing ? '↑' : '↓'} ${Math.abs(change)}`)
            )
          )
        )
      ),
      isStrategic && React.createElement('div', { className: 'mt-1 h-1 bg-gray-700 rounded-full overflow-hidden' },
        React.createElement(motion.div as any, {
          className: `h-full ${value < 100 ? 'bg-red-500' : 'bg-green-500'}`,
          initial: { width: 0 },
          animate: { width: `${Math.min((value / 500) * 100, 100)}%` },
          transition: { duration: 0.5 },
        })
      )
    )
  )
}

function ResourceWarnings({ resources }: any) {
  const warnings: Array<{ type: 'critical' | 'warning'; message: string }> = []
  if (resources.food < 100) warnings.push({ type: 'critical', message: '⚠️ 食物严重短缺！人口稳定度下降' })
  if (resources.energy < 50) warnings.push({ type: 'warning', message: '⚡ 能源不足，生产效率降低' })
  if (warnings.length === 0) return null as any

  return React.createElement('div', { className: 'mt-3 space-y-1' },
    warnings.map((w, i) => React.createElement(motion.div as any, {
      key: i,
      initial: { x: -20, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      className: `text-xs p-2 rounded ${w.type === 'critical' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`,
    }, w.message))
  )
}

function calculateChange(_key: keyof Resources | string): number {
  // Placeholder: in a real game this would derive from simulation diff
  return 0
}
