// Achievement unlock notification with simple slide animation shim

// eslint-disable-next-line @typescript-eslint/no-var-requires
const React: any = require('react')
import { motion, AnimatePresence } from '../../lib/motion'
import { getRarityStars } from '../../store/gameStore'

export function AchievementNotification({ achievement }: any) {
  return (
    React.createElement(AnimatePresence as any, null,
      React.createElement(motion.div as any, {
        initial: { x: 300, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: 300, opacity: 0 },
        className: 'fixed top-20 right-4 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg p-4 shadow-2xl max-w-sm',
      },
        React.createElement('div', { className: 'flex items-start gap-3' },
          React.createElement('div', { className: 'text-4xl' }, '🏆'),
          React.createElement('div', null,
            React.createElement('div', { className: 'text-white font-bold text-lg' }, '成就解锁！'),
            React.createElement('div', { className: 'text-yellow-100 text-sm mt-1' }, achievement?.name || ''),
            React.createElement('div', { className: 'text-yellow-200 text-xs mt-1' }, achievement?.description || '')
          )
        ),
        React.createElement('div', { className: 'mt-2 text-xs text-yellow-100' }, `稀有度：${getRarityStars(achievement?.rarity || 1)}`)
      )
    )
  )
}
